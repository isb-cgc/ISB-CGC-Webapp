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

        dataCounts: function(data, x_attr) {
            var counts = {};
            var samples = {};
            var results = [];

            for (var i = 0; i < data.length; i++) {
                var val = data[i][x_attr];
                if (counts.hasOwnProperty(val)) {
                    counts[val] += 1;
                    samples[val] += ',' + data[i]['sample_id'];
                } else {
                    counts[val] = 1;
                    samples[val] = data[i]['sample_id'];
                }
            }

            for (var key in counts) {
                results.push({'value': key, 'count': counts[key], 'samples': samples[key]});
            }
            return results;
        },
        createBarGraph: function(svg, raw_Data, width, height, bar_width,  x_attr, xLabel, tip, margin, legend) {
            var tip = d3tip()
                .attr('class', 'd3-tip')
                .direction('n')
                .offset([0, 0])
                .html(function(d) {
                    return d.count;
                });
            var data = this.dataCounts(raw_Data, x_attr);
            var plot_width = (bar_width+5) * data.length;

            var x = d3.scale.ordinal()
                .domain(data.map(function(d) { return d.value; }))
                .rangeRoundBands([0, plot_width], .1);
            var xAxis = d3.svg.axis()
                .scale(x)
                .orient('bottom');
            var y = d3.scale.linear()
                .range([height-margin.bottom-margin.top, 0])
                .domain([0, d3.max(data, function(d) { return d.count; })]);
            var yAxis = d3.svg.axis()
                .scale(y)
                .orient('left')
                .tickSize(-width + margin.right + margin.left, 0, 0);

            var zoomer = function() {
                svg.select('.x.axis').attr('transform', 'translate(' + (d3.event.translate[0]+margin.left) + ',' + (height - margin.bottom) + ')').call(xAxis);
                svg.selectAll('.x.axis text').style('text-anchor', 'end').attr('transform', 'translate(' + -15 + ',' + 10 + ') rotate(-90)');
                plot_area.selectAll('.bar').attr('transform', 'translate(' + d3.event.translate[0] + ',0)');
            };

            var x2 = d3.scale.linear()
                .range([0, width])
                .domain([0, width]);

            var zoom = d3.behavior.zoom()
                .x(x2)
                .on('zoom', zoomer);

            var zoom_area = svg.append('g')
                .attr('class', 'zoom_area')
                .append('rect')
                .attr('width', width)
                .attr('height', height)
                .style('opacity', '0');

            var plot_area = svg.append('g')
                .attr('clip-path', 'url(#plot_area_clip)');

            plot_area.append('clipPath')
                .attr('id', 'plot_area_clip')
                .append('rect')
                .attr({ width: width-margin.left - margin.right,
                        height: height-margin.top - margin.bottom})
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            plot_area.selectAll(".bar")
                .data(data)
                .enter().append("rect")
                    .attr("class", "bar")
                    .attr('data-samples', function(d) { return d['samples']; })
                    .attr("x", function(d) { return x(d.value) + margin.left; })
                    .attr("y", function(d) {
                        return y(d.count);
                    })
                    .attr('value', function(d) { return d.value; })
                    .attr("width", x.rangeBand())
                    .attr("height", function(d) { return height - margin.bottom - margin.top - y(d.count); })
                .on('mouseover.tip', tip.show)
                .on('mouseout.tip', tip.hide);

            var x_axis_area = svg.append('g')
                .attr('clip-path', 'url(#x_axis_area_clip)');

            x_axis_area.append('clipPath')
                .attr('id', 'x_axis_area_clip')
                .append('rect')
                .attr('height', margin.bottom+margin.top)
                .attr('width', width-margin.left-margin.right)
                .attr('transform', 'translate(' + margin.left + ',' + (height  - margin.bottom - margin.top) + ')');

            x_axis_area.append('g')
                .attr('class', 'x axis')
                .attr('transform', 'translate(' + margin.left + ',' + (height - margin.bottom - margin.top) + ')')
                .call(xAxis)
                .selectAll('text')
                .style('text-anchor', 'end')
                .attr('transform', 'translate(' + -15 + ',' + 10 + ') rotate(-90)');

            // Highlight the selected rectangles whenever the cursor is moved
            var brushmove = function(p) {
                var total_samples = 0;
                var total_patients = 0;
                var sample_list = [];
                var patient_list = [];
                var e = brush.extent();
                svg.selectAll('rect.bar').classed("selected", function (d) {
                    return e[0]-margin.left <= x($(this).attr('value')) + parseInt($(this).attr('width'))
                        && x($(this).attr('value')) <= e[1]-margin.left;
                });
                $('rect.bar.selected').each(function () {
                    var samples = $(this).attr('data-samples').split(',');
                    var patients = $.map(samples, function (d) {
                            return d.substr(0, 12);
                        })
                        .filter(function (item, i, a) {
                            return i == a.indexOf(item);
                        });
                    total_samples += samples.length;
                    total_patients += patients.length;
                    sample_list = sample_list.concat(samples);
                    patient_list = patient_list.concat(patients);
                });

                sample_form_update(e, total_samples, total_patients, sample_list);
            };

            // If the brush is empty, select all circles.
            var brushend = function() {
                if (brush.empty()) svg.selectAll(".hidden").classed("hidden", false);
            };

            var brush = d3.svg.brush()
                .x(x2)
                .on('brushstart', function(){ svg.selectAll('.extent').style("fill", "rgba(40,130,50,0.5");})
                .on('brush', brushmove)
                .on('brushend', brushend);

            svg.call(tip);

            // append axes
            svg.append('g')
                .attr('class', 'y axis')
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
                .call(yAxis);

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
                .text('Number of Samples');

            var check_selection_state = function(obj) {
                if (obj) {
                    // Remove zoom area
                    svg.selectAll('.zoom_area').remove();

                    if (svg.select('.brush').empty()) {
                        // Append new brush event listeners to plot area only
                        plot_area.append('g')
                            .attr('class', 'brush')
                            .call(brush)
                            .selectAll('rect')
                            .attr('y', 0)
                            .attr('height', height - margin.bottom)
                            .attr('transform', 'translate(0, 0)');
                    }
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

                    if (svg.select('.zoom_area').empty()) {
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
                    .attr('style', 'position:relative; top: -' + height + 'px; left:' + (x2(extent[1]) + 80) + 'px;');

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
