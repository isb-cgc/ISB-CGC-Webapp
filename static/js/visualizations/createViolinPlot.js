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

define (['jquery', 'd3', 'd3tip', 'vizhelpers'],
function($, d3, d3tip, vizhelpers) {
    var helpers = Object.create(vizhelpers, {});
    return {
        addViolin: function (svg, raw_data, values_only, height, width, domain, range) {
            var data = d3.layout.histogram()
                .frequency(0)(values_only.sort(d3.descending));

            var y = d3.scale.linear()
                .range([width/2, 0])
                .domain([0, d3.max(data, function(d) { return d.y; })]);

            var x = d3.scale.linear()
                .range(range)
                .domain(domain)
                .nice();

            var line = d3.svg.line()
                .interpolate('basis')
                .x(function(d) {
                    return x(d.x);
                })
                .y(function(d) {
                    return y(d.y);
                });

            var gPlus = svg.append('g');
            var gMinus = svg.append('g');

            gPlus.append('path')
                .datum(data)
                .attr('class', 'violin')
                .attr('d', line)
                .style('stroke', 'blue')
                .style('fill', 'none')
                .attr('transform', 'rotate(90, 0, 0) translate(0, -' + width + ')');

            gMinus.append('path')
                .datum(data)
                .attr('class', 'violin')
                .attr('d', line)
                .style('stroke', 'blue')
                .style('fill', 'none')
                .attr('transform', 'rotate(90, 0, 0) scale(1, -1)');
        },
        addPoints: function (svg, raw_data, values_only, height, width, violin_width, domain, range, xdomain, xAttr, yAttr, colorBy, legend, margin, cohort_set) {
            // for each key, value_list in values_only
                // create a histogram and new dictionary where key=plot_number and value=histogram_values

            // remove counts from xdomain
            var tmp = xdomain;
            xdomain = [];
            for (var i = 0; i < tmp.length; i++) {
                xdomain.push(tmp[i].split(':')[0]);
            }

            // Somehow use the histogram values to determine the x position of the dot
            var y = d3.scale.linear()
                .range(range)
                .domain(domain);

            var x = d3.scale.ordinal()
                .domain(xdomain)
                .rangeBands([0, width-(violin_width/2)]);

            var colorVal = function(d) { return d[colorBy]; };

            var name_domain = $.map(raw_data, function(d) {
                return d[colorBy];
            });
            var color = d3.scale.ordinal()
                .domain(name_domain)
                .range(helpers.color_map(name_domain.length));

            var histo_dict = {};
            for (var key in values_only) {
                histo_dict[key] = d3.layout.histogram()
                    .frequency(0)(values_only[key].sort(d3.descending));
            }



            svg.selectAll('.dot')
                .data(raw_data)
                .enter().append('circle')
                .attr('id', function(d) { return d['sample_id']; })
                .attr('class', function(d) { return d[colorBy]; })
                .style('fill', function(d) { return color(colorVal(d)); })
                .attr('cx', function(d) {
                    var histogram = histo_dict[x(d[xAttr])/violin_width];
                    var histo_index = 0;
                    for (var j = 0; j < histogram.length; j++) {
                        var higher = histogram[j][0];
                        var lower = histogram[j][histogram[j].length-1];
                        if (d[yAttr] >= lower && d[yAttr] <= higher) {
                            histo_index = j;
                        }
                    }
                    var plusOrMinus = Math.random() < 0.5 ? -1 : 1;
                    var rand_pos = 0;
                    if (histogram.length) {
                        var y_horizontal = d3.scale.linear()
                            .range([0, violin_width/2])
                            .domain([0, d3.max(histogram, function(d) { return d.y; })]);
                        rand_pos = plusOrMinus * Math.floor(Math.random() * y_horizontal(histogram[histo_index]['y']) * 0.8);
                    }
                    return x(d[xAttr]) + violin_width/2 + rand_pos;
                }) // Staggers points across a histogram
                .attr('cy', function(d) {
                    return y(d[yAttr]);
                })
                .attr('r', 2);



            legend = legend.attr('height', 20 * color.domain().length + 30);
            legend.append('text')
                .attr('x', 0)
                .attr('y', 20)
                .text('Legend');
            legend = legend.selectAll('.legend')
                .data(color.domain())
                .enter().append('g')
                .attr('class', 'legend')
                .attr("transform", function(d, i) { return "translate(0," + (((i+1) * 20) + 10) + ")"; });

            legend.append('rect')
                .attr('width', 20)
                .attr('height', 20)
                .attr('class', 'selected')
                .style('stroke', color)
                .style('stroke-width', 1)
                .style('fill', color)
                .on('click', helpers.toggle_selection);

            legend.append('text')
                .attr('x', 25)
                .attr('y', 15)
                .text(function(d) {
                    if (d != null) {
                        if (colorBy == 'cohort') {
                            for (var i = 0; i < cohort_set.length; i++) {
                                if (cohort_set[i]['id'] == d) { return cohort_set[i]['name']; }
                            }
                        } else {
                            return d;
                        }
                    } else {
                        return 'NA';
                    }
                });
        },
        addMedianLine: function(svg, raw_data, values_only, height, width, domain, range) {
            var median = d3.median(values_only);
            var y = d3.scale.linear()
                .range(range)
                .domain(domain);

            var line = d3.svg.line()
                .interpolate('linear')
                .x(function(d) { return d.x; })
                .y(function(d) { return y(d.y); });

            var median_line = [ {x: 10, y: median},
                                {x: width-10, y: median}];
            svg.append('path')
                .datum(median_line)
                .attr('class', 'median-line')
                .attr('d', line)
                .style('stroke', 'green')
                .style('fill', 'none')

        },
        createViolinPlot: function(svg, raw_Data, height, violin_width, max_y, min_y, xLabel, yLabel, xAttr, yAttr, colorBy, legend, cohort_set) {
            var margin = {top: 0, bottom: 50, left: 50, right: 0};
            var domain = [min_y, max_y];
            var range = [height-margin.bottom, 0];
            var view_width = 800;
            var processed_data = {};

            // Split data into separate violins
            for (var i = 0; i < raw_Data.length; i++) {
                var item = raw_Data[i];
                var key = item[xAttr];
                var tmp = {};
                if (colorBy) {
                    if (colorBy == 'cohort'){
                        tmp[colorBy] = item[colorBy][0];
                    } else {

                        tmp[colorBy] = item[colorBy];
                    }
                } else {
                    tmp['color'] = null;
                }
                tmp['value'] = item[yAttr];
                if (key in processed_data) {
                    processed_data[key].push(tmp);
                } else {
                    processed_data[key] = [tmp];
                }
            }
            var plot_area = svg.append('g')
                .attr('clip-path', 'url(#plot_area_clip)');

            plot_area.append('clipPath')
                .attr('id', 'plot_area_clip')
                .append('rect')
                .attr('height', height-margin.top-margin.bottom)
                .attr('width', view_width)
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            var violin_area = plot_area.append('svg')
                .attr('class', 'violin_area')
                .style('fill-opacity', 0)
                .attr('height', height - margin.bottom - margin.top)
                .attr('transform', 'translate(' + margin.left + ',0)');

            // iterate over data to generate a separate violin plot for each
            var i = 0;
            var xdomain = [];
            var merge_list = [];
            var scatter_processed_data = {};
            for (var key in processed_data) {
                var point_count = processed_data[key].length;
                xdomain.push(key + ':' + point_count);
                var g = violin_area.append('g')
                    .attr('class', 'violin-plot')
                    .attr('transform', 'translate(' + (i * violin_width + margin.left) + ')');
                scatter_processed_data[i] = [];
                var values_only = [];

                for (var j = 0; j < processed_data[key].length; j++) {
                    if (processed_data[key][j]['value'] != "NA") {
                        values_only.push(processed_data[key][j]['value']);
                        scatter_processed_data[i].push(processed_data[key][j]['value']);
                        var temp = processed_data[key][j];
                        temp['plot_number'] = i+1;
                        merge_list.push(temp);
                    }

                }

                this.addViolin(g, processed_data[key], values_only, height, violin_width, domain, range);
                this.addMedianLine(g, processed_data[key], values_only, height, violin_width, domain, range);
                i += 1;
            }

            // Set width of overall plot in here
            var width = violin_width * Object.keys(processed_data).length + (violin_width / 2);
            violin_area.attr('width', width);
            svg.attr('width', width + margin.left);

            plot_area.select('rect')
                .attr('width', width - margin.left - margin.right);

            var plotg = plot_area.append('g')
                .attr('width', width)
                .attr('height', height)
                .attr('transform', 'translate(' + (margin.left) + ',0)');
            this.addPoints(plotg, raw_Data, scatter_processed_data, height, width, violin_width, domain, range, xdomain, xAttr, yAttr, colorBy, legend, margin, cohort_set);

            // create y axis
            var y = d3.scale.linear()
                .range(range)
                .domain(domain);

            var yAxis = d3.svg.axis()
                .scale(y)
                .orient('left')
                .tickSize(-width, 0, 0);

            // create x axis
            var x = d3.scale.ordinal()
                .domain(xdomain)
                .rangeBands([0, width-(violin_width/2)]);
            var xAxis = d3.svg.axis()
                .scale(x)
                .ticks(xdomain.length)
                .orient('bottom')
                .tickSize(-height, 0, 0);

            // Axis used for panning
            var x2 = d3.scale.linear()
                .range([0, width])
                .domain([0, width]);
            var x2Axis = d3.svg.axis()
                .scale(x2)
                .ticks(xdomain.length)
                .tickFormat('')
                .orient('bottom');

            // Highlight the selected circles.
            var brushmove = function(p) {
                var sample_list = [];
                var e = brush.extent();

                var plot_id = $(svg[0]).parents('.plot').attr('id').split('-')[1];
                plot_area.selectAll("circle").classed("selected", function(d) {
                    return e[0][0] <= $(this).attr('cx') && $(this).attr('cx') <= e[1][0]
                        && e[0][1] <= d[yAttr] && d[yAttr] <= e[1][1]
                        && !$(this).is('.hidden');
                });
                var selected_samples = $('svg circle.selected');
                selected_samples.each(function(){ sample_list.push(this.id); });
                var patient_list = $.map(sample_list, function(d) { return d.substr(0, 12); })
                    .filter(function(item, i, a) { return i == a.indexOf(item); });

                sample_form_update(e, selected_samples.length, patient_list.length, sample_list);
            };

            // If the brush is empty, select all circles.
            var brushend = function() {
//                if (brush.empty()) plot_area.selectAll(".hidden").classed("hidden", false);
            };

            var brush = d3.svg.brush()
                .x(x)
                .y(y)
                .on('brushstart', function(){ svg.selectAll('.extent').style("fill", "rgba(40,130,50,0.5");})
                .on('brush', brushmove)
                .on('brushend', brushend);

            var zoomer = function() {
                svg.select('.x.axis').call(x2Axis);
                svg.select('.x.axis').attr('transform', 'translate(' + (d3.event.translate[0] + margin.left) + ',' + (height - margin.bottom) + ')').call(xAxis);
                plot_area.selectAll('circle').attr('transform', 'translate(' + d3.event.translate[0] + ',0)');
                violin_area.selectAll('.violin-plot').attr('transform', function(d, i) {
                    return 'translate(' + (i * violin_width + d3.event.translate[0] + margin.left) + ',0)';
                });
            };

            var zoom = d3.behavior.zoom()
                .x(x2)
                .on('zoom', zoomer);

            var zoom_area = svg.append('g')
                .attr('class', 'zoom_area')
                .append('rect')
                .attr('width', width)
                .attr('height', height)
                .style('opacity', '0');

            zoom_area.call(zoom);

            // append axes
            svg.append('g')
                .attr('class', 'y axis')
                .attr('transform', 'translate(' + margin.left + ',0)')
                .call(yAxis);

            svg.append('g')
                .attr('class', 'x axis')
                .attr('transform', 'translate(' + margin.left + ',' + (height - margin.bottom) + ')')
                .call(xAxis);

            // append axes labels
            svg.append('text')
                .attr('class', 'x label')
                .attr('text-anchor', 'middle')
                .attr('transform', 'translate(' + (view_width/2) + ',' + (height - 10) + ')')
                .text(xLabel);

            svg.append('text')
                .attr('class', 'y label')
                .attr('text-anchor', 'middle')
                .attr('transform', 'rotate(-90) translate(' + (-1 * (height/2)) + ',10)')
                .text(yLabel);

            var check_selection_state = function(obj) {
                if (obj) {

                    // Remove zoom area
                    svg.selectAll('.zoom_area').remove();

                    // Append new brush event listeners to plot area only
                    plot_area.append('g')
                        .attr('class', 'brush')
                        .call(brush)
                        .attr('width', width)
                        .attr('height', height)
                        .attr('transform', 'translate(' + margin.left + ',0)');
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
                    .attr('style', 'position:absolute; top: '+ (y(extent[1][1]) + 180)+'px; left:' +(x2(extent[1][0]) + 90)+'px;');

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

            function check_selection_state_wrapper(bool){
                check_selection_state(bool);
            }

            return {
                resize                : resize,
                check_selection_state : check_selection_state_wrapper
            }
        }
    };
});
