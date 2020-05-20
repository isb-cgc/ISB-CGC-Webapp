/**
 *
 * Copyright 2018, Institute for Systems Biology
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
define (['jquery', 'oncogridjs'],
    function ($, oncogridjs) {
    const active_plot_selector = '.worksheet.active .plot-div';
    const default_track_template = '<div class="wrapper">{{displayId}}<br>{{displayName}}: {{displayValue}}</div>';
    const datatype_track_template = '<div class="wrapper">{{displayId}}<br>{{displayName}}: {{displayValue}} file(s)</div>';
    const sortByString = function (field) {
        return function (a, b) {
            if(a[field].toLowerCase() == 'not reported')
                return 1;
            else if(b[field].toLowerCase() == 'not reported')
                return -1;
            else
                return a[field].localeCompare(b[field]);
        };
    };

    const sortByIntDesc = function (field) {
        return function (a, b) {
            var a_int = a[field] == 'Not Reported' ? -1 : a[field];
            var b_int = b[field] == 'Not Reported' ? -1 : b[field];
            return b_int - a_int;
        };
    };

    const sortByBool = function(field){
        return function (a, b){
            var a_int = a[field] == 'true' ? 1 : 0;
            var b_int = b[field] == 'true' ? 1 : 0;
            return b_int - a_int;
        };
    };

    var geneTracks = [
        {'name': '#Cases affected', 'fieldName': 'case_score', 'type': 'int', 'group': 'ISB-CGC', 'sort':sortByIntDesc, 'template': default_track_template},
        {'name': 'Cancer Gene Census', 'fieldName': 'is_cgc', 'type': 'bool', 'group': 'Gene Sets', 'sort':sortByBool, 'template': default_track_template}
    ];

    var donorTracks_temp = [
            { 'name': 'Race', 'fieldName': 'race', 'type': 'race', 'group': 'Clinical', 'sort': sortByString, 'template': default_track_template },
            { 'name': 'Age at Diagnosis', 'fieldName': 'age_at_diagnosis', 'type': 'age', 'group': 'Clinical', 'sort': sortByIntDesc, 'template': default_track_template},
            { 'name': 'Vital Status', 'fieldName': 'vital_status', 'type': 'vital', 'group': 'Clinical', 'sort': sortByString, 'template': default_track_template},
            { 'name': 'Days to Death', 'fieldName': 'days_to_death', 'type': 'dd', 'group': 'Clinical', 'sort': sortByIntDesc, 'template': default_track_template},
            { 'name': 'Gender', 'fieldName': 'gender', 'type': 'gender', 'group': 'Clinical', 'sort': sortByString, 'template': default_track_template},
            { 'name': 'Ethnicity', 'fieldName': 'ethnicity', 'type': 'ethnicity', 'group': 'Clinical', 'sort': sortByString, 'template': default_track_template},
            { 'name': 'Clinical', 'fieldName': 'clinical', 'type': 'clinical', 'group': 'Data Types', 'sort': sortByIntDesc, 'template': datatype_track_template},
            { 'name': 'Biospecimen', 'fieldName': 'biospecimen', 'type': 'biospecimen', 'group': 'Data Types', 'sort': sortByIntDesc, 'template': datatype_track_template},
            { 'name': 'Raw Sequencing Data', 'fieldName': 'rsd', 'type': 'rsd', 'group': 'Data Types', 'sort': sortByIntDesc, 'template': datatype_track_template},
            { 'name': 'Simple Nucleotide Variation', 'fieldName': 'snv', 'type': 'snv', 'group': 'Data Types', 'sort': sortByIntDesc, 'template': datatype_track_template},
            { 'name': 'Copy Number Variation', 'fieldName': 'cnv', 'type': 'cnv', 'group': 'Data Types', 'sort': sortByIntDesc, 'template': datatype_track_template},
            { 'name': 'Gene Expression', 'fieldName': 'gene_exp', 'type': 'gene_exp', 'group': 'Data Types', 'sort': sortByIntDesc, 'template': datatype_track_template}
        ];

    var donorFill = function (d) {
        var fieldname = d.fieldName;
        var data_value = d.value ? (isNaN(d.value) ? d.value.toLowerCase() : d.value) : 'not reported';
        if (data_value === 'not reported')
            return 'white';
        var field_legend;
        if(fieldname in clinical_legend['data']){
            field_legend = clinical_legend['data'][fieldname];
        }
        else if(fieldname in data_type_legend['data']){
            field_legend = data_type_legend['data'][fieldname];
        }
        else{
            return 'mediumpurple';
        }

        if (typeof field_legend['color'] == "string"){
            return field_legend['color'];
        }
        else{
            if(!data_value in field_legend)
                data_value = 'other';
            return field_legend['color'][data_value];
        }
    };

    const mainGrid_templates = {
        'mainGrid':'<div class="wrapper">{{#observation}} Case: {{observation.case_code}} <br> Gene: {{observation.geneId}} <br> Consequence: {{observation.consequence}} <br> {{/observation}}</div>',
        'mainGridCrosshair': '<div class="wrapper">{{#donor}} Case: {{donor.case_code}} <br> {{/donor}} {{#gene}}Gene: {{gene.symbol}} <br> {{/gene}}</div>'
    };

    const geneFill = function(d){
        switch(d.fieldName){
            case 'is_cgc':
                fill_color = 'darkgreen';
                break;
            default:
                fill_color = 'mediumpurple';
        }
        return fill_color;
    };

    var clinical_legend = {
        'label': 'Clinical',
        'data': {
            'race': {
                name: 'Race',
                is_gradient: false,
                color: {
                    'american indian or alaska native': '#98df8a',
                    'asian': '#aec7e8',
                    'black or african american': '#ffbb78',
                    'native hawaiian or other pacific islander': '#2ca02c',
                    'white': '#1f77b4',
                    'not reported': 'white',
                    'other': 'lightgrey'
                }
            },
            'vital_status': {
                name: 'Vital Status',
                is_gradient: false,
                color: {
                    'alive': '#1693c0',
                    'dead': 'darkred',
                    'not reported': 'white',
                    'other': 'lightgrey'
                }
            },
            'gender': {
                name: 'Gender',
                is_gradient: false,
                color: {
                    'male': '#420692',
                    'female': '#dc609c',
                    'not reported': 'white',
                    'other': 'lightgrey'
                }
            },

            'ethnicity': {
                name: 'Ethnicity',
                is_gradient: false,
                color: {
                    'not hispanic or latino': '#d62728',
                    'hispanic or latino': '#ff9896',
                    'not reported': 'white',
                    'other': 'lightgrey'
                }
            },

            'age_at_diagnosis': {
                name: 'Age at Diagnosis',
                is_gradient: true,
                max_val: 100,
                color: 'darkslategrey'
            },

            'days_to_death': {
                name: 'Days to Death',
                is_gradient: true,
                max_val: 0,
                color: 'blue'
            }
        }
    };

    var data_type_legend = {
        'label': 'Data Types',
        'data': {
            'clinical': {name: 'Clinical', is_gradient: false, color: 'darkkhaki'},
            'biospecimen': {name: 'Biospecimen', is_gradient: false, color: 'darkslategrey'},
            'rsd': {name: 'Raw Sequencing Data', is_gradient: false, color: 'cyan'},
            'snv': {name: 'Simple Nucleotide Variation', is_gradient: false, color: 'darkkhaki'},
            'cnv': {name: 'Copy Number Variation', is_gradient: false, color: 'darksalmon'},
            'gene_exp': {name: 'Gene Expression', is_gradient: false, color: 'forestgreen'}
        }
    };

    var isb_legend = {
        'label': 'ISB-CGC',
        'data': {
            'case_score':{
                name: '# of Cases Affected',
                is_gradient: true,
                max_val: 0,
                color: 'mediumpurple'
            }
        }
    };

    const cgc_legend = {
        'label': 'Gene Sets',
        'data': {
            'is_cgc': {
                name: 'Gene belongs to Cancer Gene Census',
                is_gradient: false,
                color: 'darkgreen'
            }
        }
    };

    const obs_legends = {
        'label': 'Mutation',
        'data': {
            'missense': {
                name: 'missense',
                is_gradient: false,
                color: '#ff9b6c'
            },
            'frame shift': {
                name: 'frame shift',
                is_gradient: false,
                color: '#57dba4'
            },
            'start lost': {
                name: 'start lost',
                is_gradient: false,
                color: '#ff2323'
            },
            'stop lost': {
                name: 'stop lost',
                is_gradient: false,
                color: '#d3ec00'
            },
            'initiator codon': {
                name: 'initiator codon',
                is_gradient: false,
                color: '#5abaff'
            },
            'stop gained': {
                name: 'stop gained',
                is_gradient: false,
                color: '#af57db'
            }
        }
    };

    function getTrackLegends(legends){
        var trackLegends = '<div class="wrapper">';
        for(var field_name in legends){
            var colorscheme = legends[field_name]['color'];
            var legend_name = legends[field_name]['name'];
            var is_gradient = legends[field_name]['is_gradient'];
            var gradient_scale_low = 1;
            var gradient_scale_high = 6;
            trackLegends += '<div>';
            if(typeof colorscheme == "string"){
                trackLegends += '<div>';
                if (is_gradient){
                    trackLegends += '<b>'+legend_name+':</b>';
                    if (field_name == 'case_count'){
                        trackLegends += '<br/>';
                    }
                    trackLegends += ' 0';
                    for(var i = gradient_scale_low; i < gradient_scale_high; i++){
                        trackLegends += '<div class="onco-track-legend" style="background: '+ colorscheme +'; opacity:'+ (i*0.2)+'"></div>';
                    }
                    trackLegends += legends[field_name]['max_val'] +(field_name == 'age_at_diagnosis' ? '+' :'');
                }
                else{
                    trackLegends += '<div class="onco-track-legend" style="background: '+colorscheme +';"></div><b>'+legend_name+'</b>';
                }
                trackLegends += '</div></div>';
            }
            else{
                trackLegends += '<b>'+legend_name+':</b>';
                var list_vertical = Object.keys(colorscheme).length > 4;
                if(list_vertical)
                    trackLegends += '</div>';
                for(legend_data_type in colorscheme){
                    if(legend_data_type != 'other' && legend_data_type != 'not reported'){
                        trackLegends += (list_vertical ? '<div class="onco-track-list-item">' : '<div class="onco-track-item">') +
                                    '<div class="onco-track-legend" style="background: '+
                                        colorscheme[legend_data_type] +
                                    '"></div>' +
                                    legend_data_type +
                                    '</div>'
                    }
                }
                if(!list_vertical)
                    trackLegends += '</div>';
            }
        }
        trackLegends += '</div>';
        return trackLegends;
    }

    function initParams(donors, genes, observations, donorTracks){//, donor_track_dd_max, gene_track_ca_max){
        var params = {};
        params.element = active_plot_selector+' .grid-div';
        params.margin = { top: 0, right: 110, bottom: 40, left: 70 };
        params.height = 200;
        params.width = 700;
        params.heatMap = false;
        params.trackHeight = 12;
        params.trackLegendLabel = '<img class="oncogrid-track-label" style="width:13px;height:13px;margin-top:-7px;" src="'+ static_img_url+'question.png" alt="legend">';
        params.donorFillFunc = donorFill;
        params.donors = donors;
        params.donorTracks = donorTracks;
        params.grid = false;
        params.geneHistogramClick = function(){return;};
        params.donorHistogramClick = function(){return;};
        params.geneClick  = function(){return;};
        params.donorClick = function(){return;};
        params.donorOpacityFunc = function(d) {
            var opacity;
            var field_name = d.fieldName;
            if(field_name in clinical_legend['data']){
                if(clinical_legend['data'][field_name]['is_gradient']){
                    var full_val = clinical_legend['data'][field_name]['max_val'];
                    opacity = isNaN(d.value) ? 0 : d.value / full_val + 0.2;
                }
                else{
                    opacity = 1;
                }
            }
            else if(field_name in data_type_legend['data']){
                opacity = d.value ? 1 : 0;
            }
            else{
                opacity = 0;
            }
            return opacity;
        };
        params.genes = genes;
        params.geneTracks= geneTracks;
        params.geneFillFunc = geneFill;
        params.geneOpacityFunc = function(d){
            var opacity;
            switch (d.fieldName){
                case 'case_score':
                    var ca_max = isb_legend['data']['case_score']['max_val'];
                    opacity = (ca_max == 0 ? 0: d.value / ca_max);
                    break;
                case 'is_cgc':
                    opacity = d.value == 'true'? 1: 0;
                    break;
            }
            return opacity;

        };
        params.observations = observations;
        params.templates = mainGrid_templates;
        params.trackLegends ={
            'Clinical': getTrackLegends(clinical_legend['data']),
            'Data Types': getTrackLegends(data_type_legend['data']),
            'ISB-CGC': getTrackLegends(isb_legend['data']),
            'Gene Sets': getTrackLegends(cgc_legend['data'])
        };
        return params;
    }

    var updateOncogrid = function(donors, genes, observations, donor_track_count_max){
        clinical_legend['data']['days_to_death']['max_val'] = donor_track_count_max['days_to_death'];
        var donorTracks =[];
        //do not add donor tracks with no counts
        for (var i = 0; i< donorTracks_temp.length; i++){
            var fieldName = donorTracks_temp[i]['fieldName'];
            var max_count = donor_track_count_max[fieldName];
            if(max_count > 0) {
                donorTracks.push(donorTracks_temp[i]);
            }
            else{
                delete data_type_legend['data'][fieldName];
            }
        }

        var gene_track_ca_max = 0;
        for (var i=0; i<genes.length; i++){
            gene_track_ca_max = Math.max(gene_track_ca_max, genes[i]['case_score']);
        }
        isb_legend['data']['case_score']['max_val'] = gene_track_ca_max;
        var grid_params = initParams(donors, genes, observations, donorTracks);
        var grid = new OncoGrid(grid_params);
        console.log(grid);
        $(active_plot_selector).find('#grid-data').data('grid-data', grid);
        grid.render();
        updateToolBar(grid);

        drawMainGridLegend(active_plot_selector+' .oncogrid-legend');
        var legend_group = [obs_legends, clinical_legend, data_type_legend, isb_legend, cgc_legend];
        var y_offset = 0;
        for(var i = 0; i< legend_group.length; i++){
            drawSvgLegend(active_plot_selector+' .svg-track-legend', legend_group[i]['data'], legend_group[i]['label'], y_offset);
            var sub_legends = 0;
            for(var fieldname in legend_group[i]['data']){
                sub_legends += ((typeof legend_group[i]['data'][fieldname]['color'] == 'string') || (legend_group[i]['data'][fieldname]['is_gradient'])? 1 :
                    Object.keys(legend_group[i]['data'][fieldname]['color']).length-1);
            }
            var fontsize = 14;
            var title_fontsize = 14;
            var legend_height = sub_legends * fontsize + title_fontsize+18;
            y_offset+=legend_height;
        }

        $(active_plot_selector).find('.oncogrid-toolbar').on('click', '.cluster', cluster);
        $(active_plot_selector).find('.oncogrid-toolbar').on('click', '.heatmap-toggle',toggleHeatmap);
        $(active_plot_selector).find('.oncogrid-toolbar').on('click', '.grid-toggle', toggleGridLines);
        $(active_plot_selector).find('.oncogrid-toolbar').on('click', '.crosshair-toggle', toggleCrosshair);
        //events
        $(active_plot_selector).find('.oncogrid-button')
            .on('mouseover', function (e) {
                var tooltip_div = $(active_plot_selector).find('.og-tooltip-oncogrid');
                tooltip_div.html('<div class="wrapper">' + $(this).find('.button-text').html() + '</div>');
                tooltip_div
                    .css('left', ($(this).offset().left - $(active_plot_selector).offset().left +20)+"px")
                    .css('top', ($(this).offset().top - $(active_plot_selector).offset().top -28)+"px")
                    .css('opacity',0.9);
            })
            .on('mouseout', function () {
                var tooltip_div = $(active_plot_selector).find('.og-tooltip-oncogrid');
                tooltip_div
                    .css('opacity', 0);
            });
        $(active_plot_selector).find('.oncogrid-header').removeClass('hidden');
    };


    function drawMainGridLegend(selector){
        var column_offset = 100;
        var row_offset = 20;
        var svgLegend = d3.select(selector).append('svg')
            .attr('width', (d3.keys(obs_legends['data']).length)/2 * column_offset + 20)
            .attr('height', row_offset * 2);

        var mainGridLegend = svgLegend.selectAll(selector)
            .data(d3.keys(obs_legends['data']))
            .enter().append('g')
            .attr('transform', function(d, i){
                var x_offset = parseInt(i/2) * column_offset;
                var y_offset = i%2 == 0 ? 0 : row_offset;
                return 'translate('+x_offset+','+y_offset+')';
            });
        mainGridLegend.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', 10)
            .attr('height', 10)
            .style('fill', function(d) {
                return obs_legends['data'][d]['color'];
            });
        mainGridLegend.append('text')
            .attr('x', 12)
            .attr('y', 10)
            .text(function(d) {
                return obs_legends['data'][d]['name'];
            })
            .style('text-anchor', 'start')
            .style('font-size', 14);
    }

    function drawSvgLegend(selector, trackLegend, track_title, y_pos){

        var legend_rect_width = 10;
        var legend_rect_height = 10;
        var legend_rect_margin = 2;
        var width = 220;
        var row_offset = 14;
        var y_offset_cursor = y_pos;
        var fontsize = 11;
        var fontwidth = 6;
        var title_fontsize = 12;
        var title_row_offset = 16;

        var svgLegend = d3.select(selector).append('svg')
            .attr('width', width);
        svgLegend.append('text')
            .attr('x', 0)
            .attr('y', y_offset_cursor+title_fontsize)
            .text(track_title)
            .style('font-weight', 'bold')
            .style('text-anchor', 'start')
            .style('font-size', title_fontsize);
        y_offset_cursor += title_row_offset;

        var legendTracks = svgLegend.selectAll(selector)
            .data(d3.keys(trackLegend))
            .enter().append('g')
            .attr('transform', function(d, i){
                var subtrack_length = typeof trackLegend[d]['color'] == 'string' ? 1 : d3.keys(trackLegend[d]['color']).length -1;
                var x_offset = 0;
                var y_offset = y_offset_cursor;
                y_offset_cursor = y_offset + (row_offset) * subtrack_length;
                return 'translate('+x_offset+','+y_offset+')';
            });

        legendTracks.append('text')
            .attr('x', function(d){
                return typeof trackLegend[d]['color'] == 'string' ?
                    (trackLegend[d]['is_gradient']) ? 0:
                        legend_rect_width + legend_rect_margin : 0;
            })
            .attr('y', fontsize)
            .text(function(d) {
                return trackLegend[d]['name'];
            })
            .style('text-anchor', 'start')
            .style('font-size', fontsize);

        var legendSubTracks = legendTracks.append('g')
            .attr('transform', function(d, i){
                var sub_x_offset = 0;
                var sub_y_offset = 0;
                if(typeof trackLegend[d]['color'] == 'string'){
                    if(trackLegend[d]['is_gradient']) {
                        sub_x_offset = trackLegend[d]['name'].length * fontwidth + legend_rect_margin;
                    }
                }
                else{
                    sub_y_offset = row_offset;
                }

                return 'translate('+sub_x_offset+','+sub_y_offset+')';
            })
            .each(function(d){
                if(typeof trackLegend[d]['color'] == 'string'){
                    if(trackLegend[d]['is_gradient']){
                            d3.select(this).append('text')
                                .attr('x', 0)
                                .attr('y', fontsize)
                                .text('0')
                                .style('text-anchor', 'start')
                                .style('font-size', fontsize);
                            d3.select(this).append('text')
                                .attr('x', 5 * (legend_rect_width + legend_rect_margin) + fontwidth * 3)
                                .attr('y', fontsize)
                                .text(function (d) {
                                    return trackLegend[d]['max_val'] +(d == 'age_at_diagnosis' ? '+':'');
                                })
                                .style('text-anchor', 'start')
                                .style('font-size', fontsize);

                            for (var i = 0; i < 5; i++) {
                                d3.select(this).append('rect')
                                    .attr('x', i * (legend_rect_width + legend_rect_margin) + fontwidth * 2)
                                    .attr('y', legend_rect_margin)
                                    .attr('width', legend_rect_width)
                                    .attr('height', legend_rect_height)
                                    .attr('fill', trackLegend[d]['color'])
                                    .attr('opacity', 0.2 * (i + 1));
                            }
                    }
                    else{
                        d3.select(this)
                            .append('rect')
                                .attr('x', 0)
                                .attr('y', legend_rect_margin)
                                .attr('width', legend_rect_width)
                                .attr('height', legend_rect_height)
                                .attr('fill', trackLegend[d]['color']);
                    }
                }
                else{
                    var subtrack_titles = d3.keys(trackLegend[d]['color']);
                    var subtrack_colors = d3.values(trackLegend[d]['color']);
                    var sub_x_offset = 0;
                    var sub_y_offset = 0;
                    for(var i=0; i < subtrack_titles.length; i++) {
                        if(subtrack_titles[i] == 'other' || subtrack_titles[i] == 'not reported')
                            return;
                        sub_y_offset = i * row_offset;
                        d3.select(this)
                            .append('rect')
                                .attr('x', sub_x_offset)
                                .attr('y', sub_y_offset + legend_rect_margin)
                                .attr('width', legend_rect_width)
                                .attr('height', legend_rect_height)
                                .attr('fill', subtrack_colors[i]);

                        d3.select(this)
                            .append('text')
                                .attr('x', sub_x_offset + legend_rect_width + legend_rect_margin)
                                .attr('y', sub_y_offset + fontsize)
                                .text(function(d){
                                    return subtrack_titles[i];
                                })
                                .style('text-anchor', 'start')
                                .style('font-size', fontsize);

                    }
                }
            });
    }


    function getOncoGridSvgNode(){
        var legend_svg_width = 350;
        var svg_height = 580;
        var svg_css = 'svg { font-size: 10px; font-family: "proxima-nova", Arial, sans-serif; background-color: #fff; } ' +
            '.background { fill: #fff; stroke: black; stroke-width: 0.5; } '+
            '.og-track-group-label { font-size: 14px; } ' +
            'line { stroke: grey; stroke-opacity: 0.5; shape-rendering: crispEdges; } ';

        var svg = $(active_plot_selector).find('svg#og-maingrid-svg').clone();
        var canvas = $(active_plot_selector).find('canvas');

        svg.attr('width', parseInt(canvas.attr('width'))+legend_svg_width);
        svg.attr('height',svg_height);
        svg.removeAttr('viewBox');
        svg.find('foreignObject').remove();
        svg.prepend('<style>');
        svg.find('style').append(svg_css);

        var track_legends = $(active_plot_selector).find('.svg-track-legend svg').clone();
        track_legends.attr('x', canvas.attr('width'));
        for(var i=0; i <track_legends.length; i++){
            svg.append(track_legends[i]);
        }
        return svg;
    }


    function get_plot_data() {
        var grid = $(active_plot_selector).find('#grid-data').data('grid-data');
        var plot_data = {};
        if(grid){
            plot_data = {
                'genes' : grid.params.genes,
                'occurence': grid.params.observations,
                'cases' : grid.params.donors,
                'totalCases': grid.params.donors.length
            };
        }
        return plot_data;
    }

    var reload = function(){
        var grid = $(active_plot_selector).find('#grid-data').data('grid-data');
        if(grid) {
            grid.destroy();
        }
        grid = new OncoGrid(grid.params);
        $(active_plot_selector).find('#grid-data').data('grid-data', grid);
        grid.render();
        updateToolBar(grid);
    };

    function updateToolBar(grid) {
        if(grid){
            $(active_plot_selector).find('.heatmap-toggle').toggleClass('active', grid.heatMapMode);
            $(active_plot_selector).find('.grid-toggle').toggleClass('active', grid.drawGridLines);
            $(active_plot_selector).find('.crosshair-toggle').toggleClass('active', grid.crosshairMode);
        }
    }

    var cluster = function(){
        var grid = $(active_plot_selector).find('#grid-data').data('grid-data');
        grid.cluster();
    };

    var toggleHeatmap = function(){
        var grid = $(active_plot_selector).find('#grid-data').data('grid-data');
        grid.toggleHeatmap();
        $(active_plot_selector).find('.heatmap-toggle').toggleClass('active', grid.heatMapMode);
    };

    var toggleGridLines = function(){
        var grid = $(active_plot_selector).find('#grid-data').data('grid-data');
        grid.toggleGridLines();
        $(active_plot_selector).find('.grid-toggle').toggleClass('active', grid.drawGridLines);
    };

    var toggleCrosshair = function(){
        var grid = $(active_plot_selector).find('#grid-data').data('grid-data');
        grid.toggleCrosshair();
        $(active_plot_selector).find('.crosshair-toggle').toggleClass('active', grid.crosshairMode);
    };

    return {
        createOncogridPlot: function (donor_data, gene_data, observation_data, donor_track_count_max){
            if (donor_data.length > 0 && gene_data.length > 0 && observation_data.length) {
                updateOncogrid(donor_data, gene_data, observation_data, donor_track_count_max);
            }
            return {
                get_json: get_plot_data,
                get_svg: function(){ return getOncoGridSvgNode()[0]; },
                redraw: reload
            };
        }
    }
});

