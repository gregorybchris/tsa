let initialRender = true
function setupDates(airport_code) {
    let svg = d3.select("#dates-svg")
    if (airport_code === undefined && !initialRender) {
      svg.selectAll("circle")
        .transition()
        .duration(500)
        .style("opacity", 0)
      return
    }
    let width = 0.8 * (+svg.attr("width"))
    let height = 0.8 * (+svg.attr("height"))

    let margin = {
        top: 10,
        right: 0,
        bottom: 40,
        left: 60
    }

    // create a clipping region
    if (initialRender) {
      svg.append("defs").append("clipPath")
          .attr("id", "clip")
          .append("rect")
          .attr("width", width)
          .attr("height", height)
    }

    d3.queue()
      .defer(d3.tsv, "./data/viz/by-airport/" + (airport_code || 'PQI') + ".tsv")
      .await(ready)

    function ready(error, claims) {
        if (error) throw error

        formatDateString = date => new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        formatDateUnix = date => new Date(date).getTime()
        convertDate = date => new Date(date)

        claims = claims.filter(d => d.incident_date)
            .filter(d => d.close_amount)
            .map(d => ({
                id: +d.id,
                closeAmount: +d.close_amount,
                incidentString: formatDateString(d.incident_date),
                incidentDate: convertDate(d.incident_date),
                incidentDateUnix: formatDateUnix(d.incident_date)
            }))

        let xMax = d3.max(claims, d => d.incidentDate)
        xMax = new Date(xMax.getTime() + 50000000000)

        let xMin = d3.min(claims, d => d.incidentDate)
        xMin = new Date(xMin.getTime() - 50000000000)

        let yMax = d3.max(claims, d => d.closeAmount) * 1.1 + 10
        let yMin = d3.min(claims, d => d.closeAmount)
        yMin = yMin - (yMax - yMin) * .1 - 10

        let [scaleLength, majorMax] = xMax > yMax ? [width, xMax] : [height, yMax]

        let xScale = d3.scaleTime()
            .domain([xMin, xMax])
            .range([0, width])

        let yScale = d3.scaleLinear()
            .domain([yMin, yMax])
            .range([height, 0])

        // let formatDay = d3.timeFormat("%a %d")
        // let formatWeek = d3.timeFormat("%b %d")
        // let formatMonth = d3.timeFormat("%B")
        // let formatYear = d3.timeFormat("%Y")

        let formatDay = d3.timeFormat("%m-%d-%y")
        let formatWeek = d3.timeFormat("%m-%d-%y")
        let formatMonth = d3.timeFormat("%m-%y")
        let formatYear = d3.timeFormat("%Y")

        // Define filter conditions
        function tickFormat(date) {
            if (d3.timeMonth(date) < date) {
                if (d3.timeWeek(date) < date)
                    return formatDay(date)
                else
                    return formatWeek(date)
            }
            else {
                if (d3.timeYear(date) < date)
                    return formatMonth(date)
                else
                    return formatYear(date)
            }
        }

        let xAxis = d3.axisBottom(xScale)
            .ticks(5 * width / height, "s")
            .tickSize(-height)
            .tickFormat(tickFormat)

        let yAxis = d3.axisLeft(yScale)
            .ticks(5, "s")
            .tickSize(-width);

        let gX, gY


        if (initialRender) {
          gX = svg.append("g")
              .attr("transform", "translate(" + margin.left + "," + (margin.top + height) + ")")
              .attr("class", "x")
              .call(xAxis)

          gY = svg.append("g")
              .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
              .attr("class", "y")
              .call(yAxis)
        } else {
          gX = svg.select(".x")
            gX.transition()
             .duration(500)
             .call(xAxis)
          gY = svg.select(".y")
            gY.transition(t)
             .duration(500)
             .call(yAxis)
        }

        if (initialRender) {
          svg.append("text")
              .attr("transform", "rotate(-90)")
              .attr("y", 0)
              .attr("x", 0 - (height / 2))
              .attr("dy", "10px")
              .attr("class", "scatter-label")
              .style("text-anchor", "middle")
              .text("Close Amount")

          svg.append("text")
              .attr("transform", "translate(" + (width / 2 + 50) + ", " + (height + margin.top + 30) + ")")
              .style("text-anchor", "middle")
              .text("Incident Date")
          }

        let circlesGroup

        if (initialRender) {
          let circlesGroup = svg.append("g")
              .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
              .attr("clip-path", "url(#clip)")
              .classed("circles-group", true)

          for (let i = 0; i < 6148; i++) {
            circlesGroup.append('circle')
              .attr("cx", 0)
              .attr("cy", 0)
              .attr("r", 3.4)
              .style("fill", "transparent")
              .style("stroke", "rgba(108, 34, 125, 0.7)")
              .style("opacity", 0)
              .style("stroke-width", 1.8)
          }
        } else {
          circlesGroup = svg.select(".circles-group")
          let points = circlesGroup.selectAll("circle")
                  .transition()
                  .duration(1000)
                  .attr("cx", (_, i) => claims[i] && xScale(claims[i].incidentDate))
                  .attr("cy", (_, i) => claims[i] && yScale(claims[i].closeAmount))
                  .attr("r", 3.4)
                  .style("fill", "transparent")
                  .style("stroke", "rgba(108, 34, 125, 0.7)")
                  .style("stroke-width", 1.8)
                  .style('opacity', (_, i) => claims[i] ? 1 : 0)

          let zoom = d3.zoom()
              // .scaleExtent([.5, 20])
              .extent([[0, 0], [width, height]])
              .on("zoom", zoomed)

          svg.append("rect")
              .attr("width", width)
              .attr("height", height)
              .style("fill", "none")
              .style("pointer-events", "all")
              .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
              .call(zoom)

          function zoomed() {
              let newXScale = d3.event.transform.rescaleX(xScale)
              let newYScale = d3.event.transform.rescaleY(yScale)
              gX.call(xAxis.scale(newXScale))
              gY.call(yAxis.scale(newYScale))
              circlesGroup.selectAll("circle")
                  .attr("cx", (_, i) => claims[i] && newXScale(claims[i].incidentDate))
                  .attr("cy", (_, i) => claims[i] && newYScale(claims[i].closeAmount))
          }
        }
      initialRender = false
    }
}
