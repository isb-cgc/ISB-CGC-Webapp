/**
 *
 * Copyright 2015, Institute for Systems Biology
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

define(['d3', 'd3parsets'], function(d3, d3parsets) {
    return {
        draw_parsets: function(data, features, program) {
            var startPlot = new Date().getTime();
            var chart = parsets()
                .dimensions(features);

            var selector = "#multi-categorical-"+program;

            d3.select(selector).html(""); // do checkbox transitions later

            var vis = d3.select(selector).append("svg")
                .attr("width", 740) //chart.width())
                .attr("height", 600) //chart.height());
                .attr("style", "display:block");


            vis.datum(data['data_avail']).call(chart);

            vis[0][0]['children'][0].setAttribute("transform", "translate(0,550)rotate(270)"); // ribbons
            vis[0][0]['children'][1].setAttribute("transform", "translate(0,550)rotate(270)"); // ??

            var stopPlot = new Date().getTime();

            // Auto-scroll over to center the graph on any redraw
            $(selector).prop('scrollLeft',150);

            console.debug("[BENCHMARKING] Time to build parallel coords plot: "+(stopPlot-startPlot)+ "ms");

        }
    }
});