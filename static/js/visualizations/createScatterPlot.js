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
        create_scatterplot: function(svg, data, domain, range, xLabel, yLabel, xParam, yParam, margin, legend, width, height, cohort_map) {
            var colorBy = legend.title.toLowerCase() == 'cohort' ? 'cohort' : 'c';
            // We require at least one of the axes to have valid data
            var checkXvalid = 0;
            var checkYvalid = 0;
            var plot_padding_percentile = 5; // 5% of padding before and after the
            var tip = d3tip()
                .attr('class', 'd3-tip')
                .direction('n')
                .offset([0, 0])
                .html(function(d) {

                    return '<span>Case: ' + d['case_id'] + '<br/>' +
                        'Sample: ' + d['sample_id'] + '<br/>' +
                        xLabel + ': ' + d[xParam] + '<br/>' +
                        yLabel + ': ' + d[yParam] + '<br/>' +
                        legend.title + ': ' + vizhelpers.get_legend_val(cohort_map, colorBy, d[colorBy], ',')
                        +' </span>';

                });

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

            var y_padding = (range[1]-range[0])*plot_padding_percentile/100;
            var x_padding = (domain[1]-domain[0])*plot_padding_percentile/100;
            var yScale = d3.scale.linear()
                            .range([height-margin.bottom, margin.top])
                            .domain([range[0]-y_padding, range[1]+ y_padding]);
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
                            .domain([domain[0]-x_padding, domain[1]+x_padding ]);
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

            var color;
            var numeric_color;
            var cat_color_domain = [];
            var num_color_domain = [];

            var legend_scale_no = 9;
            var use_numerical_color = false;
            var color_band;
            var numeric_color_quantiles;
            var num_legend_tip = d3tip()
                .attr('class', 'd3-tip')
                .direction('n')
                .offset([0, 0])
                .html(function(d, i) {
                    var threashold = (i >= numeric_color_quantiles.length) ?
                        (color_band < 1) ?
                            parseFloat(Math.round((d+color_band) * 100) / 100).toFixed(2) :
                                Math.floor(d+color_band) : (numeric_color_quantiles[i]);
                    return '<span>'
                        +(d)+'<= val <'
                        +threashold
                        +' </span>';

                });

            if(legend.type == "N") {
                var blues = d3.scale.linear()
                    .domain([0, legend_scale_no])
                    .range(["#E3E3FF", "blue"]);

                cat_color_domain = $.map(data, function (d) {
                    if(isNaN(d[colorBy])){
                        return d[colorBy];
                    }
                    else{
                        num_color_domain.push(d[colorBy]);
                    }
                });

                var color_range = helpers.get_min_max(data, colorBy);

                if (num_color_domain.length < legend_scale_no) {
                    if(num_color_domain.length > 0){
                        use_numerical_color = false;
                        cat_color_domain = cat_color_domain.concat(num_color_domain);
                    }
                }
                else {
                    color_band = (color_range[1] - color_range[0]) / (legend_scale_no - 1);

                    use_numerical_color = true;
                    numeric_color = d3.scale.quantile()
                        .domain(d3.range(legend_scale_no+1)
                            .map(function (d, i) {
                                if(color_band < 1)
                                    return (color_range[0] + i * color_band);
                                else
                                    return Math.floor(color_range[0] + i * color_band);
                            })
                        )
                        .range(d3.range(legend_scale_no).map(function (d) {
                            return blues(d);
                        }));
                    numeric_color_quantiles = numeric_color.quantiles();
                }
            } else {
                cat_color_domain = $.map(data, function (d) {
                    return d[colorBy];
                });

            }
            cat_color_domain.sort();

            color = d3.scale.ordinal()
                    .domain(cat_color_domain)
                    .range(helpers.color_map(cat_color_domain.length));

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

                if(oldSetKeys.length !== $('.worksheet.active svg circle.selected').length) {
                    reCalc = true;
                }

                $('.worksheet.active svg circle.selected').each(function(){
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
                    $('.worksheet.active .plot').find('.save-cohort-card').hide();
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
                    var topVal = Math.min((yScale(e[1][1]) + $('.worksheet.active .save-cohort-card').height()+20),(height-$('.worksheet.active .save-cohort-card').height()));
                    var leftVal = Math.min(((xScale(mouseDown[0][0]) > xScale(e[0][0]) ? xScale(e[0][0]) : xScale(e[1][0]))+ 30),(width-$('.worksheet.active .save-cohort-card').width()));
                    $('.worksheet.active .save-cohort-card').show()
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
                .attr('class', function(d) {
                    var toggle_class;
                    if (use_numerical_color && !isNaN(colorVal(d))) {
                        toggle_class = numeric_color(colorVal(d));
                    }
                    else {
                        toggle_class = color(colorVal(d));
                    }
                    return toggle_class.replace('#','_');
                })
                .style('fill', function(d) {
                    if (use_numerical_color && !isNaN(colorVal(d))) {
                        return numeric_color(colorVal(d));
                    }
                    else {
                        return color(colorVal(d));
                    }
                })
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
                .attr('style', function(d){
                    if (yLabel.length > 65){
                        return 'font-size: 0.9em;'
                    }
                    else
                        return '';
                })
                .text(yLabel);

            var legend_line_height = 25;
            var legend_height = legend_line_height;
            var n_legend;
            var c_legend;
            var n_legend_w = 400;
            var c_legend_margin_left = 1;
            var legend_rect_h = 14;

            legend.svg.append('text')
                .attr('x', 2)
                .attr('y', legend_line_height - 10)
                .style('font-weight', 'bold')
                .text(legend.title);
            if(legend.type == "N" && use_numerical_color){
                var legend_rect_w = 28;
                var legend_text_w = 60;
                c_legend_margin_left = n_legend_w;
                legend_height += legend_line_height;
                n_legend = legend.svg.selectAll('.legend')
                    .data(numeric_color.domain().slice(0,-1))
                    .enter().append('g')
                    .attr('class', 'legend')
                    .attr("transform", function (d, i) {
                        return "translate("+(legend_text_w + (legend_rect_w+2) * i)+", "+legend_line_height+")";
                    });
                n_legend.call(num_legend_tip);
                n_legend.append('rect')
                    .attr('width', legend_rect_w)
                    .attr('height', legend_rect_h)
                    .attr('class', 'selected')
                    .attr('toggle-class', numeric_color)
                    .style('stroke', numeric_color)
                    .style('stroke-width', 1)
                    .style('fill', numeric_color)
                    .on('mouseover.tip', num_legend_tip.show)
                    .on('mouseout.tip', num_legend_tip.hide)
                    .on('click', helpers.toggle_selection);

                n_legend.append('text')
                    .attr('x', function(d, i){
                        if(i == 0){
                            return -3;
                        }
                        else if(i == legend_scale_no-1){
                            return legend_rect_w + 3;
                        }
                        return;
                    })
                    .attr('y', function(d, i){
                        if(i == 0 || i == legend_scale_no-1){
                            return legend_rect_h-2;
                        }
                        return;

                    })
                    .text(function (d, i) {
                        if(i == 0 || i == legend_scale_no-1){
                            return color_band < 1 ?
                                parseFloat(Math.round((d + (i == legend_scale_no-1)*(color_band)) * 100) / 100).toFixed(2) :
                                    Math.floor(d + (i == legend_scale_no-1)*(color_band));
                        }
                        return;
                    })
                    .attr('text-anchor', function(d, i){
                        if(i == 0){
                            return 'end';
                        }
                        else if (i == (legend_scale_no - 1)){
                            return 'start';
                        }
                        return;
                    });
            }
            if(color.domain().length > 0) {
                var no_legend_columns = helpers.get_no_legend_columns(color.domain());
                var legend_column_length = Math.ceil(color.domain().length/no_legend_columns);
                var legend_rect_w = legend_rect_h;


                c_legend = legend.svg.selectAll('.c_legend')
                    .data(color.domain())
                    .enter().append('g')
                    .attr('class', 'c_legend')
                    .attr("transform", function (d, i) {
                        return "translate(" + (c_legend_margin_left + Math.floor(i / legend_column_length) * legend.svg.attr('width') / no_legend_columns) + "," + (((i % legend_column_length) + 1) * legend_line_height) + ")";
                    });
                c_legend.append('rect')
                    .attr('width', legend_rect_w)
                    .attr('height', legend_rect_h)
                    .attr('toggle-class', color)
                    .attr('class', 'selected')
                    .style('stroke', color)
                    .style('stroke-width', 1)
                    .style('fill', color)
                    .on('click', helpers.toggle_selection);

                c_legend.append('text')
                    .attr('x', legend_rect_w + 8)
                    .attr('y', legend_rect_h - 2)
                    .text(function (d) {
                        if (d != null) {
                            return vizhelpers.get_legend_val(cohort_map, colorBy, d, ',');
                        } else {
                            return 'NA';
                        }
                    });
                legend_height = legend_height == legend_line_height ? legend_line_height * (legend_column_length + 1) : legend_height;
            }
            legend.svg.attr('height', legend_height);

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

                    // Clear selections
                    $('.worksheet.active .plot').find('.selected-samples-count').html('Number of Samples: ' + 0);
                    $('.worksheet.active .plot').find('.selected-patients-count').html('Number of Cases: ' + 0);
                    $('.worksheet.active .save-cohort-form input[name="samples"]').attr('value', "");
                    svg.selectAll('.selected').classed('selected', false);
                    selectedSamples = {};
                    $('.worksheet.active .plot').find('.save-cohort-card').hide();

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

                    $('.worksheet.active .plot').find('.selected-samples-count').html('Number of Samples: ' + Object.keys(selectedSamples).length);
                    $('.worksheet.active .plot').find('.selected-patients-count').html('Number of Cases: ' + Object.keys(case_set).length);
                    $('.worksheet.active .save-cohort-card').find('.btn').prop('disabled', (Object.keys(selectedSamples).length <= 0));
                }
            }

            // If we are ready to save out this cohort, JSONify the selection set and set it to the form value
            $('.worksheet.active .save-cohort-card').find('.btn').on('click',function(e){
                if(Object.keys(selectedSamples).length > 0){
                    var selected_sample_set = [];
                    _.each(Object.keys(selectedSamples),function(sample){
                        selected_sample_set.push(sampleSet[sample]);
                    });

                    $('.worksheet.active .save-cohort-form input[name="samples"]').attr('value', JSON.stringify(selected_sample_set));
                }

            });

            function resize() {
                width = svg.node().parentNode.offsetWidth - 10;
                //TODO resize plot
            }

            function check_selection_state_wrapper(bool){
                check_selection_state(bool);
            }

            function get_json_data(){
                var p_data = {};
                data.map(function(d, i){
                    p_data[i]= {};
                    p_data[i]['case_id'] = d['case_id'];
                    p_data[i]['sample_id'] = d['sample_id'];
                    p_data[i][xParam] = xVal(d);
                    p_data[i][yParam] = yVal(d);
                    p_data[i][legend.title] = (vizhelpers.get_legend_val(cohort_map, colorBy, d[colorBy], ';'));
                });
                return p_data;
            }

            function get_csv_data(){
                var csv_data = 'case_id, sample_id, '+xParam+', '+yParam+', '+legend.title+'\n';
                data.map(function(d){
                    csv_data += d['case_id'] +', '+ d['sample_id'] + ', ' + xVal(d) + ', '+ yVal(d) +', '+ (vizhelpers.get_legend_val(cohort_map, colorBy, d[colorBy], ';')) + '\n';
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
