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
        create_scatterplot: function(svg, data, domain, range, xLabel, yLabel, xParam, yParam, colorBy, legend, width, height, cohort_set) {
            var margin = {top: 10, bottom: 50, left: 50, right: 10};
            var yVal = function(d) {
                    if (d[yParam] && d[yParam] != 'NA') {
                        return d[yParam];
                    } else {
                        d[yParam] = range[1];
                        return range[1];
                    }
                };

            var yScale = d3.scale.linear().range([height-margin.bottom, margin.top]).domain(range);
            var yMap = function(d) { if(typeof(Number(d.y)) == "number"){return yScale(yVal(d));} else { return 0;}};
            var yAxis = d3.svg.axis()
                    .scale(yScale)
                    .orient("left")
                    .tickSize(-width - margin.left - margin.right, 0, 0);

            var xVal = function(d) {
                    if (d[xParam] && d[xParam] != 'NA') {
                        return d[xParam];
                    } else {
                        d[xParam] = domain[1];
                        return domain[1];
                    }
                };

            var xScale = d3.scale.linear().range([margin.left, width]).domain(domain);
            var xMap = function(d) {if(typeof(Number(d.x)) == "number"){return xScale(xVal(d));} else { return 0;}};
            var xAxis = d3.svg.axis()
                    .scale(xScale)
                    .orient("bottom")
                    .tickSize(-height - margin.top - margin.bottom, 0, 0);

            var colorVal = function(d) {
                if (colorBy == 'cohort') {
                    return d['cohort'][0];
                }
                return d[colorBy];
            };
            var name_domain = $.map(data, function(d) {
                return d[colorBy];
            });
            var color = d3.scale.ordinal()
                .domain(name_domain)
                .range(helpers.color_map(name_domain.length));

            var plot_area = svg.append('g')
                .attr('clip-path', 'url(#plot_area_clip)');

            plot_area.append('clipPath')
                .attr('id', 'plot_area_clip')
                .append('rect')
                .attr('height', height-margin.top-margin.bottom)
                .attr('width', width)
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            // Highlight the selected circles.
            var brushmove = function(p) {
                var sample_list = [];
                var e = brush.extent();

                var plot_id = $(svg[0]).parents('.plot').attr('id').split('-')[1];
                svg.selectAll("circle").classed("selected", function(d) {
                    return e[0][0] <= d[xParam] && d[xParam] <= e[1][0]
                        && e[0][1] <= d[yParam] && d[yParam] <= e[1][1]
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
//                if (brush.empty()) svg.selectAll(".hidden").classed("hidden", false);
            };

            var brush = d3.svg.brush()
                .x(xScale)
                .y(yScale)
                .on('brushstart', function(){ svg.selectAll('.extent').style("fill", "rgba(40,130,50,0.5");})
                .on('brush', brushmove)
                .on('brushend', brushend);

            var transformer = function(d) {
                return 'translate(' + xMap(d) + ',' + yMap(d) + ')';
            };

            var zoomer = function() {
                svg.select('.x.axis').call(xAxis);
                svg.select('.y.axis').call(yAxis);
                plot_area.selectAll('circle').attr('transform', transformer);
            };

            var zoom = d3.behavior.zoom()
                .x(xScale)
                .y(yScale)
                .on('zoom', zoomer);

            var zoom_area = svg.append('g')
                .attr('class', 'zoom_area')
                .append('rect')
                .attr('width', width)
                .attr('height', height)
                .style('opacity', '0')
                .call(zoom);

            plot_area.selectAll('.dot')
                .data(data)
                .enter().append('circle')
                .attr('class', function(d) { return d[colorBy]; })
                .style('fill', function(d) { return color(colorVal(d)); })
                .attr('transform', transformer)
                .attr('r', 2)
                .attr('id', function(d) { return d['sample_id']; });

            // append axes
            svg.append('g')
                .attr('class', 'y axis')
                .attr('transform', 'translate(' + margin.left + ',0)')
                .call(yAxis);

            svg.append('g')
                .attr('class', 'x axis')
                .attr('transform', 'translate(0,' + (height - margin.bottom) + ')')
                .call(xAxis);

            // append axes labels
            svg.append('text')
                .attr('class', 'x label')
                .attr('text-anchor', 'middle')
                .attr('transform', 'translate(' + (width/2) + ',' + (height - 10) + ')')
                .text(xLabel);

            svg.append('text')
                .attr('class', 'y label')
                .attr('text-anchor', 'middle')
                .attr('transform', 'rotate(-90) translate(' + (-1 * (height/2)) + ',10)')
                .text(yLabel);

            var legend_item_height = 28;

            legend = legend.attr('height', legend_item_height * color.domain().length + 30);
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

            var check_selection_state = function(obj) {
                if (obj) {

                    // Remove zoom area
                    svg.selectAll('.zoom_area').remove();

                    // Append new brush event listeners to plot area only
                    plot_area.append('g')
                        .attr('class', 'brush')
                        .call(brush);
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
                        .style('opacity', '0')
                        .call(zoom);

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
                    .attr('style', 'position:absolute; top: '+ (yScale(extent[1][1]) + 180) +'px; left:' +(xScale(extent[1][0])+ 40)+'px;');

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
