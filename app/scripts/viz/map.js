function setupMap() {
    let svg = d3.select("#map-svg")

    let width = +svg.attr("width")
    let height = +svg.attr("height")

    let projection = d3.geoAlbersUsa()
        .scale(700)
        .translate([width / 2, height / 2])

    let path = d3.geoPath()
        .projection(projection)
        .pointRadius(1)

    let tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")

    let airportSelected = false

    d3.queue()
        .defer(d3.json, 'data/lib/us.json')
        .defer(d3.tsv, 'data/viz/airports.tsv')
        .defer(d3.tsv, 'data/lib/us-state-names.tsv')
        .await(ready)

    const projectAirport = airport => projection([+airport.lat, +airport.lng])

    const getSortFunction = (sortBy) => {
        switch (sortBy) {
            case 'passenger_throughput':
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
        if (error) throw error

        let data = topojson.feature(us, us.objects.states).features.filter(d => !isNaN(path.centroid(d)[0]))

        // create map from state ID -> state name
        let stateNames = {}
        state_names.forEach(d => stateNames[d.id] = d.name)

        // draw states
        let states = svg.append("g")
            .attr("class", "states")
            .selectAll("path")
                .data(topojson.feature(us, us.objects.states).features)
            .enter().append("path")
                .style("fill", "rgb(200, 200, 200)")
                .style("fill-opacity", 0.4)
                .style("stroke", "rgb(160, 160, 160)")
                .style("stroke-opacity", 0.8)
                .style("stroke-width", .2)
                .attr("d", path)
                .on("mouseover", function(d) {
                  console.log("State Name: ", stateNames[d.id])
                  console.log(this, d3.select(this))
                })

        svg.on('click', () => {
          if (airportSelected) {
            airportSelected = false
            changeAirport(undefined)
            svg.classed('clickable-state', false)
            d3.selectAll(".map-airport-indicator")
              .attr("selected", false)
              .transition()
              .duration(300)
              .attr("opacity", 0.5)
          }
        })

        // draw airports
        svg.selectAll("circle")
            .data(airports.filter(projectAirport)).enter()
            .append("circle")
            .attr("cx", d => projectAirport(d)[0])
            .attr("cy", d => projectAirport(d)[1])
            .attr("class", "map-airport-indicator")
            .attr("selected", false)
            .attr("r", d => {
                return 3
            })
        	.attr("fill", "rgb(108, 34, 125)")
            .attr("opacity", 0.5)
            .on('mouseover', function(d) {
                let text = "<span class='tooltip-text'>" + d.Airport + "</span>"
                tooltip.style("left", d3.event.pageX + 10 + "px")
                    .style("top", d3.event.pageY - 10 + "px")
                    .style("display", "inline-block")
                    .html(text)
            })
            .on('mouseout', function(d) {
                tooltip.style("display", "none")
            })
            .on('click', function(d) {
                d3.event.stopPropagation()
                const circle = d3.select(this)
                const wasSelected = circle.attr("selected") !== 'false'
                if (wasSelected) {
                  airportSelected = false
                  changeAirport(undefined)
                  d3.selectAll(".map-airport-indicator")
                    .transition()
                    .duration(300)
                    .attr("opacity", 0.5)
                } else {
                  airportSelected = true
                  changeAirport(d)
                  d3.selectAll(".map-airport-indicator")
                    .transition()
                    .duration(300)
                    .attr('opacity', other => {
                      if (other.Airport === d.Airport) {
                        return 0.75
                      } else {
                        return 0.25
                      }
                    })
                }
                svg.classed('clickable-state', airportSelected)
                d3.selectAll(".map-airport-indicator")
                  .attr('selected', other => {
                    if (other.Airport === d.Airport) {
                      return !wasSelected
                    } else {
                      return false
                    }
                  })
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
                    return color(getValue(d))
                })

            svg.selectAll("circle")
                .sort(getSortFunction(sortBy))
        }

        function changeView(button) {
            [
                d3.select("#map-total-claims-button"),
                d3.select("#map-per-passenger-button"),
                d3.select("#map-median-claim-button"),
                d3.select("#map-median-close-button")
            ].forEach(function(button) {
                button.classed("selected", false)
            })

            button.classed("selected", true)
        }

        function filterAirports(searchTerm) {
            svg.selectAll("circle")
                .attr('display', d => {
                  if (!searchTerm) {
                    return null
                  } else if (d.Airport.toLowerCase().includes(searchTerm.toLowerCase())) {
                    return null
                  } else if (d.airport_code.toLowerCase().includes(searchTerm.toLowerCase())) {
                    return null
                  } else {
                    return 'none'
                  }
                })
        }

        //changeCircleSize('claim_count', d => d.count / 50)
        //changeView(d3.select("#map-total-claims-button"))

        d3.select("#map-per-passenger-button").on('click', () => {
            changeCircleSize('passenger_throughput', d => {
                const total = (+d.international_passengers) + (+d.domestic_passengers)
                if (total === 0)
                    return 0
                return d.count / total * 200000
            })
            changeView(d3.select("#map-per-passenger-button"))
        })

        d3.select("#map-total-claims-button").on('click', () => {
            changeCircleSize('claim_count', d => d.count / 50)
            changeView(d3.select("#map-total-claims-button"))
        })

        d3.select("#map-median-claim-button").on('click', () => {
            changeCircleSize('median_claim_amount', d => {
                if (d.med_claim < 0)
                  return 0
                return d.med_claim / 15
            })
            changeView(d3.select("#map-median-claim-button"))
        })

        d3.select("#map-median-close-button").on('click', () => {
            changeCircleSize('median_close_amount', d => {
                if (d.med_close < 0)
                    return 0
                return d.med_close / 10
            })
            changeView(d3.select("#map-median-close-button"))
        })

      d3.select("#search-airport").on('input', function() {
        filterAirports(this.value)
      })
    }
}
