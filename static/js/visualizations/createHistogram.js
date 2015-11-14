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
    return {
        createHistogramPlot: function (svg, raw_Data, values_only, width, height, x_attr, xLabel, tip, margin, legend) {

            var num_bins = Math.ceil(Math.sqrt(raw_Data.length));
            var hist_data = d3.layout.histogram()
                .bins(num_bins)
                .frequency(false)(values_only);

            var kde = science.stats.kde().sample(values_only);
            var tmp = helpers.get_min_max(raw_Data, x_attr);
            var min_n = tmp[0];
            var max_n = tmp[1];
            var x = d3.scale.linear()
                .range([margin.left, width - margin.right])
                .domain([min_n, max_n]);
            var xAxis = d3.svg.axis()
                .scale(x)
                .orient('bottom');
            var y = d3.scale.linear()
                .range([height - margin.bottom - margin.top, 0])
                .domain([0, d3.max(hist_data, function (d) {
                    return d.y;
                })]);
            var yAxis = d3.svg.axis()
                .scale(y)
                .orient('left')
                .tickFormat(d3.format(".1%"))
                .tickSize(-width + margin.right + margin.left, 0, 0);

            var zoomer = function () {
                svg.select('.x.axis').call(xAxis);
                svg.select('.y.axis').call(yAxis);
                plot_area.selectAll('.bar').attr('transform', 'translate(' + d3.event.translate[0] + ',' + d3.event.translate[1] + ')scale(' + d3.event.scale + ',' + d3.event.scale + ')');
                plot_area.selectAll('path.line').attr('transform', 'translate(' + d3.event.translate[0] + ',' + d3.event.translate[1] + ')scale(' + d3.event.scale + ',' + d3.event.scale + ')');
            };

            var zoom = d3.behavior.zoom()
                .x(x)
                .y(y)
                .on('zoom', zoomer);

            var zoom_area = svg.append('g')
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

            plot_area.selectAll(".bar")
                .data(hist_data)
                .enter().append("rect")
                .attr("class", "bar")
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
                var plot_id = $(svg[0]).parents('.plot').attr('id').split('-')[1];
                svg.selectAll('rect.bar').classed("selected", function (d) {
                    return e[0] <= (d['x'] + d['dx']) && d['x'] <= e[1];
                });
                $('rect.bar.selected').each(function () {
                    var samples = $(this).attr('data-samples').split(',');
                    var patients = $.map(samples, function(d) { return d.substr(0, 12);})
                        .filter(function(item, i, a) { return i == a.indexOf(item); });
                    total_samples += samples.length;
                    total_patients += patients.length;
                    sample_list = sample_list.concat(samples);
                    patient_list = patient_list.concat(patients);
                });
                $(svg[0]).parents('.plot').find('.selected-samples-count').html('Number of Samples: ' + total_samples);
                $(svg[0]).parents('.plot').find('.selected-patients-count').html('Number of Participants: ' + total_patients);
                $('#save-cohort-'+plot_id+'-modal input[name="samples"]').attr('value', sample_list);
                $(svg[0]).parents('.plot')
                    .find('.save-cohort-card').show()
                    .attr('style', 'position:absolute; top: 60px; left:' +(x(e[1])+margin.left)+'px;');
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

            var check_selection_state = function (obj) {
                if (obj) {

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
                        .append('rect')
                        .attr('width', width)
                        .attr('height', height)
                        .style('opacity', 0);

                    // Register zoom event listeners
                    zoom.on('zoom', zoomer);
                    zoom_area.call(zoom)
                        .on('.zoom', zoomer);
                }
            };

            $(svg[0]).parents('.plot').find('.toggle-selection').unbind();
            $(svg[0]).parents('.plot').find('.toggle-selection').on('click', function () {
                $(this).toggleClass('active');

                check_selection_state($(this).hasClass('active'));
            });

            check_selection_state($(svg[0]).parents('.plot').find('.toggle-selection').hasClass('active'));
        }
    };
});