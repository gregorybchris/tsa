var margin = { top: 20, right: 30, bottom: 50, left: 70 },
    outerWidth = 600,
    outerHeight = 600,
    width = outerWidth - margin.left - margin.right,
    height = outerHeight - margin.top - margin.bottom;

var x = d3.scale.linear()
    .range([0, width]).nice();

var y = d3.scale.linear()
    .range([height, 0]).nice();

/*

"table_id" "id"	"claim_number"	"date_received"	"incident_date"	"airport_code"
	"airport_name"	"airline"	"claim_type"
    "claim_site"	"claim_amount"	"status"	"close_amount"	"disposition"
*/

d3.csv("claim_data.tsv", function(data) {
    data = data.filter(d => d.airport_code == "BWI")
               .filter(d => d.claim_amount < 10000)
  data.forEach(function(d) {
    d.id = +d.id;
    d.close_amount = +d.close_amount;
    d.claim_amount = +d.claim_amount;
    d.formatted_date_received = new Date(d.date_received)
        .toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  });

  var xMax = d3.max(data, function(d) { return d.claim_amount; }) * 1.05,
      xMin = d3.min(data, function(d) { return d.claim_amount; }),
      xMin = xMin > 0 ? 0 : xMin,
      yMax = d3.max(data, function(d) { return d.close_amount; }) * 1.05,
      yMin = d3.min(data, function(d) { return d.close_amount; }),
      yMin = yMin > 0 ? 0 : yMin;

  x.domain([0, Math.max(xMax, yMax)]);
  y.domain([0, Math.max(xMax, yMax)]);

  var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom")
      .tickSize(-height);

  var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left")
      .tickSize(-width);

  var color = d3.scale.category10();

  var tip = d3.tip()
      .attr("class", "d3-tip")
      .offset([-10, 0])
      .html(function(d) {
        return "Claim Number" + ": " + d.claim_number + "<br>" +
                "Date" + ": " + d.formatted_date_received + "<br>" +
                "Airport" + ": " + d.airport_code + "<br>" +
                "Disposition" + ": " + d.disposition + "<br>" +
                "Claim Amount" + ": " + d.claim_amount + "<br>" +
                "Close Amount" + ": " + d.close_amount;
      });

  var zoomBeh = d3.behavior.zoom()
      .x(x)
      .y(y)
      .scaleExtent([0, 500])
      .on("zoom", zoom);

  var svg = d3.select("#scatter")
    .append("svg")
      .attr("width", outerWidth)
      .attr("height", outerHeight)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
      .call(zoomBeh);

  svg.call(tip);

  svg.append("rect")
      .attr("width", width)
      .attr("height", height);

  svg.append("g")
      .classed("x axis", true)
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis)
    .append("text")
      .classed("label", true)
      .attr("x", width/1.7)
      .attr("y", margin.bottom - 10)
      .style("text-anchor", "end")
      .text("Claim Amount");

  svg.append("g")
      .classed("y axis", true)
      .call(yAxis)
    .append("text")
      .classed("label", true)
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left)
      .attr("dy", ".71em")
      .attr("dx", -height/2.4)
      .style("text-anchor", "end")
      .text("Close Amount");

  var objects = svg.append("svg")
      .classed("objects", true)
      .attr("width", width)
      .attr("height", height);

  objects.append("svg:line")
      .classed("axisLine hAxisLine", true)
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", width)
      .attr("y2", 0)
      .attr("transform", "translate(0," + height + ")");

  objects.append("svg:line")
      .classed("axisLine vAxisLine", true)
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", 0)
      .attr("y2", height);

  objects.selectAll(".dot")
      .data(data)
    .enter().append("circle")
      .classed("dot", true)
      .attr("r", function (d) { return 6 * Math.sqrt(1 / Math.PI); })
      .attr("transform", transform)
      .style("fill", "transparent")
      // .style("stroke", function(d) { return color(0); })
      .style("stroke", "rgba(108, 34, 125, 0.7)")
      .style("stroke-width", 1.8)
      .on("mouseover", tip.show)
      .on("mouseout", tip.hide);

  var legend = svg.selectAll(".legend")
      .data(color.domain())
    .enter().append("g")
      .classed("legend", true)
      .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

  legend.append("circle")
      .attr("r", 3.5)
      .attr("cx", width + 20)
      .attr("fill", color);

  legend.append("text")
      .attr("x", width + 26)
      .attr("dy", ".35em")
      .text(function(d) { return d; });

  d3.select("input").on("click", change);

  function change() {
    xMax = d3.max(data, function(d) { return d.claim_amount; });
    xMin = d3.min(data, function(d) { return d.claim_amount; });

    zoomBeh.x(x.domain([xMin, xMax])).y(y.domain([yMin, yMax]));

    var svg = d3.select("#scatter").transition();

    svg.select(".x.axis").duration(750).call(xAxis).select(".label").text("Claim Amount");

    objects.selectAll(".dot").transition().duration(1000).attr("transform", transform);
  }

  function zoom() {
    svg.select(".x.axis").call(xAxis);
    svg.select(".y.axis").call(yAxis);

    svg.selectAll(".dot")
        .attr("transform", transform);
  }

  function transform(d) {
    return "translate(" + x(d.claim_amount) + "," + y(d.close_amount) + ")";
  }
});
