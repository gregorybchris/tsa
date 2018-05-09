function setupSites() {
    const ORIG_X_AXIS = 500

    var initStackedBarChart = {
    	draw: function(config) {
    		me = this,
    		domEle = config.element,
    		stackKey = config.key,
    		data = config.data,
    		margin = {top: 20, right: 20, bottom: 30, left: 150},
    		width = 1000 - margin.left - margin.right,
    		height = 500 - margin.top - margin.bottom,
    		xScale = d3.scaleLinear().rangeRound([0, width]),
    		yScale = d3.scaleBand().rangeRound([height, 0]).padding(0.1),
    		color = d3.scaleOrdinal(d3.schemeCategory10),
    		xAxis = d3.axisBottom(xScale),
    		yAxis =  d3.axisLeft(yScale),
    		svg = d3.select("#sites-svg")
    				.attr("width", width + margin.left + margin.right)
    				.attr("height", height + margin.top + margin.bottom)
    				.append("g")
    				.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    		var stack = d3.stack()
    			.keys(stackKey)
    			/*.order(d3.stackOrder)*/
    			.offset(d3.stackOffsetNone);

    		var layers= stack(data);
    			data.sort(function(a, b) { return b.total - a.total; });
    			yScale.domain(data.map(function(d) { return d['Claim Type']; }));
    			//xScale.domain([0, ORIG_X_AXIS]).nice();
                xScale.domain([0, get_actual_x_max()]).nice();

    		var layer = svg.selectAll(".layer")
    			.data(layers)
    			.enter().append("g")
    			.attr("class", "layer")
    			.style("fill", function(d, i) { console.log(d, i); return color(i); });

    			svg.append("g")
    			.attr("class", "axis axis--x")
    			.attr("transform", "translate(0," + (height+5) + ")")
    			.call(xAxis);

    			svg.append("g")
    			.attr("class", "axis axis--y")
    			.attr("transform", "translate(0,0)")
    			.call(yAxis);

          function getIndex(data) {
            return yScale.domain().length - yScale.domain().findIndex(c => c === data.data['Claim Type']) - 1
          }

          function get_actual_x_max() {
            return d3.max(layers[layers.length - 1], function(d, i) { return +d[1] })
          }

    		  layer.selectAll("rect")
    			  .data(function(d) { return d; })
    			.enter()
          .append("rect")
    			  .attr("y", function(d) { return yScale(d.data['Claim Type']); })
    			  .attr("height", yScale.bandwidth())
    			  .attr("x", function(d) { return xScale(d[0]); })
    			  .attr("width", function(d) { return xScale(d[1]) - xScale(d[0]) })
            .attr("class", "bar")
            .style("opacity", 0)
            .transition()
            .delay((d,i) => 1500 + 100 * getIndex(d))
            .duration(1000)
            .style("opacity", 1)

              var legend = svg.append("g")
                .attr("font-family", "sans-serif")
                .attr("font-size", 10)
                .attr("text-anchor", "end")
                .attr("class", "legend")
                .style("opacity", 0)
              .selectAll("g")
              .data(stackKey)
              .enter().append("g")
                .attr("transform", function(d, i) { return "translate(0," + i * 40 + ")"; });

              legend.append("rect")
                  .attr("x", width - 19)
                  .attr("width", 30)
                  .attr("height", 30)
                  .attr("fill", function(d, i) { return color(i) });

              legend.append("text")
                  .attr("x", width - 24)
                  .attr("y", 17)
                  .attr("dy", "0.32em")
                  .style("font-size", 14)
                  .text(function(d) { return d; });

              svg.select(".legend").transition()
                .delay(1000)
                .duration(1000)
                .style("opacity", 1)

              d3.select('#btnExpandAxis').on('click', () => {

          			xScale.domain([0, get_actual_x_max()]).nice();
                const t = d3.transition()
                  .duration(1500)

                svg.select(".axis--x")
                  .transition(t)
                  .call(xAxis);

                svg.selectAll(".bar")
                  .transition(t)
                  .attr("x", function(d) {
                    if (isNaN(xScale(d[0]))) {
                      return 0
                    }
                    return xScale(d[0])
                  })
                  .attr("width", function(d) {
                    if (isNaN(xScale(d[0])) || isNaN(xScale(d[1]))) {
                      return 0
                    }
                    return xScale(d[1]) - xScale(d[0])
                  })
                  .style("opacity", 1)
              })
    	}
    }
      d3.queue()
        .defer(d3.csv, "data/viz/sites.csv", function(d, i, columns) {
          for (i = 1, t = 0; i < columns.length; ++i) t += d[columns[i]] = +d[columns[i]];
          d.total = t;
          return d;
        })
        .await((error, data) => {
          if (error) throw error;
          var key = [
            "Checkpoint",
            "Checked Baggage",
            "Other Locations"
          ];
          initStackedBarChart.draw({
          	data: data,
          	key: key,
          	element: 'stacked-bar'
          });
        });
}
