function setupAmounts() {
    let svg = d3.select("#amounts-svg")
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
      .defer(d3.tsv, "./data/viz/amounts.tsv")
      .await(ready)

    function ready(error, amounts) {
        if (error) throw error

        formatDate = date => new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

        amounts = amounts.filter(d => d.airport_code == "BWI")
            .filter(d => +d.claim_amount < 10000)
            .map(d => ({
                id: +d.id,
                claimAmount: +d.claim_amount,
                closeAmount: +d.close_amount,
                dateReceived: formatDate(d.date_received)
            }))

        let xMax = d3.max(amounts, d => d.claimAmount)
        let yMax = d3.max(amounts, d => d.closeAmount)
        let [scaleLength, majorMax] = xMax > yMax ? [width, xMax] : [height, yMax]

        let xScale = d3.scaleLinear()
            .domain([-50, majorMax])
            .range([0, width])

        let yScale = d3.scaleLinear()
            .domain([-50, majorMax])
            .range([height, 0])

        let xAxis = d3.axisBottom(xScale)
            .ticks(5, "s")
            .tickSize(-width);

        let yAxis = d3.axisLeft(yScale)
            .ticks(5, "s")
            .tickSize(-height);

        let gX = svg.append("g")
            .attr("transform", "translate(" + margin.left + "," + (margin.top + height) + ")")
            .call(xAxis)

        let gY = svg.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .call(yAxis)

        // svg.append("g")
        //     .classed("x axis", true)
        //     .attr("transform", "translate(0," + height + ")")
        //     .call(xAxis)
        //   .append("text")
        //     .classed("label", true)
        //     .attr("x", width/1.7)
        //     .attr("y", margin.bottom - 10)
        //     .style("text-anchor", "end")
        //     .text("Claim Amount");
        //
        // svg.append("g")
        //     .classed("y axis", true)
        //     .call(yAxis)
        //   .append("text")
        //     .classed("label", true)
        //     .attr("transform", "rotate(-90)")
        //     .attr("y", -margin.left)
        //     .attr("dy", ".71em")
        //     .attr("dx", -height/2.4)
        //     .style("text-anchor", "end")
        //     .text("Close Amount");

        let circlesGroup = svg.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .attr("clip-path", "url(#clip)")
            .classed("circles-group", true)

        let points = circlesGroup.selectAll("circle")
            .data(amounts)
            .enter().append("circle")
                .attr("cx", d => xScale(d.claimAmount))
                .attr("cy", d => yScale(d.closeAmount))
                .attr("r", 3.4)
                .style("fill", "transparent")
                .style("stroke", "rgba(108, 34, 125, 0.7)")
                .style("stroke-width", 1.8)
                .on("mouseover", function(d) {
                    console.log(d)
                })

        let zoom = d3.zoom()
            .scaleExtent([.5, 20])
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
            points.data(amounts)
                .attr("cx", d => newXScale(d.claimAmount))
                .attr("cy", d => newYScale(d.closeAmount))
        }
    }
}
