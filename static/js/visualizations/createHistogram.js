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

define(['jquery', 'd3', 'd3tip', 'vizhelpers'],
function($, d3, d3tip, helpers) {
    var svg;
    var margin;
    var zoom_area;
    var zoom_rect;
    var width;
    var height;
    var x;
    var xAxis;
    var y;
    var yAxis;
    var min_n;
    var max_n;

    return {
        createHistogramPlot : function (svg_param, raw_Data, values_only, width_param, height_param, x_attr, xLabel, tip, margin_param, legend) {
            svg    = svg_param;
            width  = width_param;
            height = height_param;
            margin = margin_param;

            var num_bins = Math.ceil(Math.sqrt(raw_Data.length));
            var hist_data = d3.layout.histogram()
                .bins(num_bins)
                .frequency(false)(values_only);
            var kde = science.stats.kde().sample(values_only);
            var tmp = helpers.get_min_max(raw_Data, x_attr);
            min_n = tmp[0];
            max_n = tmp[1];


            x = d3.scale.linear()
                .range([margin.left, width - margin.right])
                .domain([min_n, max_n]);
            xAxis = d3.svg.axis()
                .scale(x)
                .orient('bottom');

            y = d3.scale.linear()
                .range([height - margin.bottom - margin.top, 0])
                .domain([0, d3.max(hist_data, function (d) {
                    return d.y;
                })]);

            yAxis = d3.svg.axis()
                .scale(y)
                .orient('left')
                .tickFormat(d3.format(".1%"))
                .tickSize(-width + margin.right + margin.left, 0, 0);

            var zoomer = function () {
                svg.select('.x.axis').call(xAxis);
                svg.select('.y.axis').call(yAxis);
                plot_area.selectAll('.plot-bar').attr('transform', 'translate(' + d3.event.translate[0] + ',' + d3.event.translate[1] + ')scale(' + d3.event.scale + ',' + d3.event.scale + ')');
                plot_area.selectAll('path.line').attr('transform', 'translate(' + d3.event.translate[0] + ',' + d3.event.translate[1] + ')scale(' + d3.event.scale + ',' + d3.event.scale + ')');
            };

            var zoom = d3.behavior.zoom()
                .x(x)
                .y(y)
                .on('zoom', zoomer);

            zoom_area = svg.append('g')
                .attr('class', 'zoom_area')
                .append('rect')
                .attr('width', width)
                .attr('height', height)
                .style('opacity', '0');

            var sorted = raw_Data.sort(function (a, b) {
                if (a[x_attr] > b[x_attr]) {
                    return 1;
                }
                if (a[x_attr] < b[x_attr]) {
                    return -1;
                }
                return 0;
            });

            var sample_index = 0;
            for (var i = 0; i < hist_data.length; i++) {

                var sample_list = [];
                for (var j = 0; j < hist_data[i].length; j++) {
                    sample_list.push(sorted[sample_index]['sample_id']);
                    sample_index++
                }
                hist_data[i]['samples'] = sample_list;
            }

            var plot_area = svg.append('g')
                .attr('clip-path', 'url(#plot_area_clip)');

            plot_area.append('clipPath')
                .attr('id', 'plot_area_clip')
                .append('rect')
                .attr({ width: width - margin.left - margin.right,
                    height: height - margin.top - margin.bottom})
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            plot_area.selectAll(".plot-bar")
                .data(hist_data)
                .enter().append("rect")
                .attr("class", "plot-bar")
                .attr('data-samples', function (d) {
                    return d['samples'];
                })
                .attr("x", function (d) {
                    return x(d.x) + 1;
                })
                .attr("y", function (d) {
                    return y(d.y);
                })
                .attr("width", x(hist_data[0].dx + hist_data[0].x) - x(hist_data[0].x) - 1)
                .attr("height", function (d) {
                    return height - margin.top - margin.bottom - y(d.y);
                })
                .attr('transform', 'translate(0,' + margin.top + ')')
                .on('mouseover.tip', tip.show)
                .on('mouseout.tip', tip.hide);

            var line = d3.svg.line()
                .x(function (d) {
                    return x(d[0]);
                })
                .y(function (d) {
                    return y(d[1]);
                });

            plot_area.append('path')
                .data(d3.values(science.stats.bandwidth))
                .attr('class', 'line')
                .attr('stroke', 'red')
                .attr('fill', 'none')
                .attr('d', function (f) {
                    return line(kde.bandwidth(f)(d3.range(min_n, max_n, 0.1)));
                })
                .attr('transform', 'translate(' + 0 + ',' + margin.top + ')');

            // Highlight the selected rectangles.
            var brushmove = function (p) {
                var total_samples = 0;
                var total_patients = 0;
                var sample_list = [];
                var patient_list = [];
                var e = brush.extent();
                svg.selectAll('rect.plot-bar').classed("selected", function (d) {
                    return e[0] <= (d['x'] + d['dx']) && d['x'] <= e[1];
                });
                $('rect.plot-bar.selected').each(function () {
                    var samples = $(this).attr('data-samples').split(',');
                    var patients = $.map(samples, function(d) { return d.substr(0, 12);})
                        .filter(function(item, i, a) { return i == a.indexOf(item); });
                    total_samples += samples.length;
                    total_patients += patients.length;
                    sample_list = sample_list.concat(samples);
                    patient_list = patient_list.concat(patients);
                });

                sample_form_update(e, total_samples, total_patients, sample_list);
            };

            // If the brush is empty, select all circles.
            var brushend = function () {
                if (brush.empty()) {
                    svg.selectAll(".hidden").classed("hidden", false);
                    $(svg[0]).parents('.plot').find('.save-cohort-card').hide();
                }
            };

            var brush = d3.svg.brush()
                .x(x)
                .on('brushstart', function(){ svg.selectAll('.extent').style("fill", "rgba(40,130,50,0.5");})
                .on('brush', brushmove)
                .on('brushend', brushend);

            svg.call(tip);

            // append axes
            svg.append('g')
                .attr('class', 'y axis')
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
                .call(yAxis);

            svg.append('g')
                .attr('class', 'x axis')
                .attr('transform', 'translate(0,' + (height - margin.bottom) + ')')
                .call(xAxis);

            // append axes labels
            svg.append('text')
                .attr('class', 'x label')
                .attr('text-anchor', 'middle')
                .attr('transform', 'translate(' + (width / 2) + ',' + (height - 10) + ')')
                .text(xLabel);

            svg.append('text')
                .attr('class', 'y label')
                .attr('text-anchor', 'middle')
                .attr('transform', 'rotate(-90) translate(' + (-1 * (height/2)) + ',10)')
                .text('Percentage of Samples in Grouping');

            function check_selection_state(isActive) {
                if (isActive) {
                    // Remove zoom area
                    svg.selectAll('.zoom_area').remove();

                    // Append new brush event listeners to plot area only
                    plot_area.append('g')
                        .attr('class', 'brush')
                        .call(brush)
                        .selectAll('rect')
                        .attr('y', 0)
                        .attr('height', height - margin.bottom);
                } else {
                    var plot_id = $(svg[0]).parents('.plot').attr('id').split('-')[1];
                    // Clear selections
                    $(svg[0]).parents('.plot').find('.selected-samples-count').html('Number of Samples: ' + 0);
                    $(svg[0]).parents('.plot').find('.selected-patients-count').html('Number of Participants: ' + 0);
                    $('#save-cohort-'+plot_id+'-modal input[name="samples"]').attr('value', []);
                    svg.selectAll('.selected').classed('selected', false);
                    $(svg[0]).parents('.plot').find('.save-cohort-card').hide();
                    // Remove brush event listener plot area
                    plot_area.selectAll('.brush').remove();

                    // Append new zoom area
                    zoom_area = svg.append('g')
                        .attr('class', 'zoom_area')

                    zoom_rect = zoom_area.append('rect')
                        .attr('width', width)
                        .attr('height', height)
                        .style('opacity', 0);

                    // Register zoom event listeners
                    zoom.on('zoom', zoomer);
                    zoom_area.call(zoom)
                        .on('.zoom', zoomer);
                }
            };

            /*
                Update the sample cohort bar update
             */
            function sample_form_update(extent, total_samples, total_patients, sample_list){
                var plot_id = $(svg[0]).parents('.plot').attr('id').split('-')[1];
                $(svg[0]).parents('.plot').find('.selected-samples-count').html('Number of Samples: ' + total_samples);
                $(svg[0]).parents('.plot').find('.selected-patients-count').html('Number of Participants: ' + total_patients);
                $('#save-cohort-' + plot_id + '-modal input[name="samples"]').attr('value', sample_list);
                $(svg[0]).parents('.plot')
                    .find('.save-cohort-card').show()
                    .attr('style', 'position:relative; top: -600px; left:' + (x(extent[1]) + 10) + 'px;');

                if (total_samples > 0){
                    $(svg[0]).parents('.plot')
                        .find('.save-cohort-card').find('.btn').prop('disabled', false);
                } else {
                    $(svg[0]).parents('.plot')
                        .find('.save-cohort-card').find('.btn').prop('disabled', true);
                }
            }

            function resize() {
                width = svg.node().parentNode.offsetWidth - 10;
                //TODO resize plot
            }

            function check_selection_state_wrapper(button){
                check_selection_state(button);
            }

            return {
                resize                : resize,
                check_selection_state : check_selection_state_wrapper
            }
        }
    };
});