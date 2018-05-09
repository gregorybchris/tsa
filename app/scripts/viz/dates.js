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

        // id,claim_number,date_received,incident_date,
        // airport_code,airport_name,airline,claim_type,
        // claim_site,claim_amount,status,close_amount,disposition

        claims = claims.filter(d => d.incident_date)
            .filter(d => d.close_amount)
            .map(d => ({
                claimNumber: +d.claim_number,
                airportCode: d.airport_code,
                airportName: d.airport_name,
                airline: d.airline,
                claimType: d.claim_type,
                claimNumber: d.claim_number,
                claimAmount: +d.claim_amount,
                closeAmount: +d.close_amount,
                claimSite: d.claim_site,
                dateReceivedString: formatDateString(d.date_received),
                incidentDateString: formatDateString(d.incident_date),
                incidentDate: convertDate(d.incident_date),
                incidentDateUnix: formatDateUnix(d.incident_date),
                disposition: d.disposition,
                newItems: d.items_new.split(","),
                oldItems: d.items_old.split("*")
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
            .attr("dy", "25px")
            .attr("class", "scatter-label")
            .style("text-anchor", "middle")
            .text("Close Amount")

        svg.append("text")
            .attr("transform", "translate(" + (width / 2 + 50) + ", " + (height + margin.top + 30) + ")")
            .style("text-anchor", "middle")
            .text("Incident Date")

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
                .style("pointer-events", "all")
                .on("click", function(d) {
                    updateClaimFields(d)
                })



        function zoomed() {
            let newXScale = d3.event.transform.rescaleX(xScale)
            let newYScale = d3.event.transform.rescaleY(yScale)
            gX.call(xAxis.scale(newXScale))
            gY.call(yAxis.scale(newYScale))
            points.data(claims)
                .attr("cx", d => newXScale(d.incidentDate))
                .attr("cy", d => newYScale(d.closeAmount))
        }

        function filterItems(items) {
            return items.filter(function(item, i, self) {
                return i === self.indexOf(item);
            })
        }

        function updateClaimFields(d) {
            console.log("Clicked", d)
            d3.select("#claim-date-received-text").html(d.dateReceivedString)
            d3.select("#claim-incident-date-text").html(d.incidentDateString)
            d3.select("#claim-airline-text").html(d.airline)
            d3.select("#claim-items-text").html(filterItems(d.oldItems))

            d3.select("#claim-site-text").html(d.claimSite)
            d3.select("#claim-amount-text").html("$" + d.claimAmount)
            d3.select("#claim-close-amount-text").html("$" + d.closeAmount)
            d3.select("#claim-disposition-text").html(d.disposition)
        }
    }
}
