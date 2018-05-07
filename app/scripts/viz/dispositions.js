function setupDispositions() {
  var svg = d3.select("#dispositions-svg"),
      margin = {top: 20, right: 20, bottom: 30, left: 70},
      width = svg.attr("width") - margin.left - margin.right,
      height = svg.attr("height") - margin.top - margin.bottom;

  COLORS = [
    '#339966',
    '#79d2a6',
    'rgb(240, 240, 240)',
  ]

  var x = d3.scaleLinear().range([0, width]),
      y = d3.scaleLinear().range([height, 0]),
      z = d3.scaleOrdinal(COLORS);

  var stack = d3.stack();

  var bisect = d3.bisector(d => d.claim_amount).left

  var area = d3.area()
      .x((d, i) => x(d.data.claim_amount))
      .y0(d => y(d[0]))
      .y1(d => y(d[1]))
      .curve(d3.curveBasis)

  var g = svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  d3.tsv("data/viz/disposition-by-claim-amount.tsv", type, function(error, data) {
    if (error) throw error;

    var keys = data.columns.slice(1);

    x.domain(d3.extent(data, d => d.claim_amount))
    y.domain([0, d3.max(data, d => {
      return keys.reduce((accumulator, key) => accumulator + d[key], 0)
    })]);
    z.domain(keys);
    stack.keys(keys);

    var layer = g.selectAll(".layer")
      .data(stack(data))
      .enter().append("g")
        .attr("class", "layer");

    layer.append("path")
        .attr("class", "area")
        .style("fill", d => {
          return z(d.key)
        })
        .attr("d", area)

    line = g.append("line")
      .attr("x1", 0)
      .attr("x2", 0)
      .attr("y1", 0)
      .attr("y2", height)
      .attr("class", "no-pointer-events")
      .style("stroke-width", 1)
      .style("stroke", "black")
      .style("stroke-dasharray", 2)
      .style("fill", "none")
      .style("opacity", 1)

    let values = g.append("g")
      .attr("width", 250)
      .attr("height", 100)
      .attr("font-family", "sans-serif")
      .style("font-size", 14)

    let claim_value = values.append("text")
      .attr("x", width - 200)
      .attr("y", 15)
      .attr("dy", "0.4em")
      .style("font-weight", "bold")

    svg.on("mousemove", () => {
      const x_coord = d3.mouse(g.node())[0]
      const y_coord = d3.mouse(g.node())[1]
      if (x_coord < 0 || y_coord < 0 || x_coord > width || y_coord > height) {
        hideTooltips()
        return
      }
      showTooltips()
      x0 = x.invert(x_coord)
      let bucket = bisect(data, x0, 1)
      d0 = data[bucket - 1]
      d1 = data[bucket]
      claim_value.text(`Claim Amount: $${d0.claim_amount - 10} - $${d0.claim_amount}`)
      labels.text(d => Math.round(d0[d] * 100) + "% " + d)

      d3.select("line")
        .attr("x1", x_coord)
        .attr("x2", x_coord)
    })

    function hideTooltips() {
      d3.select("line").style("opacity", 0)
      claim_value.style("display", "none")
      labels.text(d => d)
      // document.body.style.cursor = 'default'
    }

    function showTooltips() {
      d3.select("line").style("opacity", 1)
      claim_value.style("display", null)
      // document.body.style.cursor = 'none'
    }

    svg.on("mouseout", hideTooltips)

    svg.on("mouseover", showTooltips)

    g.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x))
        .on("mousemove", () => {
          hideTooltips()
          d3.event.stopPropagation()
        })
        .on("mouseover", () => {
          hideTooltips()
          d3.event.stopPropagation()
        })

    g.append("g")
        .attr("class", "axis axis--y")
        .call(d3.axisLeft(y).ticks(10, "%"))
        .on("mousemove", () => {
          hideTooltips()
          d3.event.stopPropagation()
        })
        .on("mouseover", () => {
          hideTooltips()
          d3.event.stopPropagation()
        })

    var legend = g.append("g")
      .attr("font-family", "sans-serif")
      .style("font-size", 14)
      .attr("text-anchor", "end")
      .attr("class", "legend")
    .selectAll("g")
    .data(keys)
    .enter().append("g")
      .attr("transform", function(d, i) { return "translate(0," + i * 40 + ")"; });

    legend.append("rect")
        .attr("x", width - 45)
        .attr("y", 37)
        .attr("width", 30)
        .attr("height", 30)
        .attr("stroke", "black")
        .attr("stroke-width", "0.5px")
        .attr("fill", (_, i) => COLORS[i])

    labels = legend.append("text")
        .attr("x", width - 56)
        .attr("y", 50.5)
        .attr("dy", "0.4em")
        .text(d => d)
  });

  function type(d, i, columns) {
    d.claim_amount = +d.claim_amount
    for (var i = 1, n = columns.length; i < n; ++i) {
      d[columns[i]] = +d[columns[i]];
    }
    return d;
  }
}
