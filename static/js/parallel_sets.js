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