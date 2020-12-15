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
      .defer(d3.tsv, "./data/viz/by-airport/BOS.tsv")
      .await(ready)

    function ready(error, amounts) {
        if (error) throw error

        amounts = amounts.map(d => ({
                id: +d.id,
                claimAmount: +d.claim_amount,
                closeAmount: +d.close_amount
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

        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0)
            .attr("x", 0 - (height / 2))
            .attr("dy", "22px")
            .attr("class", "scatter-label")
            .style("text-anchor", "middle")
            .text("Close Amount")

        svg.append("text")
            .attr("transform", "translate(" + (width / 2 + 50) + ", " + (height + margin.top + 30) + ")")
            .style("text-anchor", "middle")
            .text("Claim Amount")

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
            .on("zoom", zoomed)

        svg.append("rect")
            .attr("width", width)
            .attr("height", height)
            .style("fill", "none")
            .style("pointer-events", "all")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .call(zoom)

        function zoomed() {
            // let e = d3.event
            // let tx = Math.min(0, Math.max(e.translate[0], width - width * e.scale))
            // let ty = Math.min(0, Math.max(e.translate[1], height - height * e.scale))
            // zoom.translate([tx, ty])
            // g.attr("transform", ["translate(" + [tx, ty] + ")", "scale(" + e.scale + ")"].join(" "))

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
