function setupMap() {
    let svg = d3.select("#map-svg")
    let width = +svg.attr("width")
    let height = +svg.attr("height")

    let projection = d3.geoAlbersUsa()
        .scale(1000)
        .translate([width / 2, height / 2])

    let path = d3.geoPath()
        .projection(projection)
        .pointRadius(1)

    let tooltip = d3.select("body").append("div").attr("class", "tooltip")

    d3.queue()
        .defer(d3.json, 'data/lib/us.json')
        .defer(d3.tsv, 'data/viz/airports.tsv')
        .defer(d3.tsv, 'data/lib/us-state-names.tsv')
        .await(ready)

    // These act as CSS selectors too
    // const indicatorTypes = {
    //     "per-passenger",
    //     "total-claims",
    //     "median-claim",
    //     "median-close"
    // }

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
                .on("mouseover", d => {
                    // console.log("State Name: ", stateNames[d.id])
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
                return 4
            })
        	.attr("fill", "rgb(108, 34, 125)")
            .attr("opacity", 0.5)
            .on('mouseover', function(d) {
                d3.select(this).attr("fill", "rgb(255, 140, 26)")
                let text = "<span class='tooltip-text'>" + d.Airport + "</span>"
                tooltip.style("left", d3.event.pageX + 10 + "px")
                    .style("top", d3.event.pageY - 10 + "px")
                    .style("display", "inline-block")
                    .html(text)
            })
            .on('mouseout', function(d) {
                d3.select(this).attr("fill", "rgb(108, 34, 125)")
                tooltip.style("display", "none")
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
                .attr('r', d => Math.max(Math.sqrt(getValue(d)), 2.5))

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

        changeCircleSize('claim_count', d => d.count / 20)
        changeView(d3.select("#map-total-claims-button"))

        d3.select("#map-per-passenger-button").on('click', () => {
            changeCircleSize('passenger_throughput', d => {
                const total = (+d.international_passengers) + (+d.domestic_passengers)
                if (total === 0)
                    return 0
                return d.count / total * 250000
            })
            changeView(d3.select("#map-per-passenger-button"))
        })

        d3.select("#map-total-claims-button").on('click', () => {
            changeCircleSize('claim_count', d => d.count / 20)
            changeView(d3.select("#map-total-claims-button"))
        })

        d3.select("#map-median-claim-button").on('click', () => {
            changeCircleSize('median_claim_amount', d => {
                if (d.med_claim < 0)
                  return 0
                return d.med_claim / 10
            })
            changeView(d3.select("#map-median-claim-button"))
        })

        d3.select("#map-median-close-button").on('click', () => {
            changeCircleSize('median_close_amount', d => {
                if (d.med_close < 0)
                    return 0
                return d.med_close / 5
            })
            changeView(d3.select("#map-median-close-button"))
        })
    }
}
