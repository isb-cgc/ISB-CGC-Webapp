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
    var selex_active = false;
    var zoom_status = {
        translation: null,
        scale: null
    };

    return {
        createHistogramPlot : function (svg_param, raw_Data, width_param, height_param, x_attr, xLabel, margin_param, bySample) {
            // If you want to override the tip coming in from the create call,
            // do it here
            var yLabel = 'Percentage of '+(bySample ? 'Samples' : 'Cases')+' in Grouping';
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
                    return '<span>' + xLabel +': '+ Number(d.x).toFixed(2) + '</br>' +
                        yLabel + ': ' + ((d.y * 100).toFixed(2)) + '%<br/>Mean: ' + mean.toFixed(2) + '</span>';
                });
            var nonNullData = [];
            var values_only_by_sample = [];
            var values_only_by_case = [];
            var val_set = {};

            raw_Data.map(function(d){
                if(helpers.isValidNumber(d.x)) {
                    nonNullData.push(d);
                    var val = Number(d.x);
                    values_only_by_sample.push(val);
                    if(!bySample){
                        var case_id = d.case_id;
                        if(!val_set[val]){
                            val_set[val] = {};
                        }
                        if(!val_set[val][case_id]){
                            val_set[val][case_id] = true;
                            values_only_by_case.push(val);
                        }
                    }
                }
            });

            if(nonNullData.length <= 0) {
                return null;
            }
            svg    = svg_param;
            width  = width_param;
            height = height_param;
            margin = margin_param;

            var hist_data;

            var num_bins_by_sample = Math.ceil(Math.sqrt(bySample ? values_only_by_sample.length : values_only_by_case.length));
            var hist_data_by_sample = d3.layout.histogram()
                .bins(num_bins_by_sample)
                .frequency(false)(values_only_by_sample);

            if(bySample) {
                hist_data = hist_data_by_sample;
            }
            else{
                var num_bins_by_case = Math.ceil(Math.sqrt(values_only_by_case.length));
                var hist_data_by_case = d3.layout.histogram()
                    .bins(num_bins_by_case)
                    .frequency(false)(values_only_by_case);
                hist_data = hist_data_by_case;
            }
            var tmp = [d3.min(values_only_by_sample), d3.max(values_only_by_sample)];
            if(tmp[0] === tmp[1]){
                tmp[0]-=0.5;
                tmp[1]+=0.5;
            }

            min_n = tmp[0];
            max_n = tmp[1];
            var h_padding = (max_n - min_n) * .05 || 0.05;

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

            var band_width = x(hist_data[0].dx + hist_data[0].x) - x(hist_data[0].x);
            var h_padding_width = (x(min_n)-x(min_n-h_padding))*2;
            band_width = band_width > h_padding_width ? h_padding_width*.95 : band_width > 0 ? band_width : 50;

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
                .scaleExtent([0.5, 1.5])
                .on('zoom', zoomer);

            svg.call(zoom);

            var sorted = nonNullData.sort(function (a, b) {
                if (a[x_attr] > b[x_attr]) {
                    return 1;
                }
                if (a[x_attr] < b[x_attr]) {
                    return -1;
                }
                return 0;
            });

            var sample_index = 0;
            for (var i = 0; i < hist_data_by_sample.length; i++) {
                var val = hist_data_by_sample[i].x;
                if(!sampleSet[val]) {
                    sampleSet[val] = {};
                }

                for (var j = 0; j < hist_data_by_sample[i].length; j++) {
                    var data = sorted[sample_index];
                    var sample_id = data['sample_id'];
                    var case_id = data['case_id'];
                    sampleSet[val]['{'+ sample_id +'}{'+ case_id+'}'] = {sample: sample_id, case: case_id, project: data['project']};
                    sample_index++;
                }
            }

            var worksheet_id = $('.worksheet.active').attr('id');
            var plot_area_clip_id = 'plot_area_clip_' + worksheet_id;
            var plot_area = svg.append('g')
                .attr('clip-path', 'url(#'+plot_area_clip_id+')')
                .attr('transform','translate(0,'+margin.top+')');
            var band_padding = .5;
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
                    return Math.min(e[0], e[1]) < (d['x']) && (d['x']) < Math.max(e[0],e[1]);
                });

                var oldSetKeys = Object.keys(oldSet);
                if(oldSetKeys.length !== $('.worksheet.active rect.plot-bar.selected').length) {
                    reCalc = true;
                }

                $('.worksheet.active rect.plot-bar.selected').each(function () {
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
                    $('.worksheet.active .plot').find('.save-cohort-card').hide();
                }
            };

            var brush = d3.svg.brush()
                .x(x)
                .on('brushstart',function(e){
                    var e = brush.extent();
                    if(e) {
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
                .text(yLabel);

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

                    // Clear selections
                    $('.worksheet.active .plot').find('.selected-samples-count').html('Number of Samples: ' + 0);
                    $('.worksheet.active .plot').find('.selected-patients-count').html('Number of Cases: ' + 0);
                    $('.worksheet.active .save-cohort-form input[name="samples"]').attr('value', "");
                    svg.selectAll('.selected').classed('selected', false);
                    $('.worksheet.active .plot').find('.save-cohort-card').hide();
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
                        _.each(Object.keys(sampleSet[val]),function(sample) {
                            selectedSamples[sample] = sampleSet[val][sample];
                            case_set[sampleSet[val][sample]['case']] = 1;
                        });
                    });

                    $('.worksheet.active .plot').find('.selected-samples-count').html('Number of Samples: ' + Object.keys(selectedSamples).length);
                    $('.worksheet.active .plot').find('.selected-patients-count').html('Number of Cases: ' + Object.keys(case_set).length);
                    $('.worksheet.active .save-cohort-card').find('.btn').prop('disabled', (Object.keys(selectedSamples).length <= 0));
                }

                var leftVal = Math.min((x(extent[1]) + 20),(width-$('.worksheet.active .save-cohort-card').width()));
                $('.worksheet.active .plot')
                    .find('.save-cohort-card').show()
                    .attr('style', 'position:relative; top: -600px; left:' + leftVal + 'px;');
            }

            $('.worksheet.active .save-cohort-card').find('.btn').on('click',function(e){
                if(Object.keys(selectedValues).length > 0){
                    var selected_sample_set = [];
                    _.each(Object.keys(selectedSamples),function(sample){
                        selected_sample_set.push(selectedSamples[sample]);
                    });

                    $('.worksheet.active .save-cohort-form input[name="samples"]').attr('value', JSON.stringify(selected_sample_set));
                }

            });

            function resize() {
                width = svg.node().parentNode.offsetWidth - 10;
            }

            function check_selection_state_wrapper(button){
                check_selection_state(button);
            }

            function get_json_data(){
                var p_data = {};
                hist_data.map(function(d, i){
                    p_data[i] = {
                        x: d.x,
                        y: d.y
                    };
                });

                return p_data;
            }

            function get_csv_data(){
                var csv_data = "x, y\n";
                hist_data.map(function(d){
                    csv_data += d.x +', '+ d.y + '\n';
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