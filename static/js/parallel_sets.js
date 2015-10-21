define(['d3', 'd3parsets'], function(d3, d3parsets) {
    return {
        draw_parsets: function(data, features) {
            var chart = parsets()
                .dimensions(features);

            d3.select("#multi-categorical").html(""); // do checkbox transitions later

            var vis = d3.select("#multi-categorical").append("svg")
                .attr("width", 1000) //chart.width())
                .attr("height", 600) //chart.height());
                .attr("style", "display:block");


            vis.datum(data['items']).call(chart);

            vis[0][0]['children'][0].setAttribute("transform", "translate(60,550)rotate(270)");
            vis[0][0]['children'][1].setAttribute("transform", "translate(60,550)rotate(270)");

        }
    }
});