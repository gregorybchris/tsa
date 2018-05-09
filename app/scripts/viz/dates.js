function resetStats() {
  t = d3.transition().duration(400)
  d3.select("#claim-date-received-text")
    .transition(t)
    .style('opacity', 0)
    .on('end', function(d) { d3.select(this).html('') })
  d3.select("#claim-incident-date-text")
    .transition(t)
    .style('opacity', 0)
    .on('end', function(d) { d3.select(this).html('') })
  d3.select("#claim-airline-text")
    .transition(t)
    .style('opacity', 0)
    .on('end', function(d) { d3.select(this).html('') })
  d3.select("#claim-items-text")
    .transition(t)
    .style('opacity', 0)
    .on('end', function(d) { d3.select(this).html('') })

  d3.select("#claim-site-text")
    .transition(t)
    .style('opacity', 0)
    .on('end', function(d) { d3.select(this).html('') })
  d3.select("#claim-amount-text")
    .transition(t)
    .style('opacity', 0)
    .on('end', function(d) { d3.select(this).html('') })
  d3.select("#claim-close-amount-text")
    .transition(t)
    .style('opacity', 0)
    .on('end', function(d) { d3.select(this).html('') })
  d3.select("#claim-disposition-text")
    .transition(t)
    .style('opacity', 0)
    .on('end', function(d) { d3.select(this).html('') })
}

let initialRender = true
function setupDates(airport_code) {
    let svg = d3.select("#dates-svg")
    svg.selectAll("circle")
      .remove()
    if (airport_code === undefined && !initialRender) {
        d3.select("#claim-section")
          .transition()
          .duration(500)
          .style('opacity', 0)
        d3.select("#dates-section")
          .transition()
          .duration(500)
          .style('opacity', 0)
        resetStats()
      return
  } else if (!initialRender) {
      d3.select("#claim-empty-message")
        .html('Select a claim from the scatter plot')
        .style('opacity', 1)
      d3.select("#claim-section")
        .transition()
        .duration(500)
        .style('opacity', 1)
      d3.select("#dates-section")
        .transition()
        .duration(500)
        .style('opacity', 1)
      resetStats()

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

        // id,claim_number,date_received,incident_date,
        // airport_code,airport_name,airline,claim_type,
        // claim_site,claim_amount,status,close_amount,disposition

        claims = claims.filter(d => d.incident_date)
            .filter(d => d.close_amount)
            .map(d => ({
                id: +d.id,
                claimNumber: +d.claim_number,
                airportCode: d.airport_code,
                airportName: d.airport_name,
                airline: d.airline || 'Unknown',
                claimType: d.claim_type,
                claimNumber: d.claim_number,
                legitClaimAmount: d.claim_amount !== '',
                claimAmount: +d.claim_amount,
                closeAmount: +d.close_amount,
                claimSite: d.claim_site,
                dateReceivedString: formatDateString(d.date_received),
                incidentDateString: formatDateString(d.incident_date),
                incidentDate: convertDate(d.incident_date),
                incidentDateUnix: formatDateUnix(d.incident_date),
                disposition: d.disposition || 'Unknown',
                newItems: d.items_new.split(","),
                oldItems: d.items_old.split("*")
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
            .ticks(3, "s")
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

            svg.append("rect")
                .classed("zoomable-rect", true)
                .on("click", function(d, i) {
                    d3.select(this).classed("clickable", false)
                    resetStats()
                    d3.select("#claim-empty-message")
                        .html('Select a claim from the scatter plot')
                        .style('opacity', 1)
                      svg.selectAll('circle')

                          .style("fill", "transparent")
                          .classed("clickable", true  )
                })
                .attr("width", width)
                .attr("height", height)
                .style("fill", "none")
                .style("pointer-events", "all")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")")


          let circlesGroup = svg.append("g")
              .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
              .attr("clip-path", "url(#clip)")
              .classed("circles-group", true)

        } else {
          function zoomed() {
            var t = d3.event.transform;
            svg.select(".zoomable-rect").node().__zoom = t
            circlesGroup.node().__zoom = t

            let newXScale = d3.event.transform.rescaleX(xScale)
            let newYScale = d3.event.transform.rescaleY(yScale)
            gX.call(xAxis.scale(newXScale))
            gY.call(yAxis.scale(newYScale))
            circlesGroup.selectAll("circle")
                .attr("cx", d => newXScale(d.incidentDate))
                .attr("cy", d => newYScale(d.closeAmount))
          }

          let zoom = d3.zoom()
              // .scaleExtent([.5, 20])
              //.extent([[0, 0], [width, height]])
              .on("zoom", zoomed);


          circlesGroup = svg.select(".circles-group")

          svg.select(".zoomable-rect").call(zoom)
          circlesGroup.call(zoom)

          let points = circlesGroup.selectAll("circle")
                    .data(claims)
                    .enter()
                    .append('circle')
                  .on("click", function(d, i) {
                      updateClaimFields(d)
                      d3.select("#claim-empty-message").style('opacity', 0)
                      d3.select(".zoomable-rect").classed('clickable', true)

                      svg.selectAll('circle')
                          .style("fill", (d2, i2) => {
                              return d.id === d2.id ? "rgba(108, 34, 125, 0.5)" : "transparent"
                          })
                          .classed("clickable", (d2) => d.id !== d2.id)
                  })
                  .classed("clickable", true)
                  .attr("cx", () => (Math.random() - 0.5) * 10000)
                  .attr("cy", () => (Math.random() - 0.5) * 10000)
                  .transition()
                  .duration(1000)
                  .attr("cx", d => xScale(d.incidentDate))
                  .attr("cy", d => yScale(d.closeAmount))
                  .attr("r", 3.4)
                  .style("fill", "transparent")
                  .style("stroke", "rgba(108, 34, 125, 0.5)")
                  .style("stroke-width", 1.8)

        }

        function filterItems(items) {
            html = '<ul>'
            items.filter(function(item, i, self) {
                return i === self.indexOf(item);
            }).forEach(item => html += '<li>' + item + '</li>')
            html += '</ul>'
            return html
        }

        function updateClaimFields(d) {

          t = d3.transition().duration(400)

            d3.select("#claim-date-received-text")
              .style('opacity', 0)
              .html(d.dateReceivedString)
              .transition(t)
              .style('opacity', 1)
            d3.select("#claim-incident-date-text")
              .style('opacity', 0)
              .html(d.incidentDateString)
              .transition(t)
              .style('opacity', 1)
            d3.select("#claim-airline-text")
              .style('opacity', 0)
              .html(d.airline)
              .transition(t)
              .style('opacity', 1)
            d3.select("#claim-items-text")
              .style('opacity', 0)
              .html(filterItems(d.oldItems))
              .transition(t)
              .style('opacity', 1)

            d3.select("#claim-site-text")
              .style('opacity', 0)
              .html(d.claimSite)
              .transition(t)
              .style('opacity', 1)
            d3.select("#claim-amount-text")
              .style('opacity', 0)
              .html(d.legitClaimAmount ? `$${d.claimAmount}` : 'Unknown')
              .transition(t)
              .style('opacity', 1)
            d3.select("#claim-close-amount-text")
              .style('opacity', 0)
              .html(`$${d.closeAmount}`)
              .transition(t)
              .style('opacity', 1)
            d3.select("#claim-disposition-text")
              .style('opacity', 0)
              .html(d.disposition)
              .transition(t)
              .style('opacity', 1)
        }
      initialRender = false
    }
}
