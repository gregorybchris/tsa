function setupMap() {
  var svg = d3.select("#map"),
      width = +svg.attr("width"),
      height = +svg.attr("height");

  var projection = d3.geoAlbersUsa()
      .scale(1280)
      .translate([width / 2, height / 2]);

  var path = d3.geoPath()
      .projection(projection)
      .pointRadius(1);

/*
  var color = d3.scaleLinear()
          .range(['white','black']);
*/

  d3.queue()
    .defer(d3.json, 'data/lib/us.json')
    .defer(d3.tsv, 'data/viz/airports.tsv')
    .defer(d3.tsv, 'data/lib/us-state-names.tsv')
    .await(ready)

  const projectAirport = airport => projection([+airport.lat, +airport.lng])

  const getSortFunction = (sortBy) => {
    switch (sortBy) {
      case 'passenger_throughout':
        return (a, b) => {
          a_value = (+a.international_passengers) + (+a.domestic_passengers)
          b_value = (+b.international_passengers) + (+b.domestic_passengers)
          return a_value - b_value
        }
      case 'claim_count':
        return (a, b) => b.count - a.count
      case 'median_claim_amount':
        return (a, b) => b.med_claim - a.med_claim
      case 'median_close_amount':
        return (a, b) => b.med_close - a.med_close
      default:
        console.error('invalid sortBy parameter')
    }
  }

  function ready(error, us, airports, state_names) {
    if (error) throw error;

    var data = topojson.feature(us, us.objects.states).features.filter(d => !isNaN(path.centroid(d)[0]))

    // create map from state ID to state names
    var names = {};
    state_names.forEach(d => names[d.id] = d.name)

    // draw states
    svg.append("g")
      .attr("class", "states")
      .selectAll("path")
        .data(topojson.feature(us, us.objects.states).features)
      .enter().append("path")
        .style("fill", '#ddd')
        .style("stroke", "black")
        .style("stroke-width", 0.2)
        .attr("d", path)
        .on("mouseover", d => console.log(names[d.id]))

    // draw airports
    svg.selectAll("circle")
  		.data(airports.filter(projectAirport)).enter()
  		.append("circle")
  		.attr("cx", d => projectAirport(d)[0])
  		.attr("cy", d => projectAirport(d)[1])
      .attr("selected", false)
  		.attr("r", d => {
        return 4
      })
  		.attr("fill", "teal")
      .attr("opacity", 0.6)
      .attr("stroke", "white")
      .attr("stroke-width", d => Math.max(Math.sqrt(d.count) / 70, 1))
      .on('mouseover', function(d) {
        document.body.style.cursor = 'pointer'
        //d3.select(this).attr("fill", "red")
      })
      .on('mouseout', function(d) {
        document.body.style.cursor = 'default'
        //d3.select(this).attr("fill", "teal")
      })
      .on('click', function(d) {
        const circle = d3.select(this)
        const selected = circle.attr("selected") === 'true'
        const toColor = selected ? 'teal' : 'red'
        circle.attr('selected', !selected)
        circle.attr('fill', toColor)
      })

    function changeCircleSize(sortBy, getValue) {
      svg.selectAll("circle")
        .transition()
        .duration(1000)
        .attr('r', d => Math.max(Math.sqrt(getValue(d)), 2))

      svg.selectAll("circle")
        .sort(getSortFunction(sortBy))

    }

    function changeCircleFill(sortBy, getValue) {
      color.domain([
        d3.min(airports, d => getValue(d)),
        d3.max(airports, d => getValue(d)),
      ])
      svg.selectAll("circle")
        .transition()
        .duration(1000)
        .attr('fill', d => {
          console.log(getValue(d))
          console.log(color(0.5))
          return color(getValue(d))
        })

      svg.selectAll("circle")
        .sort(getSortFunction(sortBy))
    }

    d3.select("#btnClaimsPerPassenger").on('click', () => {
      changeCircleSize('passenger_throughout', d => {
        const total = (+d.international_passengers) + (+d.domestic_passengers)
        if (total === 0) {
          return 0
        }
        return d.count / total * 250000
      })
    })

    d3.select("#btnTotalClaims").on('click', () => {
      changeCircleSize('claim_count', d => d.count / 20)
    })

    d3.select("#btnMedianClaimAmount").on('click', () => {
      changeCircleSize('median_claim_amount', d => {
        if (d.med_claim < 0) {
          return 0
        }
        return d.med_claim / 10
      })
    })

    d3.select("#btnMedianCloseAmount").on('click', () => {
      changeCircleSize('median_close_amount', d => {
        if (d.med_close < 0) {
          return 0
        }
        return d.med_close / 5
      })
    })
  }
}
