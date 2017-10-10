function stackMax(layer) {
  return d3.max(layer, function (d) {
    return d[1];
  });
}

function stackMin(layer) {
  return d3.min(layer, function (d) {
    return d[0];
  });
}

const margin = {top: 10, right: 80, bottom: 20, left: 20};
const div = d3.select('#tooltip')
              .attr("class", "tooltip")
              .style("opacity", 0);;

let svg = d3.select("svg");

const width = svg.attr('width') - margin.left - margin.right;
const height = svg.attr('height') - margin.top - margin.bottom;

svg = svg.append("g")
         .attr("transform", `translate(${margin.left}, ${margin.top})`);

d3.csv(
  "./data/conteos_mas_populares.csv",
  (row) => {
    return {
      site: row.site,
      month: new Date(row.month),
      total: +row.total
    }
  },
  (error, data) => {
    if (error) throw error;

    const siteNames = data.map(c => c.site).filter((v, i, a) => a.indexOf(v) === i );

    const nest = d3.nest()
                   .key(d => d.month);
    const nestedByMonth = nest.sortKeys((a, b) => new Date(a) - new Date(b))
                              .entries(data)
                              .map(d => {
                                let month = {month: new Date(d.key)};
                                d.values.forEach(row => {
                                  month[row.site] = row.total
                                });
                                return month;
                              });

    const nestedWithout = nest.sortKeys((a, b) => new Date(a) - new Date(b))
                              .entries(data)
                              .map(d => {
                                let month = {month: new Date(d.key)};
                                d.values.forEach(row => {
                                  if (row.site === 'stackoverflow.com') {
                                    month[row.site] = 0;
                                  }
                                  else {
                                    month[row.site] = row.total*4;
                                  }
                                });
                                return month;
                              });

    const stack = d3.stack()
                    .keys(siteNames)
                    .order(d3.stackOrderInsideOut)
                    .offset(d3.stackOffsetWiggle);

    var includeSO = true;

    const layers = stack(nestedByMonth);
    const altLayers = stack(nestedWithout);

    const dates = data.map(d => d.month);
    const x = d3.scaleTime()
                .domain([d3.min(dates), d3.max(dates)])
                .range([0, width]);

    const y = d3.scaleLinear()
                .domain([d3.min(layers, stackMin), d3.max(layers, stackMax)])
                .range([height, 0]);

    const z = d3.scaleOrdinal(d3.schemeCategory20);

    const area = d3.area()
                   .x((d, i) => x(d.data.month))
                   .y0(d => y(d[0]))
                   .y1(d => y(d[1]))
                   .curve(d3.curveCardinal);

    const paths = svg.selectAll(".layer")
                     .data(layers);

    //Enter
    const pathsEnter = paths.enter()
                            .append("path")
                            .classed('layer', true);

    //Merge
    paths.merge(pathsEnter)
         .attr("d", area)
         .attr("fill", d => {
           return z(d.key)
         })
         .on('mouseover', (d, i, nodes) => {
           svg.selectAll('.layer')
              .transition()
              .duration(250)
              .attr('fill', (d, j) => j !== i ? 'lightgray' : z(d.key));
         })
         .on('mousemove', d => {

           var date = x.invert(d3.mouse(svg.node())[0]);
           date = new Date(date.getFullYear(), date.getMonth());
           const offset = 5*60*60*1000; // yes.. it will only work in colombia...
           const month_data = d.find(m => {
             return m.data.month.getTime() === date.getTime() - offset
           });

           const posts = month_data.data[d.key];

           div.transition()
              .duration(100)
              .style("opacity", .9);
           div.html(`<span style="color:${z(d.key)}">${d.key}</span></br><strong>${date.getFullYear()} - ${date.getMonth()}</strong> ${posts} posts`);

         })
         .on('mouseout', (d, i, nodes) => {
           svg.selectAll('.layer')
              .transition()
              .duration(290)
              .attr('fill', (d, j) => z(d.key));
           div.transition()
              .duration(200)
              .style("opacity", 0);

         });

    svg.append("g")
       .attr("transform", "translate(0," + height + ")")
       .call(d3.axisBottom(x));

    const transition = () => {
      includeSO = !includeSO;
      d3.selectAll(".layer")
        .data(includeSO ? layers: altLayers)
        .transition()
        .duration(1000)
        .attr("d", area);
    }

    d3.select('#no-outliers').on("click",transition);
  }
);
