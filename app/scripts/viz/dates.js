function setupDates() {
    let svg = d3.select("#dates-svg")
    let width = 0.8 * (+svg.attr("width"))
    let height = 0.8 * (+svg.attr("height"))

    let margin = {
        top: 10,
        right: 0,
        bottom: 40,
        left: 60
    }

    // create a clipping region
    svg.append("defs").append("clipPath")
        .attr("id", "clip")
      .append("rect")
        .attr("width", width)
        .attr("height", height)

    d3.queue()
      .defer(d3.tsv, "./data/viz/by-airport/BOS.tsv")
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
        let xMin = d3.min(claims, d => d.incidentDate)
        let yMax = d3.max(claims, d => d.closeAmount)
        let yMin = d3.min(claims, d => d.closeAmount)
        let [scaleLength, majorMax] = xMax > yMax ? [width, xMax] : [height, yMax]

        let xScale = d3.scaleTime()
            .domain([xMin, xMax])
            .range([0, width])

        let yScale = d3.scaleLinear()
            .domain([yMin, yMax])
            .range([height, 0])

        var formatDay = d3.timeFormat("%a %d"),
            formatWeek = d3.timeFormat("%b %d"),
            formatMonth = d3.timeFormat("%B"),
            formatYear = d3.timeFormat("%Y");

        // Define filter conditions
        function tickFormat(date) {
          return (d3.timeMonth(date) < date ? (d3.timeWeek(date) < date ? formatDay : formatWeek)
            : d3.timeYear(date) < date ? formatMonth
            : formatYear)(date);
        }

        let xAxis = d3.axisBottom(xScale)
            .ticks(5, "s")
            .tickSize(-width)
            .tickFormat(tickFormat)

        let yAxis = d3.axisLeft(yScale)
            .ticks(5, "s")
            .tickSize(-height);

        let gX = svg.append("g")
            .attr("transform", "translate(" + margin.left + "," + (margin.top + height) + ")")
            .call(xAxis)

        gX.selectAll("text")
            .attr("transform", "rotate(-65)");

        let gY = svg.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .call(yAxis)

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

        let circlesGroup = svg.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .attr("clip-path", "url(#clip)")
            .classed("circles-group", true)

        let points = circlesGroup.selectAll("circle")
            .data(claims)
            .enter().append("circle")
                .attr("cx", d => xScale(d.incidentDate))
                .attr("cy", d => yScale(d.closeAmount))
                .attr("r", 3.4)
                .style("fill", "transparent")
                .style("stroke", "rgba(108, 34, 125, 0.7)")
                .style("stroke-width", 1.8)
                .on("mouseover", function(d) {
                    console.log(d)
                })

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
            points.data(claims)
                .attr("cx", d => newXScale(d.incidentDate))
                .attr("cy", d => newYScale(d.closeAmount))
        }
    }
}
