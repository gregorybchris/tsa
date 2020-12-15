airports_by_code = {}
isFiltering = false
totals_for_all_airports = []
stats_for_all_airports = {
  med_claim: '$211.35',
  med_close: '$80.00',
  count: 126767,
  count_per_million_passengers: 77,
}
showingAllAirports = true
function changeAirport(airport_data) {
  d3.select("#items-svg").classed('clickable', false)
  isFiltering = false
    d3.select("#items-svg").selectAll(".bar")
      .classed("clickable", !!airport_data)
  d3.select("#dates-svg")
    .selectAll('circle')
    .transition()
    .duration(300)
    .style('opacity', 1)

  airport_code = airport_data && airport_data.airport_code
  showingAllAirports = airport_code === undefined
  let items
  if (airport_code === undefined) {
    items = totals_for_all_airports
    d3.select('#airport-title').text('All Airports')
    d3.select('#claim-count').text(stats_for_all_airports.count.toLocaleString())
    d3.select('#median-close-amount').text(stats_for_all_airports.med_close)
    d3.select('#median-claim-amount').text(stats_for_all_airports.med_claim)
    d3.select('#claims-per-passenger').text(stats_for_all_airports.count_per_million_passengers)
  } else {
    d3.select('#airport-title').text(`${airport_data.Airport} (${airport_data.airport_code})`)

    const claim_count = +airport_data.count
    d3.select('#claim-count').text(claim_count.toLocaleString())

    const med_claim_amount = +airport_data.med_claim
    if (med_claim_amount === -1) {
      d3.select('#median-claim-amount').text('Unknown')
    } else {
      d3.select('#median-claim-amount').text(`$${med_claim_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}`)
    }

    const med_close_amount = +airport_data.med_close
    if (med_close_amount === -1) {
      d3.select('#median-close-amount').text('Unknown')
    } else {
      d3.select('#median-close-amount').text(`$${med_close_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}`)
    }

    const passengers = +airport_data.domestic_passengers + +airport_data.international_passengers
    if (!passengers) {
      d3.select('#claims-per-passenger').text('Unknown')
    } else {
      d3.select('#claims-per-passenger').text(`${Math.round(claim_count/passengers*1000000).toLocaleString()}`)
    }

    items = Object.keys(airports_by_code[airport_code])
    .filter(key => key !== 'Airport')
    .map(key => ({
      category: key,
      count: airports_by_code[airport_code][key]
    }))
  }

  /*
							<p id="airport-title">Hello</p>
							<div class="airport-stats">
								<p id="claim-count">Hello</p>
								<p id="median-claim-amount">Hello</p>
								<p id="median-close-amount">Hello</p>
								<p id="claims-per-pasenger">Hello</p>
							</div>
						</div>
            */
  let svg = d3.select("#items-svg")
  let margin = {top: 10, right: 20, bottom: 30, left: 160}
  let width = +svg.attr("width") - margin.left - margin.right
  let height = +svg.attr("height") - margin.top - margin.bottom

  let tooltip = d3.select("body").append("div").attr("class", "tooltip")

  let x = d3.scaleLinear().range([0, width])
  let y = d3.scaleBand().range([height, 0])

  t = d3.transition().duration(1000)

  x.domain([0, d3.max(items, function(d) { return d.count })])

  svg.select(".x")
    .transition(t)
    .call(d3.axisBottom(x).ticks(5).tickFormat(function(d) { return d }).tickSizeInner([-height]))

  svg.selectAll(".bar")
    .data(items)
    .transition(t)
    .style("opacity", 1)
    .attr("width", d => x(d.count))
}

function setupItems() {


    let svg = d3.select("#items-svg")
    let margin = {top: 10, right: 20, bottom: 30, left: 160}
    let width = +svg.attr("width") - margin.left - margin.right
    let height = +svg.attr("height") - margin.top - margin.bottom

    let tooltip = d3.select("body").append("div").attr("class", "tooltip")

    let x = d3.scaleLinear().range([0, width])
    let y = d3.scaleBand().range([height, 0])

    let g = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

    d3.queue()
        .defer(d3.csv, 'data/viz/items_by_airport.csv')
        .await(ready)

    function ready(error, airports) {
        if (error) throw error

        svg
          .on('click', function() {
            svg.classed('clickable', false)
            isFiltering = false
              g.selectAll(".bar")
                .transition()
                .duration(300)
                .style('opacity', 1)
            d3.select("#dates-svg")
              .selectAll('circle')
              .transition()
              .duration(300)
              .style('opacity', 1)
          })

        airports.forEach(function(d) {
          Object.keys(d).forEach(key => {
            if (key != 'Airport') {
              d[key] = +d[key]
            }
          })
          airports_by_code[d.Airport] = d
        })

        totals_for_all_airports = airports.reduce((acc, airport) => {
          acc.forEach(category => {
            category.count += airport[category.category]
          })
          return acc
        }, Object.keys(airports[0]).filter(key => key !== 'Airport').map(category => ({
          category,
          count: 0,
        })))

        items = totals_for_all_airports
        d3.select('#airport-title').text('All Airports')
        d3.select('#claim-count').text(stats_for_all_airports.count.toLocaleString())
        d3.select('#median-close-amount').text(stats_for_all_airports.med_close)
        d3.select('#median-claim-amount').text(stats_for_all_airports.med_claim)
        d3.select('#claims-per-passenger').text(stats_for_all_airports.count_per_million_passengers)

        x.domain([0, d3.max(items, function(d) { return d.count })])
        y.domain(items.map(function(d) { return d.category })).padding(0.1)

        g.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x).ticks(5).tickFormat(function(d) { return parseInt(d) }).tickSizeInner([-height]))

        g.append("g")
            .attr("class", "y axis")
            .call(d3.axisLeft(y))

        g.selectAll(".bar")
            .data(items)
          .enter().append("rect")
            .attr("class", "bar")
            .attr("x", 0)
            .attr("height", y.bandwidth())
            .attr("y", function(d) { return y(d.category) })
            .attr("width", d => x(d.count))
            .on('click', function(d) {
              if (showingAllAirports) {
                return
              }
              const fullOpacity = +(d3.select(this).style('opacity'))
              const shouldStopFiltering = isFiltering && fullOpacity === 1

              d3.select("#dates-svg")
                .selectAll('circle')
                .classed("clickable", function(d2) {
                  if (shouldStopFiltering) {
                    return true
                  }
                  return d2.newItems.find(s => s === d.category) ? true : false
                })
                .transition()
                .duration(300)
                .style('opacity', function(d2) {
                  if (shouldStopFiltering) {
                    return 1
                  }
                  return d2.newItems.find(s => s === d.category) ? 1 : 0
                })
                .style("pointer-events", function(d2) {
                  if (shouldStopFiltering) {
                    return null
                  }
                  return d2.newItems.find(s => s === d.category) ? null : 'none'
                })

              svg.classed('clickable', !shouldStopFiltering)
              g.selectAll(".bar")
                .transition()
                .duration(300)
                .style('opacity', function (other) {
                  if (shouldStopFiltering) {
                    return 1
                  }
                  return d.category === other.category ? 1 : 0.5
                })
              isFiltering = !shouldStopFiltering
              d3.event.stopPropagation()
            })
/*
            .on("mousemove", function(d) {
                let text = "<span class='tooltip-text'>" +
                    d.category + "<br>" + d.count + "</span>"
                tooltip.style("left", d3.event.pageX - 50 + "px")
                    .style("top", d3.event.pageY - 55 + "px")
                    .style("display", "inline-block")
                    .html(text)
            })
            .on("mouseout", function(d) {
                tooltip.style("display", "none")
            })
*/
    }
}
