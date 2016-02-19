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
    return {
        data_totals: function(data, x_attr, y_attr, x_domain, y_domain) {
            var results_dict = {};
            var results = [];
            var x_item, y_item;
            var x_total = {};
            var y_total = {};

            for (x_item in x_domain) {
                x_total[x_domain[x_item]] = 0;
                for (y_item in y_domain) {
                    y_total[y_domain[y_item]] = 0;
                    results_dict[x_domain[x_item] + '-' + y_domain[y_item]] = {x: x_domain[x_item], y: y_domain[y_item], total: 0, samples: []};
                }
            }
            for (var i = 0; i < data.length; i++) {
                x_item = data[i][x_attr];
                y_item = data[i][y_attr];

                results_dict[x_item + '-' + y_item]['total']++;
                results_dict[x_item + '-' + y_item]['samples'].push(data[i]['sample_id']);

                x_total[x_item] += 1;
                y_total[y_item] += 1;
            }
            var total = data.length;

            for (var key in x_total) {
                x_total[key] /= total;
            }
            for (var key in y_total) {
                y_total[key] /= total;
            }

            for (var key in results_dict) {
                var x = results_dict[key]['x'];
                var y = results_dict[key]['y'];
                results_dict[key]['expected_total'] = x_total[x] * y_total[y] * total;
                if (results_dict[key]['expected_total'] == 0) {
                    results_dict[key]['ratio'] = 0;
                } else {
                    results_dict[key]['ratio'] = results_dict[key]['total'] / results_dict[key]['expected_total'];
                }
                if (results_dict[key]['ratio'] == 0) {
                    results_dict[key]['log_ratio'] = 0;
                } else {
                    results_dict[key]['log_ratio'] = Math.log(results_dict[key]['ratio']);
                }
                results.push(results_dict[key]);
            }
            return results;
        },
        create_cubbyplot: function(svg, data, domain, range, xLabel, yLabel, xParam, yParam, colourBy, legend, width, height, cubby_size) {
            var margin = {top: 10, bottom: 50, left: 50, right: 0};
            var colorVal = function(d) { return d[colorBy]; };
            var color = d3.scale.category20();
            var x_band_width = (width - margin.left) / domain.length;
            var y_band_width = (height - margin.left) / range.length;
            var view_width = 800;
            var view_height = 600;
            var data_counts = this.data_totals(data, xParam, yParam, domain, range);

            // create x axis
            var x = d3.scale.ordinal()
                .domain(domain)
                .rangeBands([margin.left, width]);
            var xAxis = d3.svg.axis()
                .scale(x)
                .ticks(domain.length)
                .orient('bottom');

            // create y axis
            var y = d3.scale.ordinal()
                .domain(range)
                .rangeBands([0, height-margin.bottom]);
            var yAxis = d3.svg.axis()
                .scale(y)
                .ticks(range.length)
                .orient('left');

            // function for the x grid lines
            function make_x_axis() {
                return d3.svg.axis()
                    .scale(x)
                    .orient("bottom");
            }

            // function for the y grid lines
            function make_y_axis() {
                return d3.svg.axis()
                    .scale(y)
                    .orient("left");
            }

            // Create Clip area for axes
            var y_axis_area = svg.append('g')
                .attr('clip-path', 'url(#y_axis_area_clip)');

            y_axis_area.append('clipPath')
                .attr('id', 'y_axis_area_clip')
                .append('rect')
                .attr('height', view_height-margin.top-margin.bottom)
                .attr('width', margin.left)
                .attr('transform', 'translate(' + 0 + ',0)');

            var x_axis_area = svg.append('g')
                .attr('clip-path', 'url(#x_axis_area_clip)');

            if (height < view_height) {
                x_axis_area.append('clipPath')
                    .attr('id', 'x_axis_area_clip')
                    .append('rect')
                    .attr('height', margin.bottom+margin.top)
                    .attr('width', width-margin.left-margin.right)
                    .attr('transform', 'translate(' + margin.left + ',' + (height  - margin.bottom) + ')');

                x_axis_area.append('g')
                    .attr('class', 'x axis')
                    .attr('transform', 'translate(0,' + (height - margin.bottom) + ')')
                    .call(xAxis);
            } else {
                x_axis_area.append('clipPath')
                    .attr('id', 'x_axis_area_clip')
                    .append('rect')
                    .attr('height', margin.bottom+margin.top)
                    .attr('width', width-margin.left-margin.right)
                    .attr('transform', 'translate(' + margin.left + ',' + (view_height-margin.top-margin.bottom) + ')');
                x_axis_area.append('g')
                    .attr('class', 'x axis')
                    .attr('transform', 'translate(0,' + (view_height-margin.bottom-margin.top) + ')')
                    .call(xAxis);
            }

            // append axes
            y_axis_area.append('g')
                .attr('class', 'y axis')
                .attr('transform', 'translate(' + margin.left + ',0)')
                .call(yAxis)
                .selectAll('text')
                .style('text-anchor', 'middle')
                .attr('dy', -10)
                .attr('transform', 'rotate(-90)');

            var plot_area = svg.append('g')
                .attr('clip-path', 'url(#plot_area_clip)');

            plot_area.append('clipPath')
                .attr('id', 'plot_area_clip')
                .append('rect')
                .attr('height', view_height-margin.top-margin.bottom)
                .attr('width', view_width)
                .attr('transform', 'translate(' + margin.left + ',0)');

            if (height < view_height) {
                plot_area.append("g")
                    .attr("class", "x grid")
                    .attr('transform', 'translate(' +  x_band_width/2 + ',' + (height - margin.bottom) + ')')
                    .call(make_x_axis()
                        .tickSize(-height-margin.bottom, 0, 0)
                        .tickFormat("")
                    );
            } else {
                plot_area.append("g")
                    .attr("class", "x grid")
                    .attr('transform', 'translate(' +  x_band_width/2 + ',' + (view_height - margin.bottom) + ')')
                    .call(make_x_axis()
                        .tickSize(-view_height, 0, 0)
                        .tickFormat("")
                    );
            }
            // append grid lines
            plot_area.append("g")
                .attr("class", "y grid")
                .attr('transform', 'translate(' + margin.left + ',' + y_band_width/2+ ')')
                .call(make_y_axis()
                    .tickSize(-width, 0, 0)
                    .tickFormat("")
                );

            // Create secondary axes used for panning
            var x2 = d3.scale.linear()
                .range([0, width])
                .domain([0, width]);
            var x2Axis = d3.svg.axis()
                .scale(x2)
                .ticks(domain.length)
                .tickFormat('');
            var y2 = d3.scale.linear()
                .range([0, width])
                .domain([0, width]);
            var y2Axis = d3.svg.axis()
                .scale(y2)
                .ticks(range.length)
                .tickFormat('');

            var zoom_x = function() {
                svg.select('.x.axis').attr('transform', 'translate(' + d3.event.translate[0] + ',' + (height - margin.bottom) + ')').call(xAxis);
                svg.select('.x.grid').attr('transform', 'translate(' + (d3.event.translate[0] + x_band_width/2) + ',0)');
                plot_area.selectAll('.expected_fill').attr('transform', 'translate(' + d3.event.translate[0] + ',0)');
                plot_area.selectAll('text').attr('transform', 'translate(' + d3.event.translate[0] + ',0)');
            };

            var zoom_y = function() {
                svg.select('.y.axis').attr('transform', 'translate(' + margin.left + ',' + (d3.event.translate[1]) + ')')
                    .call(yAxis)
                    .selectAll('text')
                    .style('text-anchor', 'middle')
                    .attr('dy', -10);
                svg.select('.y.grid').attr('transform', 'translate(' + margin.left + ',' + (d3.event.translate[1] + y_band_width/2) + ')');
                plot_area.selectAll('.expected_fill').attr('transform', 'translate(' + 0 + ',' + d3.event.translate[1] + ')');
                plot_area.selectAll('text').attr('transform', 'translate(' + 0 + ',' + d3.event.translate[1] + ')');
            };

            var zoom_xy = function() {
                if (height < view_height) {
                    svg.select('.x.axis').attr('transform', 'translate(' + d3.event.translate[0] + ',' + (height - margin.bottom) + ') scale(' + d3.event.scale + ',' + d3.event.scale + ')').call(xAxis);
                } else {
                    svg.select('.x.axis').attr('transform', 'translate(' + d3.event.translate[0] + ',' + (view_height - margin.top - margin.bottom) + ') scale(' + d3.event.scale + ',' + d3.event.scale + ')').call(xAxis);
                }
                svg.select('.x.grid').attr('transform', 'translate(' + (d3.event.translate[0] + x_band_width/2) + ',0) scale(' + d3.event.scale + ',' + d3.event.scale + ')');
                svg.select('.y.axis').attr('transform', 'translate(' + margin.left + ',' + (d3.event.translate[1]) + ') scale(' + d3.event.scale + ',' + d3.event.scale + ')')
                    .call(yAxis)
                    .selectAll('text')
                    .style('text-anchor', 'middle')
                    .attr('dy', -10);
                svg.select('.y.grid').attr('transform', 'translate(' + margin.left + ',' + (d3.event.translate[1] + (y_band_width*d3.event.scale)/2) + ') scale(' + d3.event.scale + ',' + d3.event.scale + ')');
                plot_area.selectAll('.expected_fill').attr('transform', 'translate(' + d3.event.translate[0] + ',' + d3.event.translate[1] + ') scale(' + d3.event.scale + ',' + d3.event.scale + ')');
                plot_area.selectAll('text').attr('transform', 'translate(' + d3.event.translate[0] + ',' + d3.event.translate[1] + ') scale(' + d3.event.scale + ',' + d3.event.scale + ')');
            };

            var zoom = d3.behavior.zoom();

            if (width > view_width && height> view_height) {
                zoom = d3.behavior.zoom()
                    .x(x2)
                    .y(y2)
                    .on('zoom', zoom_xy);
            } else if (width > view_width) {
                zoom = d3.behavior.zoom()
                    .x(x2)
                    .on('zoom', zoom_x);
            } else if (height > view_height) {
                zoom = d3.behavior.zoom()
                    .y(y2)
                    .on('zoom', zoom_y);
            }

            var zoom_area = svg.append('g')
                .attr('class', 'zoom_area')
                .append('rect')
                .attr('width', width)
                .attr('height', height)
                .style('opacity', '0');

            zoom_area.call(zoom);

            var tip = d3tip()
                    .attr('class', 'd3-tip')
                    .direction('n')
                    .offset([0, 0])
                    .html(function(d) {
                    return '<span>log<sub>2</sub>(true counts / expected counts)</span><br/>'
                            + '<span>log<sub>2</sub>(' + d['total'] + ' / ' + d['expected_total'].toFixed(4) + ')</span>'
                    });

            plot_area.selectAll('.expected_fill')
                .data(data_counts)
                .enter().append('rect')
                .attr('class', 'expected_fill')
                .attr('data-samples', function(d) { return d['samples']; })
                .attr('fill', function(d) { return d['log_ratio'] > 0 ? 'red' : 'blue'; })
                .attr('fill-opacity', function(d) { return Math.abs(d['log_ratio']); })
                .attr('width', cubby_size + 1)
                .attr('height', cubby_size)
                .attr('x', function(d) { return x(d['x']) + 1; })
                .attr('y', function(d) { return y(d['y']); })
                .on('click', function() {
                    var obj_class = $(this).attr('class');
                    if (obj_class.indexOf('selected') >= 0) {
                        obj_class = obj_class.replace(' selected', '');
                    } else {
                        obj_class += ' selected';
                    }
                    $(this).attr('class', obj_class);
                    var total_samples = 0;
                    var total_patients = 0;
                    var sample_list = [];
                    var plot_id = $(svg[0]).parents('.plot').attr('id').split('-')[1];
                    $('rect.expected_fill.selected').each(function() {
                        var samples = $(this).attr('data-samples').split(',');
                        total_samples += samples.length;
                        total_patients += $.map(samples, function(d) { return d.substr(0,12); })
                            .filter(function(item, i, a) { return i == a.indexOf(item) }).length;
                        sample_list = sample_list.concat(samples);
                    });

                    //.on('brushstart', function(){ svg.selectAll('.extent').style("fill", "rgba(40,130,50,0.5");})
                    sample_form_update({}, total_samples, total_patients, sample_list);
                });

            plot_area.selectAll('.counts')
                .data(data_counts)
                .enter().append('text')
                .attr('class', 'counts')
                .attr('x', function(d) { return x(d['x']) + x_band_width/2; })
                .attr('y', function(d) { return y(d['y']) + y_band_width/2; })
                .attr('font-family', 'sans-serif')
                .attr('font-size', '20px')
                .attr('fill', 'black')
                .attr('text-anchor', 'middle')
                .text(function(d) { return d['total']; });

            plot_area.selectAll('.expected_counts')
                .data(data_counts)
                .enter().append('text')
                .attr('class', 'expected_counts')
                .attr('x', function(d) { return x(d['x']) + 25; })
                .attr('y', function(d) { return y(d['y']) + 20; })
                .attr('font-family', 'sans-serif')
                .attr('font-size', '14px')
                .attr('fill', 'black')
                .attr('text-anchor', 'middle')
                .text(function(d) { return d['log_ratio'].toFixed(3); })
                .on('mouseover.tip', tip.show)
                .on('mouseout.tip', tip.hide);

            plot_area.call(tip);

            // append axes labels
            svg.append('text')
                .attr('class', 'x label')
                .attr('text-anchor', 'middle')
                .attr('transform', 'translate(' + (view_width/2) + ',' + (view_height - 10) + ')')
                .text(xLabel);

            svg.append('text')
                .attr('class', 'y label')
                .attr('text-anchor', 'middle')
                .attr('transform', 'rotate(-90) translate(' + (-1 * (view_height/2)) + ',10)')
                .text(yLabel);

            var check_selection_state = function(obj) {
                if (obj) {
                    // Remove zoom area
                    svg.selectAll('.zoom_area').remove();
                } else {
                    var plot_id = $(svg[0]).parents('.plot').attr('id').split('-')[1];
                    // Clear selections
                    $(svg[0]).parents('.plot').find('.selected-samples-count').html('Number of Samples: ' + 0);
                    $(svg[0]).parents('.plot').find('.selected-patients-count').html('Number of Participants: ' + 0);
                    $('#save-cohort-'+plot_id+'-modal input[name="samples"]').attr('value', []);
                    svg.selectAll('.selected').classed('selected', false);
                    $(svg[0]).parents('.plot').find('.save-cohort-card').hide();


                    // Append new zoom area
                    zoom_area = svg.append('g')
                        .attr('class', 'zoom_area')
                        .append('rect')
                        .attr('width', width)
                        .attr('height', height)
                        .style('opacity', 0);

                    // Register zoom event listeners
                    // zoom.on('zoom', zoom_x);
                    zoom_area.call(zoom);
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
                    .attr('style', 'position:absolute; top: 800px; left: 30px;');

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
