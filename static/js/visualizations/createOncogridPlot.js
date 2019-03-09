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
            // { 'name': 'Clinical', 'fieldName': 'clinical', 'type': 'clinical', 'group': 'Data Types', 'sort': sortByIntDesc, 'template': datatype_track_template},
            { 'name': 'Biospecimen', 'fieldName': 'biospecimen', 'type': 'biospecimen', 'group': 'Data Types', 'sort': sortByIntDesc, 'template': datatype_track_template},
            { 'name': 'Raw Sequencing Data', 'fieldName': 'rsd', 'type': 'rsd', 'group': 'Data Types', 'sort': sortByIntDesc, 'template': datatype_track_template},
            { 'name': 'Simple Nucleotide Variation', 'fieldName': 'snv', 'type': 'snv', 'group': 'Data Types', 'sort': sortByIntDesc, 'template': datatype_track_template}
            // { 'name': 'Copy Number Variation', 'fieldName': 'cnv', 'type': 'cnv', 'group': 'Data Types', 'sort': sortByIntDesc, 'template': datatype_track_template},
            // { 'name': 'Gene Expression', 'fieldName': 'gene_exp', 'type': 'gene_exp', 'group': 'Data Types', 'sort': sortByIntDesc, 'template': datatype_track_template}
        ];

    var donorFill = function (d) {
        var name = d.displayName;
        var data_value = d.value ? d.value.toLowerCase() : 'not reported';
        var fill_color;
        if (data_value === 'not reported')
            return 'white';
        switch (name){
            case 'Race':
            case 'Vital Status':
            case 'Gender':
            case 'Ethnicity':
                if (!data_value in clinical_legend)
                    data_value = 'other';
                fill_color = clinical_legend[name][data_value];
                break;
            case 'Age at Diagnosis':
            case 'Days to Death':
                fill_color = clinical_legend[name];
                break;
            // case 'Clinical':
            case 'Biospecimen':
            case 'Raw Sequencing Data':
            case 'Simple Nucleotide Variation':
            // case 'Copy Number Variation':
            // case 'Gene Expression':
                fill_color = data_type_legend[name];
                break;
            default:
                fill_color = 'mediumpurple';
                break;
        }
        return fill_color;
    };

    const mainGrid_templates = {
        'mainGrid':'<div class="wrapper">{{#observation}} Case: {{observation.case_code}} <br> Gene: {{observation.geneId}} <br> Consequence: {{observation.consequence}} <br> {{/observation}}</div>',
        'mainGridCrosshair': '<div class="wrapper">{{#donor}} Case: {{donor.case_code}} <br> {{/donor}} {{#gene}}Gene: {{gene.symbol}} <br> {{/gene}}</div>'
    };

    const geneFill = function(d){
        switch(d.displayName){
            case 'Cancer Gene Census':
                fill_color = 'darkgreen';
                break;
            default:
                fill_color = 'mediumpurple';
        }
        return fill_color;
    };

    const clinical_legend = {
        'Race': {
            'american indian or alaska native': '#98df8a',
            'asian': '#aec7e8',
            'black or african american': '#ffbb78',
            'native hawaiian or other pacific islander': '#2ca02c',
            'white': '#1f77b4',
            'not reported': 'white',
            'other': 'lightgrey'
        },
        'Vital Status': {
            'alive': '#1693c0',
            'dead': 'darkred',
            'not reported': 'white',
            'other': 'lightgrey'
        },
        'Gender': {
            'male': '#420692',
            'female': '#dc609c',
            'not reported': 'white',
            'other': 'lightgrey'
        },
        'Ethnicity': {
            'not hispanic or latino': '#d62728',
            'hispanic or latino': '#ff9896',
            'not reported': 'white',
            'other': 'lightgrey'
        },
        'Age at Diagnosis': 'darkslategrey',
        'Days to Death': 'blue'
    };

    const data_type_legend = {
        // 'Clinical' : 'darkkhaki',
        'Biospecimen' : 'darkslategrey',
        'Raw Sequencing Data' : 'cyan',
        'Simple Nucleotide Variation': 'darkkhaki',
        // 'Copy Number Variation': 'darksalmon',
        // 'Gene Expression':'forestgreen'
    };

    const isb_legend = {
        '# of Cases Affected': 'mediumpurple'
    };

    const cgc_legend = {
        'Gene belongs to Cancer Gene Census': 'darkgreen'
    };

    const obs_legends = {
        'missense': '#ff9b6c',
        'frame shift': '#57dba4',
        'start lost': '#ff2323',
        'stop lost': '#d3ec00',
        'initiator codon': '#5abaff',
        'stop gained': '#af57db'
    };

    function getTrackLegends(legends, donor_track_dd_max, gene_track_ca_max){
        var trackLegends = '<div class="wrapper">';
        for(var legend_name in legends){
            var colorscheme = legends[legend_name];
            trackLegends += '<div>';
            if(typeof colorscheme == "string"){
                trackLegends += '<div>';
                switch (legend_name){
                    case 'Age at Diagnosis':
                    case 'Days to Death':
                    case '# of Cases Affected':
                        trackLegends += '<b>'+legend_name+':</b>';
                        if (legend_name == '# of Cases Affected')
                            trackLegends += '<br/>';
                        trackLegends += ' 0';
                        for(var i = 1; i<6; i++){
                            trackLegends += '<div class="onco-track-legend" style="background: '+ colorscheme +'; opacity:'+ (i*0.2)+'"></div>';
                        }
                        trackLegends += (legend_name == 'Days to Death') ? donor_track_dd_max :
                                            (legend_name == '# of Cases Affected') ? gene_track_ca_max : '100+';

                        break;
                    default:
                        trackLegends += '<div class="onco-track-legend" style="background: '+colorscheme +';"></div><b>'+legend_name+'</b>';
                        break;
                }
                trackLegends += '</div></div>';
            }
            else{
                trackLegends += '<b>'+legend_name+':</b>';
                if(Object.keys(colorscheme).length > 4)
                    trackLegends += '</div>';
                for(legend_data_type in colorscheme){
                    if(legend_data_type != 'other' && legend_data_type != 'not reported'){
                        trackLegends += (Object.keys(colorscheme).length > 4 ? '<div class="onco-track-list-item">' : '<div class="onco-track-item">') +
                                    '<div class="onco-track-legend" style="background: '+
                                        colorscheme[legend_data_type] +
                                    '"></div>' +
                                    legend_data_type +
                                    '</div>'
                    }
                }
                if(Object.keys(colorscheme).length <= 4)
                    trackLegends += '</div>';
            }
        }
        trackLegends += '</div>';
        return trackLegends;
    }

    function initParams(donors, genes, observations, donorTracks, donor_track_dd_max, gene_track_ca_max){
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
            switch (d.fieldName){
                case 'age_at_diagnosis':
                case 'days_to_death':
                    var full_val = (d.fieldName == 'age_at_diagnosis' ? 100 : donor_track_dd_max);
                    opacity = isNaN(d.value) ? 0 : d.value / full_val + 0.2;
                    break;
                case 'gender':
                case 'vital_status':
                case 'race':
                case 'ethnicity':
                    opacity = 1;
                    break;
                // case 'clinical':
                case 'biospecimen':
                case 'rsd':
                case 'snv':
                // case 'cnv':
                // case 'gene_exp':
                    opacity = d.value ? 1 : 0;
                    break;
                default:
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
                    opacity = (gene_track_ca_max == 0 ? 0: d.value / gene_track_ca_max);
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
            'Clinical': getTrackLegends(clinical_legend, donor_track_dd_max, gene_track_ca_max),
            'Data Types': getTrackLegends(data_type_legend, donor_track_dd_max, gene_track_ca_max),
            'ISB-CGC': getTrackLegends(isb_legend, donor_track_dd_max, gene_track_ca_max),
            'Gene Sets': getTrackLegends(cgc_legend, donor_track_dd_max, gene_track_ca_max)
        };
        return params;
    }

    var updateOncogrid = function(donors, genes, observations, donor_track_count_max){
        var donor_track_dd_max = donor_track_count_max['days_to_death'];
        var donorTracks =[];
        //do not add donor tracks with no counts
        for (var i = 0; i< donorTracks_temp.length; i++){
            var fieldName = donorTracks_temp[i]['fieldName'];
            var max_count = donor_track_count_max[fieldName];
            if(max_count > 0) {
                donorTracks.push(donorTracks_temp[i]);
            }
        }
        var gene_track_ca_max = 0;
        for (var i=0; i<genes.length; i++){
            gene_track_ca_max = Math.max(gene_track_ca_max, genes[i]['case_score']);
        }
        var grid_params = initParams(donors, genes, observations, donorTracks, donor_track_dd_max, gene_track_ca_max);
        var grid = new OncoGrid(grid_params);
        $(active_plot_selector).find('#grid-data').data('grid-data', grid);
        grid.render();
        updateToolBar(grid);

        drawMainGridLegend(active_plot_selector+' .oncogrid-legend');
        drawSvgLegend(active_plot_selector+' .svg-track-legend', obs_legends, 'Mutation', 20);
        drawSvgLegend(active_plot_selector+' .svg-track-legend', clinical_legend, 'Clinical', 140, donor_track_dd_max, gene_track_ca_max);
        drawSvgLegend(active_plot_selector+' .svg-track-legend', data_type_legend, 'Data Type', 415);
        drawSvgLegend(active_plot_selector+' .svg-track-legend', isb_legend, 'ISB-CGC', 495, donor_track_dd_max, gene_track_ca_max);
        drawSvgLegend(active_plot_selector+' .svg-track-legend', cgc_legend, 'Gene Set', 535);

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
            .attr('width', (d3.keys(obs_legends).length)/2 * column_offset + 20)
            .attr('height', row_offset * 2);

        var mainGridLegend = svgLegend.selectAll(selector)
            .data(d3.keys(obs_legends))
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
                return obs_legends[d];
            });
        mainGridLegend.append('text')
            .attr('x', 12)
            .attr('y', 10)
            .text(function(d) {
                return d;
            })
            .style('text-anchor', 'start')
            .style('font-size', 14);
    }

    function drawSvgLegend(selector, trackLegend, track_title, y_pos, donor_track_dd_max, gene_track_ca_max){

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
                var subtrack_length = typeof trackLegend[d] == 'string' ? 1 : d3.keys(trackLegend[d]).length -1;
                var x_offset = 0;
                var y_offset = y_offset_cursor;
                y_offset_cursor = y_offset + (row_offset) * subtrack_length;
                return 'translate('+x_offset+','+y_offset+')';
            });

        legendTracks.append('text')
            .attr('x', function(d){
                return typeof trackLegend[d] == 'string' ?
                    (d == 'Days to Death' || d == '# of Cases Affected' || d == 'Age at Diagnosis') ? 0:
                        legend_rect_width + legend_rect_margin : 0;
            })
            .attr('y', fontsize)
            .text(function(d) {
                return d;
            })
            .style('text-anchor', 'start')
            .style('font-size', fontsize);

        var legendSubTracks = legendTracks.append('g')
            .attr('transform', function(d, i){
                var sub_x_offset = 0;
                var sub_y_offset = 0;
                if(typeof trackLegend[d] == 'string'){
                    if(d == 'Days to Death' || d == '# of Cases Affected' || d == 'Age at Diagnosis') {
                        sub_x_offset = d.length * fontwidth + legend_rect_margin;
                    }
                }
                else{
                    sub_y_offset = row_offset;
                }

                return 'translate('+sub_x_offset+','+sub_y_offset+')';
            })
            .each(function(d){
                if(typeof trackLegend[d] == 'string'){
                    switch(d) {
                        case 'Days to Death':
                        case '# of Cases Affected':
                        case 'Age at Diagnosis':
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
                                    return (d == 'Days to Death') ? donor_track_dd_max :
                                        (d == '# of Cases Affected') ? gene_track_ca_max : '100+';
                                })
                                .style('text-anchor', 'start')
                                .style('font-size', fontsize);

                            for (var i = 0; i < 5; i++) {
                                d3.select(this).append('rect')
                                    .attr('x', i * (legend_rect_width + legend_rect_margin) + fontwidth * 2)
                                    .attr('y', legend_rect_margin)
                                    .attr('width', legend_rect_width)
                                    .attr('height', legend_rect_height)
                                    .attr('fill', trackLegend[d])
                                    .attr('opacity', 0.2 * (i + 1));
                            }
                            break;
                        default:
                            var sub_x_offset = 0;
                            d3.select(this)
                            .append('rect')
                                .attr('x', sub_x_offset)
                                .attr('y', legend_rect_margin)
                                .attr('width', legend_rect_width)
                                .attr('height', legend_rect_height)
                                .attr('fill', trackLegend[d]);
                            break;
                    }
                }
                else{
                    var subtrack_titles = d3.keys(trackLegend[d]);
                    var subtrack_colors = d3.values(trackLegend[d]);
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



    /*function download_svg(){
        var svgNode = getOncoGridSvgNode();
        var xmlSerializer = new XMLSerializer();
        var content = xmlSerializer.serializeToString(svgNode[0]);
		var blob = new Blob([content], {type: 'application/svg+xml'});
		saveAs(blob, 'oncogrid.svg');
    }

    function download_png() {
        var svgNode = getOncoGridSvgNode();
        var xmlSerializer = new XMLSerializer();
		var content = xmlSerializer.serializeToString(svgNode[0]);
        var width = svgNode.attr('width') || 1495;
        var height = svgNode.attr('height') || 650;
        svgString2Image(content, width, height, function(dataBlob){
            saveAs( dataBlob, 'oncogrid.png' )
        });
    }*/

    function get_plot_data() {
        var grid = $(active_plot_selector).find('#grid-data').data('grid-data');
        var plot_data = {}
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

    /*function svgString2Image(svgString, width, height, callback) {
        //convert SVG string to data URL
        var imgsrc = 'data:image/svg+xml;base64,'+ btoa(decodeURIComponent(encodeURIComponent(svgString)));
        var canvas = document.createElement('canvas');
        var context = canvas.getContext("2d");
        canvas.width = width;
        canvas.height = height;
        var image = new Image();
        image.onload = function() {
            context.clearRect (0, 0, width, height);
            context.drawImage(image, 0, 0, width, height);
            canvas.toBlob( function(blob) {
                if (callback) callback(blob);
            });
        };
        image.src = imgsrc;
    }*/

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

