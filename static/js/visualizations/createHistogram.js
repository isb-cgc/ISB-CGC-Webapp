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
    function($, d3, d3tip, d3textwrap, helpers, _) {

    var svg;
    var margin;
    var width;
    var height;
    var x;
    var xAxis;
    var y;
    var yAxis;
    var min_n;
    var max_n;

    // The samples in our data, bucketed by their corresponding
    // histogram bin
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
            .html(function(d) {
                var mean = 0;
                for (var i = 0; i < d.length; i++) {
                    mean += parseFloat(d[i]);
                }
                mean /= d.length;
                return '<span>' +  Number(d.x).toFixed(2) + ' ('+(d.y * 100).toFixed(2) + '%)</span><br/><span>Mean: ' + mean.toFixed(2) + '</span>';
            });

    var selex_active = false;
    var zoom_status = {
        translation: null,
        scale: null
    };

    return {
        createHistogramPlot : function (svg_param, raw_Data, values_only, width_param, height_param, x_attr, xLabel, margin_param, legend) {

            var nonNullData = [];

            raw_Data.map(function(d){
                if(helpers.isValidNumber(d.x)) {
                    nonNullData.push(d);
                }
            });

            if(nonNullData.length <= 0) {
                return null;
            }

            svg    = svg_param;
            width  = width_param;
            height = height_param;
            margin = margin_param;

            var num_bins = Math.ceil(Math.sqrt(raw_Data.length));
            var hist_data = d3.layout.histogram()
                .bins(num_bins)
                .frequency(false)(values_only);
            var tmp = helpers.get_min_max(raw_Data, x_attr);
            min_n = tmp[0];
            max_n = tmp[1];
            var h_padding = (max_n - min_n) * .05 || 0.05;

            var band_width = 50;
            if(num_bins > 10){
                band_width = (width-margin.left-margin.right)/num_bins;
            }

            x = d3.scale.linear()
                .range([margin.left, width - margin.right])
                .domain([min_n-h_padding, max_n+h_padding]);

            xAxis = d3.svg.axis()
                .scale(x)
                .orient('bottom');

            var y_max = d3.max(hist_data, function(d){
                    return d.y;
                });
            var v_padding = y_max*.05;
            y = d3.scale.linear()
                .range([height - margin.bottom - margin.top, 0])
                .domain([0, y_max + v_padding]);

            yAxis = d3.svg.axis()
                .scale(y)
                .orient('left')
                .tickFormat(d3.format(".1%"))
                .tickSize(-width + margin.right + margin.left, 0, 0);

            var zoomer = function () {
                if(!selex_active) {
                    svg.select('.x.axis').call(xAxis);
                    svg.select('.y.axis').call(yAxis);
                    plot_area.selectAll('.plot-bar').attr('transform', 'translate(' + d3.event.translate[0] + ',' + d3.event.translate[1] + ')scale(' + d3.event.scale + ',' + d3.event.scale + ')');
                    plot_area.selectAll('path.line').attr('transform', 'translate(' + d3.event.translate[0] + ',' + d3.event.translate[1] + ')scale(' + d3.event.scale + ',' + d3.event.scale + ')');
                }
            };

            var zoom = d3.behavior.zoom()
                .x(x)
                .y(y)
                .on('zoom', zoomer);

            svg.call(zoom);

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
                var val = hist_data[i].x;
                if(!sampleSet[val]) {
                    sampleSet[val] = {
                        samples: {},
                        cases: new Set([])
                    };
                }

                for (var j = 0; j < hist_data[i].length; j++) {
                    var data = sorted[sample_index];
                    sampleSet[val].samples['{'+data['sample_id']+'}{'+data['case_id']+'}'] = {sample: data['sample_id'], case: data['case_id'], project: data['project']};
                    sampleSet[val].cases.add(data['case_id']);
                    sample_index++;
                }
            }

            var worksheet_id = $('.worksheet.active').attr('id');
            var plot_area_clip_id = 'plot_area_clip_' + worksheet_id;
            var plot_area = svg.append('g')
                .attr('clip-path', 'url(#'+plot_area_clip_id+')')
                .attr('transform','translate(0,'+margin.top+')');
            var band_padding = 2;
            plot_area.append('clipPath')
                .attr('id', plot_area_clip_id)
                .append('rect')
                .attr({ width: width - margin.left - margin.right,
                    height: height - margin.top - margin.bottom})
                .attr('transform', 'translate(' + margin.left + ',0)');

            plot_area.selectAll(".plot-bar")
                .data(hist_data)
                .enter().append("rect")
                .attr("class", "plot-bar")
                .attr("x", function (d) {
                    return x(d.x)-band_width/2+band_padding;
                })
                .attr("y", function (d) {
                    return y(d.y);
                })
                .attr("value", function(d) {
                    return d.x;
                })
                .attr("width", function(d) {
                    return band_width-band_padding*2;
                })
                .attr("height", function (d) {
                    return height - margin.top - margin.bottom - y(d.y);
                })
                .on('mouseover.tip', tip.show)
                .on('mouseout.tip', tip.hide);

            // Select the samples as the selection area is sized
            var brushmove = function (p) {
                var reCalc = false;
                var e = brush.extent();
                var oldSet = selectedValues;
                selectedValues = {};

                svg.selectAll('rect.plot-bar').classed("selected", function (d) {
                    return e[0] <= (d['x'] + d['dx']) && d['x'] <= e[1];
                });

                var oldSetKeys = Object.keys(oldSet);
                if(oldSetKeys.length !== $('rect.plot-bar.selected').length) {
                    reCalc = true;
                }

                $('rect.plot-bar.selected').each(function () {
                    if(!oldSet[$(this).attr('value')]) {
                        reCalc = true;
                    }
                    selectedValues[$(this).attr('value')] = 1;
                });

                for(var i=0; i<oldSetKeys.length && !reCalc; i++) {
                    if(!selectedValues[oldSet[oldSetKeys[i]]]) {
                        reCalc = true;
                    }
                }

                sample_form_update(e, reCalc);
            };

            // If the brush's selection area was empty, hide the selection card and unhide anything
            // which was hidden
            var brushend = function () {
                if (brush.empty()) {
                    svg.selectAll(".hidden").classed("hidden", false);
                    $(svg[0]).parents('.plot').find('.save-cohort-card').hide();
                }
            };

            var brush = d3.svg.brush()
                .x(x)
                .on('brushstart',function(e){
                    selectedValues = {};
                    selectedSamples = null;
                })
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
            var xAxisXPos = (parseInt(svg.attr('width')>width ? width : svg.attr('width'))+margin.left)/2;
            var xAxisYPos = parseInt(svg.attr('height')>height ? height : svg.attr('height')-margin.bottom/2);
            svg.append('g')
                .attr('class','x-label-container')
                .append('text')
                .attr('class', 'x label axis-label')
                .attr('text-anchor', 'middle')
                .attr('transform', 'translate(' + xAxisXPos + ',' + xAxisYPos + ')')
                .text(xLabel);
            var yAxisXPos = (parseInt(svg.attr('height')>height ? height : svg.attr('height'))-margin.bottom)/2;
            svg.append('g')
                .attr('class','y-label-container')
                .append('text')
                .attr('class', 'axis-label')
                .attr('text-anchor', 'middle')
                .attr('transform', 'rotate(-90) translate(-' + yAxisXPos + ',15)')
                .text('Percentage of Samples in Grouping');

            function check_selection_state(isActive) {
                selex_active = !!isActive;

                if (isActive) {
                    // Disable zooming events and store their status
                    svg.on('.zoom',null);
                    zoom_status.translation = zoom.translate();
                    zoom_status.scale = zoom.scale();
                    // Append new brush event listeners to plot area only
                    plot_area.append('g')
                        .attr('class', 'brush')
                        .call(brush)
                        .selectAll('rect')
                        .attr('y', 0)
                        .attr('height', height - margin.bottom);
                } else {
                    // Resume zooming, restoring the zoom's last state
                    svg.call(zoom);
                    zoom_status.translation && zoom.translate(zoom_status.translation);
                    zoom_status.scale && zoom.scale(zoom_status.scale);
                    zoom_status.translation = null;
                    zoom_status.scale = null;

                    var plot_id = $(svg[0]).parents('.plot').attr('id').split('-')[1];
                    // Clear selections
                    $(svg[0]).parents('.plot').find('.selected-samples-count').html('Number of Samples: ' + 0);
                    $(svg[0]).parents('.plot').find('.selected-patients-count').html('Number of Cases: ' + 0);
                    $('#save-cohort-'+plot_id+'-modal input[name="samples"]').attr('value', "");
                    svg.selectAll('.selected').classed('selected', false);
                    $(svg[0]).parents('.plot').find('.save-cohort-card').hide();
                    selectedValues = {};
                    selectedSamples = null;
                    // Get rid of the selection rectangle - comment out if we want to enable selection carry-over
                    brush.clear();
                    // Remove brush event listener plot area
                    plot_area.selectAll('.brush').remove();
                }
            }

            // Update the sample cohort bar update
            function sample_form_update(extent, reCalc){

                if(reCalc) {
                    var case_set = {};
                    selectedSamples = {};
                    _.each(Object.keys(selectedValues),function(val) {
                        _.each(Object.keys(sampleSet[val]['samples']),function(sample) {
                            selectedSamples[sample] = sampleSet[val]['samples'][sample];
                            case_set[sampleSet[val]['samples'][sample]['case']] = 1;
                        });
                    });

                    $(svg[0]).parents('.plot').find('.selected-samples-count').html('Number of Samples: ' + Object.keys(selectedSamples).length);
                    $(svg[0]).parents('.plot').find('.selected-patients-count').html('Number of Cases: ' + Object.keys(case_set).length);
                    $('.save-cohort-card').find('.btn').prop('disabled', (Object.keys(selectedSamples).length <= 0));
                }

                var leftVal = Math.min((x(extent[1]) + 20),(width-$('.save-cohort-card').width()));
                $(svg[0]).parents('.plot')
                    .find('.save-cohort-card').show()
                    .attr('style', 'position:relative; top: -600px; left:' + leftVal + 'px;');
            }

            $('.save-cohort-card').find('.btn').on('click',function(e){
                if(Object.keys(selectedValues).length > 0){
                    var selected_sample_set = [];
                    _.each(Object.keys(selectedSamples),function(sample){
                        selected_sample_set.push(selectedSamples[sample]);
                    });

                    var plot_id = $(svg[0]).parents('.plot').attr('id').split('-')[1];
                    $('#save-cohort-' + plot_id + '-modal input[name="samples"]').attr('value', JSON.stringify(selected_sample_set));
                }

            });

            function resize() {
                width = svg.node().parentNode.offsetWidth - 10;
            }

            function check_selection_state_wrapper(button){
                check_selection_state(button);
            }

            function get_plot_data(){
                var p_data = {};
                hist_data.map(function(d, i){
                    p_data[i] = {
                        x: d.x,
                        y: d.y
                    };
                });

                return p_data;
            }

            return {
                plot_data: get_plot_data,
                resize                : resize,
                check_selection_state : check_selection_state_wrapper
            }
        }
    };
});