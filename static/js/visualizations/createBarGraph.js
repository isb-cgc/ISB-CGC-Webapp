/**
 *
 * Copyright 2016, Institute for Systems Biology
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

define(['jquery', 'd3', 'd3tip', 'd3textwrap', 'vizhelpers', 'underscore'],
    function ($, d3, d3tip, d3textwrap, vizhelpers, _) {

        // The samples in our data, bucketed by their corresponding
        // bar graph value
        var sampleSet = {};

        // The currently selected values on the bar graph, corresponding to the buckets
        // in the sampleSet
        var selectedValues = {};

        // The samples found in the selected value buckets; this is used to produce the JSON which
        // is submitted by the form
        var selectedSamples = null;

        // If you want to override the tip coming in from the create call,
        // do it here
        var tip = d3tip()
            .attr('class', 'd3-tip')
            .direction('n')
            .offset([0, 0])
            .html(function (d) {
                return d.value + ': ' + d.count;
            });

        var selex_active = false;
        var zoom_status = {
            translation: null,
            scale: null
        };

        return {

            dataCounts: function (data, x_attr) {
                var counts = {};
                var results = [];

                for (var i = 0; i < data.length; i++) {
                    var val = data[i][x_attr];
                    if (!counts[val]) {
                        counts[val] = 0;
                    }
                    counts[val] += 1;

                    if (!sampleSet[val]) {
                        sampleSet[val] = {
                            samples: {},
                            cases: new Set([])
                        };
                    }

                    sampleSet[val].samples['{' + data[i]['sample_id'] + '}{' + data[i]['case_id'] + '}'] = {
                        sample: data[i]['sample_id'],
                        case: data[i]['case_id'],
                        project: data[i]['project']
                    };
                    sampleSet[val].cases.add(data[i]['case_id']);
                }

                for (var key in counts) {
                    results.push({'value': key, 'count': counts[key]});
                }

                return results;
            },
            createBarGraph: function (svg, raw_Data, width, height, bar_width, x_attr, xLabel, margin, legend) {
                var data = this.dataCounts(raw_Data, x_attr);
                var plot_width = (bar_width + 5) * data.length;
                var view_plot_width = plot_width < width - margin.left - margin.right ? width - margin.left - margin.right : plot_width;

                if (width < plot_width + margin.left + margin.right) {
                    svg.attr('width', plot_width + margin.left + margin.right);
                }

                var x = d3.scale.ordinal()
                    .domain(data.map(function (d) {
                        return d.value;
                    }))
                    .rangeBands([0, plot_width], .1);
                var xAxis = d3.svg.axis()
                    .scale(x)
                    .orient('bottom');
                var y = d3.scale.linear()
                    .range([height - margin.bottom - margin.top, 0])
                    .domain([0, d3.max(data, function (d) {
                        return d.count;
                    })])
                    .nice();
                var yAxis = d3.svg.axis()
                    .scale(y)
                    .orient('left')
                    .tickSize(-view_plot_width, 0, 0);
                var zoomer = function () {
                    if (!selex_active) {
                        svg.select('.x.axis')
                            .attr('transform', 'translate(' + (d3.event.translate[0] + margin.left) + ',' + (height - margin.bottom) + ')')
                            .call(xAxis.scale(x.rangeBands([0, plot_width * d3.event.scale], 0.1)));
                        plot_area.selectAll('.plot-bar').attr('transform', 'translate(' + d3.event.translate[0] + ',0) scale(' + d3.event.scale + ', 1)');
                        x3.range([0, plot_width*d3.event.scale]);
                    }
                };

                var x2 = d3.scale.linear()
                    .range([0, view_plot_width])
                    .domain([0, view_plot_width]);
                var x3 = d3.scale.linear()
                    .range([0, plot_width])
                    .domain([0, plot_width]);

                var min_scale = 18 / bar_width;
                var max_scale = 1.5;
                var zoom = d3.behavior.zoom()
                    .x(x2)
                    .scaleExtent([min_scale, max_scale])
                    .on('zoom', zoomer);

                svg.call(zoom);
                var worksheet_id = $('.worksheet.active').attr('id');
                var plot_area_clip_id = 'plot_area_clip_' + worksheet_id;
                var plot_area = svg.append('g')
                    .attr('clip-path', 'url(#' + plot_area_clip_id + ')')
                    .attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');

                plot_area.append('clipPath')
                    .attr('id', plot_area_clip_id)
                    .append('rect')
                    .attr({
                        width: view_plot_width,
                        height: height - margin.top - margin.bottom
                    });

                plot_area.selectAll(".plot-bar")
                    .data(data)
                    .enter().append("rect")
                    .attr("class", "plot-bar")
                    .attr("x", function (d) {
                        return x(d.value);
                    })
                    .attr("y", function (d) {
                        return y(d.count);
                    })
                    .attr('value', function (d) {
                        return d.value;
                    })
                    .attr("width", x.rangeBand())
                    .attr("height", function (d) {
                        return height - margin.bottom - margin.top - y(d.count);
                    })
                    .on('mouseover.tip', tip.show)
                    .on('mouseout.tip', tip.hide);

                var x_axis_area_clip_id = 'x_axis_area_clip_' + worksheet_id;
                var x_axis_area = svg.append('g')
                    .attr('clip-path', 'url(#' + x_axis_area_clip_id + ')');

                x_axis_area.append('clipPath')
                    .attr('id', x_axis_area_clip_id)
                    .append('rect')
                    .attr('height', margin.bottom)
                    .attr('width', view_plot_width)
                    .attr('transform', 'translate(' + margin.left + ',' + (height - margin.bottom) + ')');
                x_axis_area.append('g')
                    .attr('class', 'x axis')
                    .attr('transform', 'translate(' + margin.left + ',' + (height - margin.bottom) + ')')
                    .call(xAxis);

                var x_axis_area_height = margin.bottom - 55;
                svg.select('.x.axis').selectAll('text').each(function () {
                    var d = d3.select(this);
                    var label = d.text();
                    var parent = d3.select(d.node().parentNode);
                    d.remove();
                    var fOb = parent.append('foreignObject')
                        .attr('requiredFeatures', 'http://www.w3.org/TR/SVG11/feature#Extensibility')
                        .attr('width', x_axis_area_height)
                        .attr('height', bar_width);

                    fOb.append('xhtml:div')
                        .style('height', bar_width)
                        .style('width', x_axis_area_height)
                        .attr('class', 'truncated-single')
                        .attr('title', label)
                        .html(label);
                });

                svg.select('.x.axis').selectAll('foreignObject').attr('style', 'transform: translate(-15px,' + (x_axis_area_height + 10) + 'px) rotate(-90deg);');

                // Highlight the selected rectangles whenever the cursor is moved
                var brushmove = function (p) {
                    var e = brush.extent();
                    var reCalc = false;
                    var oldSet = selectedValues;
                    selectedValues = {};
                    svg.selectAll('rect.plot-bar').classed("selected", function (d) {
                        return x3(e[0]) <= x($(this).attr('value')) + $(this).attr('width') / 2
                            && (x($(this).attr('value')) + $(this).attr('width') / 2) <= x3(e[1]);
                    });

                    if (Object.keys(oldSet).length !== $('.worksheet.active rect.plot-bar.selected').length) {
                        reCalc = true;
                    }

                    $('.worksheet.active rect.plot-bar.selected').each(function () {
                        if (!oldSet[$(this).attr('value')]) {
                            reCalc = true;
                        }
                        selectedValues[$(this).attr('value')] = 1;
                    });

                    var oldSetKeys = Object.keys(oldSet);
                    for (var i = 0; i < oldSetKeys.length && !reCalc; i++) {
                        if (!selectedValues[oldSet[oldSetKeys[i]]]) {
                            reCalc = true;
                        }
                    }

                    sample_form_update(e, reCalc);
                };

                // If the brush is empty, select all circles.
                var brushend = function () {
                    if (brush.empty()) {
                        svg.selectAll(".hidden").classed("hidden", false);
                        $('.worksheet.active .save-cohort-card').hide();
                    }
                };

                var brush = d3.svg.brush()
                    .x(x2)
                    .on('brushstart', function (d) {
                        var e = brush.extent();
                        if(!e){
                            selectedValues = {};
                            selectedSamples = null;
                            sample_form_update(e, true);
                        }
                    })
                    .on('brush', brushmove)
                    .on('brushend', brushend);

                svg.call(tip);

                // append axes
                svg.append('g')
                    .attr('class', 'y axis')
                    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
                    .call(yAxis);

                // append axes labels
                svg.append('g')
                    .attr('class', 'x-label-container')
                    .append('text')
                    .attr('class', 'x label axis-label')
                    .attr('text-anchor', 'middle')
                    .attr('transform', 'translate(' + (view_plot_width / 2) + ',' + (height - 10) + ')')
                    .text(xLabel);


                svg.append('text')
                    .attr('class', 'y label axis-label')
                    .attr('text-anchor', 'middle')
                    .text('Number of Samples')
                    .attr('transform', 'rotate(-90) translate(' + (-height - margin.top + margin.bottom) / 2 + ', 20)');

                var check_selection_state = function (obj) {

                    selex_active = !!obj;

                    if (obj) {
                        // Disable zooming events and store their status
                        svg.on('.zoom', null);
                        zoom_status.translation = zoom.translate();
                        // Append new brush event listeners to plot area only
                        plot_area.append('g')
                            .attr('class', 'brush')
                            .call(brush)
                            .selectAll('rect')
                            .attr('y', 0)
                            .attr('height', height - margin.bottom)
                            .attr('transform', 'translate(0, 0)');
                    } else {
                        // Resume zooming, restoring the zoom's last state
                        svg.call(zoom);
                        zoom_status.translation && zoom.translate(zoom_status.translation);
                        zoom_status.translation = null;

                        // Clear selections
                        $('.worksheet.active .plot').find('.selected-samples-count').html('Number of Samples: ' + 0);
                        $('.worksheet.active .plot').find('.selected-patients-count').html('Number of Cases: ' + 0);
                        $('.worksheet.active .save-cohort-form input[name="samples"]').attr('value', "");
                        svg.selectAll('.selected').classed('selected', false);
                        $('.worksheet.active .save-cohort-card').hide();
                        selectedValues = {};
                        selectedSamples = null;
                        // Remove brush event listener plot area - comment out if we want to enable selection carry-over
                        brush.clear();
                        plot_area.selectAll('.brush').remove();
                    }
                };

                //Update the sample cohort bar update
                function sample_form_update(extent, reCalc) {

                    if (reCalc) {
                        var case_set = {};
                        selectedSamples = {};
                        _.each(Object.keys(selectedValues), function (val) {
                            _.each(Object.keys(sampleSet[val]['samples']), function (sample) {
                                selectedSamples[sample] = sampleSet[val]['samples'][sample];
                                case_set[sampleSet[val]['samples'][sample]['case']] = 1;
                            });
                        });

                        $('.worksheet.active .plot').find('.selected-samples-count').html('Number of Samples: ' + Object.keys(selectedSamples).length);
                        $('.worksheet.active .plot').find('.selected-patients-count').html('Number of Cases: ' + Object.keys(case_set).length);
                        $('.worksheet.active .save-cohort-card').find('.btn').prop('disabled', (Object.keys(selectedSamples).length <= 0));
                    }

                    if (extent) {
                        var leftVal = Math.min((x3(extent[1]) + 20), (width - $('.worksheet.active .save-cohort-card').width()));
                        $('.worksheet.active .save-cohort-card').show()
                            .attr('style', 'position:relative; top: -' + height + 'px; left:' + leftVal + 'px;');

                    }

                }

                function resize() {
                    width = svg.node().parentNode.offsetWidth - 10;
                    //TODO resize plot
                }

                function check_selection_state_wrapper(bool) {
                    check_selection_state(bool);
                }

                $('.worksheet.active .save-cohort-card').find('.btn').on('click', function (e) {
                    if (Object.keys(selectedValues).length > 0) {
                        var selected_sample_set = [];
                        _.each(Object.keys(selectedSamples), function (sample) {
                            selected_sample_set.push(selectedSamples[sample]);
                        });

                        $('.worksheet.active .save-cohort-form input[name="samples"]').attr('value', JSON.stringify(selected_sample_set));
                    }
                });

                function get_json_data() {
                    var p_data = {};
                    data.map(function (d, i) {
                        p_data[i] = d;
                    });
                    return p_data;
                }

                function get_csv_data() {
                    var csv_data = "value, count\n";
                    data.map(function (d) {
                        csv_data += d['value'] + ', ' + d['count'] + '\n';
                    });
                    return csv_data;
                }

                return {
                    get_json: get_json_data,
                    get_csv: get_csv_data,
                    resize: resize,
                    check_selection_state: check_selection_state_wrapper
                }
            }
        };
    });
