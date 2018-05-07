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
        .defer(d3.tsv, 'data/viz/items.tsv')
        .await(ready)

    function ready(error, items) {
        if (error) throw error

        items.forEach(function(d) {
            d.count = +(d.count.replace(',', ''))
            d.claimAmount = +(d.claimAmount.replace(',', ''))
            d.closeAmount = +(d.closeAmount.replace(',', ''))
        })

        items.reverse()

        // data.sort(function(a, b) { return a.count - b.count })

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
    }
}
