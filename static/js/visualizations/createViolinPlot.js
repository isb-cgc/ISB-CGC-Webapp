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

    var median_tip = d3tip()
        .attr('class', 'd3-tip')
        .direction('n')
        .offset([0, 0])
        .html(function(d) {
            return '<span>Median: ' + d[0].y + '</span>';
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
        addViolin: function (svg, raw_data, values_only, height, violin_width, domain, range) {
            var data = d3.layout.histogram()
                .frequency(0)(values_only.sort(d3.descending));

            var y = d3.scale.linear()
                .range([violin_width/2, 0])
                .domain([0, d3.max(data, function(d) { return d.y; })]);

            var x = d3.scale.linear()
                .range(range)
                .domain(domain)
                .nice();

            var line = d3.svg.line()
                .interpolate( values_only.length > 5 ? 'basis':'cardinal')
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
                .attr('transform', 'rotate(90, 0, 0) translate(0, -' + violin_width + ')');

            gMinus.append('path')
                .datum(data)
                .attr('class', 'violin')
                .attr('d', line)
                .style('stroke', 'blue')
                .style('fill', 'none')
                .attr('transform', 'rotate(90, 0, 0) scale(1, -1)');
        },
        addPoints: function (svg, raw_data, values_only, height, plot_width, violin_width, domain, range, xdomain, xAttr, yAttr, colorBy, legend, legend_title, cohort_map, padding, margin, dot_tip) {
            // remove counts from xdomain
            var tmp = xdomain;
            xdomain = [];
            for (var i = 0; i < tmp.length; i++) {
                xdomain.push(tmp[i].split(/:\d+/)[0]);
            }

            // Somehow use the histogram values to determine the x position of the dot
            var y = d3.scale.linear()
                .range(range)
                .domain(domain)
                .nice();

            var x = d3.scale.ordinal()
                .domain(xdomain)
                .rangeBands([0, plot_width]);

            var colorVal = function(d) { return d[colorBy]; };

            var name_domain = $.map(raw_data, function(d) {
                return d[colorBy];
            });
            var color = d3.scale.ordinal()
                .domain(name_domain)
                .range(helpers.color_map(name_domain.length));

            var histo_dict = {};
            for (var key in values_only) {
                console.log(values_only[key]);
                histo_dict[key] = d3.layout.histogram()
                    .frequency(0)(values_only[key].sort(d3.descending));
                //console.log('histo_dict['+key+'] = '+histo_dict[key]);
                for (var i = 0; i< histo_dict[key].length; i++){

                    console.log('high '+histo_dict[key][i][0]);
                    console.log('low '+histo_dict[key][i][histo_dict[key][i].length-1]);
                }

            }


            var nonNullData = [];

            raw_data.map(function(d){
                if(helpers.isValidNumber(d.y)) {
                    var id = Counter.getNextSet();
                    d['id'] = id;
                    sampleSet[id] = {sample: d['sample_id'], case: d['case_id'], project: d['project']};

                    nonNullData.push(d);
                }
            });
            if(nonNullData.length > 0) {
                svg.selectAll('.dot')
                    .data(nonNullData)
                    .enter().append('circle')
                    .attr('id', function (d) {
                        return d['id'];
                    })
                    .attr('class', function (d) {
                        return d[colorBy];
                    })
                    .style('fill', function (d) {
                        return color(colorVal(d));
                    })
                    .attr('cx', function (d) {
                        // console.log(parseInt(x(d[xAttr]) / (violin_width + padding)));
                        var histogram = histo_dict[parseInt(x(d[xAttr]) / (violin_width + padding))];
                        console.log(d[yAttr]);
                        var histo_index = 0;
                        for (var j = 0; j < histogram.length; j++) {
                            var higher = histogram[j][0];
                            var lower = histogram[j][histogram[j].length - 1];
                            if (d[yAttr] >= lower && d[yAttr] <= higher) {
                                console.log('histo_index '+j);
                                histo_index = j;
                                break;
                            }
                            // console.log(histogram.length)
                        }
                        // console.log(histo_index);
                        var plusOrMinus = Math.random() < 0.5 ? -1 : 1;
                        var rand_pos = 0;
                        if (histogram.length) {
                            // console.log(d3.max(histogram, function (d) {
                            //         return d.y;
                            //     }));
                            var y_horizontal = d3.scale.linear()
                                .range([0, violin_width / 2])

                                .domain([0, d3.max(histogram, function (d) {
                                    return d.y;
                                })]);
                            rand_pos = plusOrMinus * Math.floor(Math.random() * y_horizontal(histogram[histo_index]['y']) * 0.8);
                        }
                        var xpos = x(d[xAttr]) + (violin_width + padding) / 2 + rand_pos;
                        return xpos;
                    }) // Staggers points across a histogram
                    .attr('cy', function (d) {
                        return y(d[yAttr]);
                    })
                    .attr('r', 2)
                    .on('mouseover.tip', dot_tip.show)
                    .on('mouseout.tip', dot_tip.hide)
                    .call(dot_tip);
            }


            var legend_line_height = 20;
            var no_legend_columns = helpers.get_no_legend_columns(color.domain());
            var legend_column_length = Math.ceil(color.domain().length/no_legend_columns);


            legend = legend.attr('height', legend_line_height * (legend_column_length+1));
            legend.append('text')
                .attr('x', 2)
                .attr('y', legend_line_height - 5)
                .style('font-weight', 'bold')
                .text(legend_title);

            legend = legend.selectAll('.legend')
                .data(color.domain())
                .enter().append('g')
                .attr('class', 'legend')
                .attr("transform", function(d, i)
                    { return "translate("+(Math.floor(i/legend_column_length)*legend.attr('width')/no_legend_columns)+"," + (((i%legend_column_length)+1) * legend_line_height) + ")"; });

            legend.append('rect')
                .attr('width', legend_line_height - 6)
                .attr('height', legend_line_height - 6)
                .attr("transform", function(d, i) { return "translate(3, 3)"; })
                .attr('class', 'selected')
                .style('stroke', color)
                .style('stroke-width', 1)
                .style('fill', color)
                .on('click', helpers.toggle_selection);

            legend.append('text')
                .attr('x', legend_line_height + 2)
                .attr('y', legend_line_height - 5)
                .text(function(d) {
                    if (d != null) {
                        if (colorBy == 'cohort') {
                            if (Array.isArray(d)) {
                                var cohort_name_label = "";
                                for (var i = 0; i < d.length; i++) {
                                    cohort_name_label += cohort_map[d[i]]+',';
                                }
                                return cohort_name_label.slice(0,-1);
                            } else {
                                return cohort_map[d];
                            }
                        } else {
                            return d;
                        }
                    } else {
                        return 'NA';
                    }
                });
        },
        addMedianLine: function(svg, values_only, height, violin_width, domain, range) {
            var median = d3.median(values_only);

            var y = d3.scale.linear()
                .range(range)
                .domain(domain);

            var line = d3.svg.line()
                .interpolate('linear')
                .x(function(d) { return d.x; })
                .y(function(d) { return y(d.y); });

            var median_line = [ {x: 10, y: median},
                                {x: violin_width-10, y: median}];
            svg.append('path')
                .datum(median_line)
                .attr('class', 'median-line')
                .attr('d', line)
                .style('stroke', 'green')
                .style('fill', 'none')
                .on('mouseover.tip', median_tip.show)
                .on('mouseout.tip', median_tip.hide)
                .call(median_tip);
        },
        createViolinPlot: function(svg, raw_Data, height, violin_width, max_y, min_y, xLabel, yLabel, xAttr, yAttr, margin, colorBy, legend, legend_title, cohort_map) {

            var domain = [min_y, max_y];
            var range = [height - margin.bottom - margin.top, 0];
            var view_width = svg.attr("width");
            var processed_data = {};
            var x_padding = 20; //x padding between plots
            var dot_tip = d3tip()
                .attr('class', 'd3-tip')
                .direction('n')
                .offset([0, 0])
                .html(function(d) {
                    return '<span>Case: ' + d['case_id'] + '<br/>' +
                        'Sample: ' + d['sample_id'] + '<br/>' +

                        xLabel + ': ' + d[xAttr] + '<br/>' +
                        yLabel + ': ' + d[yAttr] + '<br/>' +
                        legend_title + ': ' +
                        (colorBy == 'cohort' ?
                            cohort_map[d[colorBy]]:
                            d[colorBy])
                        +' </span>';
                });

            // Split data into separate violins
            for (var i = 0; i < raw_Data.length; i++) {
                var item = raw_Data[i];
                var key = item[xAttr];
                var tmp = {};
                if (colorBy && item[colorBy]) {
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

            var plot_width = (violin_width + x_padding) * Object.keys(processed_data).length;
            if (view_width < plot_width + margin.left + margin.right) {
                svg.attr('width', plot_width + margin.left + margin.right);
            }
            var worksheet_id = $('.worksheet.active').attr('id');
            var plot_area_clip_id = 'plot_area_clip_' + worksheet_id;
            var plot_area = svg.append('g')
                .attr('clip-path', 'url(#'+plot_area_clip_id+')');

            plot_area.append('clipPath')
                .attr('id', plot_area_clip_id)
                .append('rect')
                .attr('height', height - margin.top - margin.bottom)
                .attr('width', plot_width)
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            var violin_area = plot_area.append('g')
                .attr('class', 'violin_area')
                .style('fill-opacity', 0)
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


            // iterate over data to generate a separate violin plot for each
            var i = 0;
            var xdomain = [];
            var merge_list = [];
            var scatter_processed_data = {};
            for (var key in processed_data) {
                var g = violin_area.append('g')
                    .attr('class', 'violin-plot')
                    .attr('transform', 'translate(' + (i * (violin_width+x_padding)+x_padding/2) + ')');
                scatter_processed_data[i] = [];
                var values_only = [];

                for (var j = 0; j < processed_data[key].length; j++) {
                    if (!isNaN(processed_data[key][j]['value'])) {
                        values_only.push(processed_data[key][j]['value']);
                        scatter_processed_data[i].push(processed_data[key][j]['value']);
                    }
                    var temp = processed_data[key][j];
                    temp['plot_number'] = i+1;
                    merge_list.push(temp);
                }
                var point_count = 0;


                // Don't try to plot values we don't have

                xdomain.push(key + ':' + values_only.length);
                if(values_only.length > 0) {
                    this.addViolin(g, processed_data[key], values_only, height, violin_width, domain, range);
                    this.addMedianLine(g, values_only, height, violin_width, domain, range);
                }
                i += 1;
            }

            // Set width of overall plot in here
            violin_area.attr('width', plot_width);

            plot_area.select('rect')
                .attr('width', plot_width);

            var plotg = plot_area.append('g')
                .attr('width', plot_width)
                .attr('height', height - margin.top - margin.bottom)
                .attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');
            this.addPoints(plotg, raw_Data, scatter_processed_data, height, plot_width, violin_width, domain, range, xdomain, xAttr, yAttr, colorBy, legend, legend_title, cohort_map, x_padding, margin, dot_tip);

            // create y axis
            var y = d3.scale.linear()
                .range(range)
                .domain(domain);

            var yAxis = d3.svg.axis()
                .scale(y)
                .orient('left')
                .tickSize(-plot_width, 0, 0);

            // create x axis
            var x = d3.scale.ordinal()
                .domain(xdomain)
                .rangeBands([0, plot_width]);
            var xAxis = d3.svg.axis()
                .scale(x)
                .ticks(xdomain.length)
                .orient('bottom')
                .tickSize(-height + margin.top + margin.bottom, 0, 0);

            // Axis used for panning
            var x2_width = plot_width < view_width - margin.left - margin.right ? view_width - margin.left - margin.right : plot_width;

            var x2 = d3.scale.linear()
                .range([0, x2_width])
                .domain([0, x2_width]);


            // append axes
            svg.append('g')
                .attr('class', 'y axis')
                .attr('transform', 'translate(' + margin.left +', '+ margin.top+')')
                .call(yAxis);

            var x_axis_area_clip_id = 'x_axis_area_clip_' + worksheet_id;
            var x_axis_area = svg.append('g')
                .attr('clip-path', 'url(#'+x_axis_area_clip_id+')');

            x_axis_area.append('clipPath')
                .attr('id', x_axis_area_clip_id)
                .append('rect')
                .attr('height', height-margin.top-30)
                .attr('width', plot_width)
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            x_axis_area.append('g')
                .attr('class', 'x axis')
                .attr('transform', 'translate(' + margin.left + ',' + (height - margin.bottom) + ')')
                .call(xAxis);
            var tick_font_size = 14;
            d3.select('.x.axis').selectAll('text').call(d3textwrap.textwrap().bounds({width: violin_width, height: margin.bottom-30}));
            d3.select('.x.axis').selectAll('foreignObject').attr('style','transform: translate(-'+(violin_width/2)+'px,0px); font-size: '+tick_font_size+'px');
            d3.select('.x.axis').selectAll('foreignObject div').attr('class','centered');

            // Highlight the selected circles.
            var brushmove = _.throttle(function(p) {
                var e = brush.extent();
                var oldSet = selectedSamples;
                selectedSamples = {};
                var reCalc = false;

                plot_area.selectAll("circle").classed("selected", function(d) {
                    return e[0][0] <= $(this).attr('cx') && $(this).attr('cx') <= e[1][0]
                        && e[0][1] <= d[yAttr] && d[yAttr] <= e[1][1]
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

                sample_form_update(reCalc);

            },RECALC_THROTTLE);

            var mouseDown = null;

            var brushend = function() {
                mouseDown = null;
                if (brush.empty()) {
                    svg.selectAll(".hidden").classed("hidden", false);
                    $('.worksheet.active .save-cohort-card').hide();
                }
            };

            var brush = d3.svg.brush()
                .x(x2)
                .y(y)
                .on('brushstart',function(e){
                    var e = brush.extent();
                    if(!e){
                        selectedSamples = {};
                        sample_form_update(true);
                    }
                    mouseDown = null;
                })
                .on('brush', function(p){
                    mouseDown = mouseDown || brush.extent();
                    // We call brushmove separately so the selection recalculation can be throttled...
                    brushmove(p);
                    // ...but we don't want to throttle visual updating of the selection card, because
                    // that looks weird and isn't really necessary
                    var e = brush.extent();
                    var topVal = $('.worksheet.active .plot-div').position().top
                        + margin.top
                        + 15
                        + y(Math.min(e[0][1], e[1][1]));
                    var leftVal = Math.min((x2(mouseDown[0][0]) > x2(e[0][0]) ? x2(e[0][0]) : x2(e[1][0])), (view_width-$('.worksheet.active .save-cohort-card').width()));
                    $('.worksheet.active .save-cohort-card').show()
                        .attr('style', 'position:absolute; top: '+ (topVal) +'px; left:' +leftVal+'px;');
                })
                .on('brushend', brushend);

            var zoomer = function() {
                if(!selex_active) {
                    var scaled_tick_font_size = tick_font_size * d3.event.scale;
                    svg.select('.x.axis')
                        .selectAll('foreignObject')
                        .attr('style','transform: translate(-'+(violin_width*d3.event.scale/2)+'px, 0px); font-size:' +(d3.event.scale >1 ? tick_font_size : scaled_tick_font_size)+ ';')
                        .attr('width', violin_width*d3.event.scale);

                    svg.select('.x.axis')
                        .attr('transform', 'translate(' + (d3.event.translate[0] + margin.left) + ',' + (height - margin.bottom) + ')')
                        .call(xAxis.scale(x.rangeBands([0, plot_width*d3.event.scale])));

                    x_axis_area.select('clipPath')
                        .select('rect')
                        .attr('width', plot_width*(plot_width < view_width-margin.left-margin.right ? d3.event.scale : 1));

                    svg.select('.y.axis')
                        .call(yAxis);

                    svg.select('.y.axis')
                        .selectAll('line')
                        .attr('x2', plot_width*(plot_width < view_width-margin.left-margin.right ? d3.event.scale : 1));


                    plot_area.selectAll('circle')
                        .attr('r', 2/d3.event.scale) //maintain the same circle size regardless of the zoom scale
                        .attr('transform', 'translate(' + d3.event.translate[0] + ', '+ d3.event.translate[1] + ') scale('+d3.event.scale+', '+ d3.event.scale + ')');

                    violin_area.selectAll('.violin-plot')
                        .attr('transform', function (d, i) {
                            return 'translate(' + ((i * (violin_width + x_padding) + x_padding / 2) * d3.event.scale + d3.event.translate[0]) + ', ' + d3.event.translate[1] + ') scale(' + d3.event.scale + ', ' + d3.event.scale + ')';
                        });

                    violin_area.selectAll('.violin, .median-line') //maintain same stroke-width
                        .attr('stroke-width', 1/d3.event.scale);

                    plot_area.select('clipPath')
                        .select('rect')
                        .attr('width', plot_width*(plot_width < view_width-margin.left-margin.right ? d3.event.scale : 1));


                }
            };

            var min_scale = 100/violin_width;
            var max_scale = 5;
            var zoom = d3.behavior.zoom()
                .x(x2).scaleExtent([min_scale, max_scale])
                .y(y).scaleExtent([min_scale, max_scale])
                .on('zoom', zoomer);

            svg.call(zoom);


            // append axes labels
            svg.append('g')
                .attr('class', 'x-label-container')
                .append('text')
                .attr('class', 'x label axis-label')
                .attr('text-anchor', 'middle')
                .attr('transform', 'translate(' + ((view_width > (plot_width + margin.left + margin.right) ? plot_width : (view_width-margin.left-margin.right))/2+margin.left) + ',' + (height - 10) + ')')
                .text(xLabel);

            svg.append('g')
                .attr('class', 'y-label-container')
                .append('text')
                .attr('class', 'y label')
                .attr('text-anchor', 'middle')
                .attr('transform', 'rotate(-90) translate(' + (-height+margin.top+margin.bottom)/2 + ',10)')
                .text(yLabel);

            $('.worksheet.active foreignObject div').each(function(){
                $(this).attr('title',$(this).html())
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
                        .call(brush)
                        .attr('width', x2(plot_width))
                        .attr('height', height-margin.top-margin.bottom)
                        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

                } else {
                    // Resume zooming, restoring the zoom's last state
                    svg.call(zoom);
                    zoom_status.translation && zoom.translate(zoom_status.translation);
                    zoom_status.scale && zoom.scale(zoom_status.scale);
                    zoom_status.translation = null;
                    zoom_status.scale = null;

                    //var plot_id = $(svg[0]).parents('.plot').attr('id').split('-')[1];
                    // Clear selections

                    $('.worksheet.active .plot .selected-samples-count').html('Number of Samples: ' + 0);
                    $('.worksheet.active .plot .selected-patients-count').html('Number of Participants: ' + 0);
                    $('.worksheet.active .save-cohort-form input[name="samples"]').attr('value', "");
                    svg.selectAll('.selected').classed('selected', false);
                    $('.worksheet.active .plot .save-cohort-card').hide();
                    selectedSamples = {};

                    // Get rid of the selection rectangle - comment out if we want to enable selection carry-over
                    brush.clear();

                    // Remove brush event listener plot area
                    plot_area.selectAll('.brush').remove();
                }
            };

            // Recalculate the counts of selected samples if there was a change
            function sample_form_update(reCalc){
                if(reCalc) {
                    var case_set = {};
                    _.each(Object.keys(selectedSamples),function(val) {
                        case_set[sampleSet[val]['case']] = 1;
                    });

                    $('.worksheet.active .plot .selected-samples-count').html('Number of Samples: ' + Object.keys(selectedSamples).length);
                    $('.worksheet.active .plot .selected-patients-count').html('Number of Cases: ' + Object.keys(case_set).length);
                    $('.worksheet.active .plot .btn').prop('disabled', (Object.keys(selectedSamples).length <= 0));
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
                //width = svg.node().parentNode.offsetWidth - 10;
                //TODO resize plot
            }

            function check_selection_state_wrapper(bool){
                check_selection_state(bool);
            }

            function get_json_data(){
                var p_data = {};
                raw_Data.map(function(d, i){
                    if(helpers.isValidNumber(d[yAttr])) {
                        p_data[i]= {};
                        p_data[i]['case_id'] = d['case_id'];
                        p_data[i]['sample_id'] = d['sample_id'];
                        p_data[i][xAttr] = d[xAttr];
                        p_data[i][yAttr] = isNaN(d[yAttr])? d[yAttr] : Number(d[yAttr]);
                        p_data[i][legend_title] = colorBy == 'cohort' ? cohort_map[d[colorBy]]: d[colorBy];
                    }
                });
                return p_data;
            }

            function get_csv_data(){
                var csv_data = 'case_id, sample_id, '+xAttr+', '+yAttr+', '+legend_title+'\n';
                raw_Data.map(function(d){
                    csv_data += d['case_id'] +', '+ d['sample_id'] + ', ' + d[xAttr] + ', '+ d[yAttr] +', '+ (colorBy == 'cohort' ? cohort_map[d[colorBy]]: d[colorBy])+ '\n';
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
