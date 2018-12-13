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

var Counter = {
    lastSet: null,
    firstSet: 'aaaaa',
    getNextSet: function() {
        this.lastSet = (this.lastSet ? ((parseInt(this.lastSet, 36)+1).toString(36).replace(/0/g,'a')) : this.firstSet);
        return this.lastSet;
    }
};

var RECALC_THROTTLE = 75;

define (['jquery', 'd3', 'd3tip', 'd3textwrap', 'vizhelpers', 'underscore'],
function($, d3, d3tip, d3textwrap, vizhelpers, _) {
    var tip = d3tip()
                .attr('class', 'd3-tip')
                .direction('n')
                .offset([0, 0])
                .html(function(d) {
                    return '<span>Case: ' + d['case_id'] + '<br/>' +
                        'Sample: ' + d['sample_id'] + '<br/>' +
                        'Data: (' + d['x'] + ', ' + d['y'] + ')</span>'
                });
    var helpers = Object.create(vizhelpers, {});

    var selex_active = false;
    var zoom_status = {
        translation: null,
        scale: null
    };

    // The samples in our data, keyed by their SVG element ID attributes
    var sampleSet = {};

    // The samples found in the selected ID set; this is used to produce the JSON which
    // is submitted by the form
    var selectedSamples = null;

    return {
        create_scatterplot: function(svg, data, domain, range, xLabel, yLabel, xParam, yParam, margin, colorBy, legend, width, height, cohort_set) {
            // We require at least one of the axes to have valid data
            var checkXvalid = 0;
            var checkYvalid = 0;
            var plot_padding_percentile = 5; // 5% of padding before and after the

            data.map(function(d){
                var oneIsValid = false;
                if(helpers.isValidNumber(d[xParam])) {
                    oneIsValid = true;
                    checkXvalid++;
                }
                if(helpers.isValidNumber(d[yParam])) {
                    checkYvalid++;
                    oneIsValid = true;
                }
                if(oneIsValid){
                    var id = Counter.getNextSet();
                    d['id'] = id;
                    sampleSet[id] = {sample: d['sample_id'], case: d['case_id'], project: d['project']};
                }
            });

            // At least one data point in one axis must be valid
            if(checkXvalid <= 0 && checkYvalid <= 0) {
                return null;
            }

            var yVal = function(d) {
                if(isNaN(d[yParam]))
                    return 0;
                else{
                    return Number(d[yParam]);
                }
            };

            var yScale = d3.scale.linear()
                            .range([height-margin.bottom, margin.top])
                            .domain([range[0], range[1]+(range[1]-range[0])*plot_padding_percentile/100 ]);
            var yMap = function(d) { return yScale(yVal(d));}
            var yAxis = d3.svg.axis()
                    .scale(yScale)
                    .orient("left")
                    .tickSize(-width + margin.left + margin.right, 0, 0);

            var xVal = function(d) {
                if(isNaN(d[xParam])){
                    return 0;
                }
                else{
                    return Number(d[xParam]);
                }
            };

            var xScale = d3.scale.linear()
                            .range([margin.left, width-margin.right])
                            .domain([domain[0], domain[1]+(domain[1]-domain[0])*plot_padding_percentile/100 ]);
            var xMap = function(d) { return xScale(xVal(d)); };
            var xAxis = d3.svg.axis()
                    .scale(xScale)
                    .orient("bottom")
                    .tickSize(-height + margin.top + margin.bottom, 0, 0);

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

            var worksheet_id = $('.worksheet.active').attr('id');
            var plot_area_clip_id = 'plot_area_clip_' + worksheet_id;
            var plot_area = svg.append('g')
                .attr('clip-path', 'url(#'+plot_area_clip_id+')');

            plot_area.append('clipPath')
                .attr('id', plot_area_clip_id)
                .append('rect')
                .attr('height', height-margin.top-margin.bottom)
                .attr('width', width-margin.left-margin.right)
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            // Highlight circles which are selected
            // This is throttles so recalculation of the selected set isn't done
            // more than every RECALC_THROTTLE milliseconds
            var brushmove = _.throttle(function(p) {
                var e = brush.extent();
                var oldSet = selectedSamples;
                selectedSamples = {};
                var reCalc = false;

                svg.selectAll("circle").classed("selected", function(d) {
                    return e[0][0] <= d[xParam] && d[xParam] <= e[1][0]
                        && e[0][1] <= d[yParam] && d[yParam] <= e[1][1]
                        && !$(this).is('.hidden');
                });

                var oldSetKeys = Object.keys(oldSet);

                if(oldSetKeys.length !== $('svg circle.selected').length) {
                    reCalc = true;
                }

                $('svg circle.selected').each(function(){
                    if(!oldSet[this.id]) {
                        reCalc = true;
                    }
                    selectedSamples[this.id] = 1;
                });

                for(var i=0;i<oldSetKeys.length;i++) {
                    if(!selectedSamples[oldSetKeys[i]]) {
                        reCalc = true;
                    }
                }

                sample_form_update(e, reCalc);
            },RECALC_THROTTLE);

            var mouseDown = null;

            // If the brush is empty, select all circles.
            var brushend = function() {
                mouseDown = null;
                if (brush.empty()) {
                    svg.selectAll(".hidden").classed("hidden", false);
                    $(svg[0]).parents('.plot').find('.save-cohort-card').hide();
                }
            };

            var brush = d3.svg.brush()
                .x(xScale)
                .y(yScale)
                .on('brushstart',function(e){
                    selectedSamples = {};
                    mouseDown = null;
                })
                .on('brush', function(p){
                    mouseDown = mouseDown || brush.extent();
                    // We call brushmove separately so the selection recalculation can be throttled...
                    brushmove(p);
                    // ...but we don't want to throttle visual updating of the selection card, because
                    // that looks weird and isn't really necessary
                    var e = brush.extent();
                    var topVal = Math.min((yScale(e[1][1]) + $('.save-cohort-card').height()+20),(height-$('.save-cohort-card').height()));
                    var leftVal = Math.min(((xScale(mouseDown[0][0]) > xScale(e[0][0]) ? xScale(e[0][0]) : xScale(e[1][0]))+ 30),(width-$('.save-cohort-card').width()));
                    $('.save-cohort-card').show()
                        .attr('style', 'position:absolute; top: '+ topVal +'px; left:' +leftVal+'px;');
                })
                .on('brushend', brushend);

            var transformer = function(d) {
                return 'translate(' + xMap(d) + ',' + yMap(d) + ')';
            };

            var zoomer = function() {
                if(!selex_active) {
                    svg.select('.x.axis').call(xAxis);
                    svg.select('.y.axis').call(yAxis);
                    plot_area.selectAll('circle').attr('transform', transformer);
                }
            };

            var zoom = d3.behavior.zoom()
                .x(xScale)
                .y(yScale)
                .on('zoom', zoomer);

            svg.call(zoom);

            plot_area.selectAll('.dot')
                .data(data)
                .enter().append('circle')
                .attr('class', function(d) { return d[colorBy]; })
                .style('fill', function(d) { return color(colorVal(d)); })
                .attr('transform', transformer)
                .attr('r', 2)
                .attr('id', function(d) { return d['id']; })
                .on('mouseover.tip', tip.show)
                .on('mouseout.tip', tip.hide);
            plot_area.call(tip);

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
            svg.append('g')
                .attr('class','x-label-container')
                .append('text')
                .attr('class', 'x label axis-label')
                .attr('text-anchor', 'middle')
                .attr('transform', 'translate(' + (width/2) + ',' + (height - 80) + ')')
                .text(xLabel);

            svg.append('g')
                .attr('class','y-label-container')
                .append('text')
                .attr('class', 'y label axis-label')
                .attr('text-anchor', 'middle')
                .attr('transform', 'rotate(-90) translate(' + (-height+margin.top+margin.bottom)/2 + ', 15)')
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
                            if (Array.isArray(d)) {
                                var cohort_name_label = "";
                                for (var i = 0; i < d.length; i++) {
                                    for (var j = 0; j < cohort_set.length; j++) {
                                        if (cohort_set[j]['id'] == d[i]) { cohort_name_label += cohort_set[j]['name'] + ','; }
                                    }
                                }
                                return cohort_name_label.slice(0,-1);
                            } else {
                                for (var i = 0; i < cohort_set.length; i++) {
                                    if (cohort_set[i]['id'] == d) { return cohort_set[i]['name']; }
                                }
                            }
                        } else {
                            return d;
                        }
                    } else {
                        return 'NA';
                    }
                });

            var check_selection_state = function(obj) {

                selex_active = !!obj;

                if (obj) {
                    // Disable zooming events and store their status
                    svg.on('.zoom',null);
                    zoom_status.translation = zoom.translate();
                    zoom_status.scale = zoom.scale();

                    // Append new brush event listeners to plot area only
                    plot_area.append('g')
                        .attr('class', 'brush')
                        .call(brush);
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
                    selectedSamples = {};
                    $(svg[0]).parents('.plot').find('.save-cohort-card').hide();

                    // Get rid of the selection rectangle - comment out if we want to enable selection carry-over
                    brush.clear();
                    // Remove brush event listener plot area
                    plot_area.selectAll('.brush').remove();
                }
            };

            // Recalculate the counts of selected samples if there was a change
            function sample_form_update(extent, reCalc){
                if(reCalc) {
                    var case_set = {};
                    _.each(Object.keys(selectedSamples),function(val) {
                        case_set[sampleSet[val]['case']] = 1;
                    });

                    $(svg[0]).parents('.plot').find('.selected-samples-count').html('Number of Samples: ' + Object.keys(selectedSamples).length);
                    $(svg[0]).parents('.plot').find('.selected-patients-count').html('Number of Cases: ' + Object.keys(case_set).length);
                    $('.save-cohort-card').find('.btn').prop('disabled', (Object.keys(selectedSamples).length <= 0));
                }
            }

            // If we are ready to save out this cohort, JSONify the selection set and set it to the form value
            $('.save-cohort-card').find('.btn').on('click',function(e){
                if(Object.keys(selectedSamples).length > 0){
                    var selected_sample_set = [];
                    _.each(Object.keys(selectedSamples),function(sample){
                        selected_sample_set.push(sampleSet[sample]);
                    });

                    var plot_id = $(svg[0]).parents('.plot').attr('id').split('-')[1];
                    $('#save-cohort-' + plot_id + '-modal input[name="samples"]').attr('value', JSON.stringify(selected_sample_set));
                }

            });

            function resize() {
                width = svg.node().parentNode.offsetWidth - 10;
                //TODO resize plot
            }

            function check_selection_state_wrapper(bool){
                check_selection_state(bool);
            }

            function get_plot_data(){
                var p_data = [];
                data.map(function(d){
                    var p = {
                        x: xVal(d),
                        y: yVal(d),
                        case_id: d['case_id'],
                        sample_id: d['sample_id']
                    };
                    p_data.push(p);
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
