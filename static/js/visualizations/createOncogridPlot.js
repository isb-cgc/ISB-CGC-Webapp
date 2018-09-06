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
define (['jquery', 'oncogridjs'],
    function ($, oncogridjs) {
    var oncogrid_plot_div;
    var grid;
    var fullscreen = false;
    var default_track_template = '<div class="wrapper">{{displayId}}<br>{{displayName}}: {{displayValue}}</div>';
    var datatype_track_template = '<div class="wrapper">{{displayId}}<br>{{displayName}}: {{displayValue}} file(s)</div>';

    var geneTracks = [
            {'name': '#Cases affected', 'fieldName': 'case_score', 'type': 'int', 'group': 'GDC', 'template': default_track_template},
        ];

    var sortByString = function (field) {
        return function (a, b) {
            if(a[field].toLowerCase() == 'not reported')
                return 1;
            else if(b[field].toLowerCase() == 'not reported')
                return -1;
            else
                return a[field].localeCompare(b[field]);
        };
    };

    var sortByIntDesc = function (field) {
        return function (a, b) {
            var a_int = a[field] == 'Not Reported' ? -1 : a[field];
            var b_int = b[field] == 'Not Reported' ? -1 : b[field];
            return b_int - a_int;
        };
    };

    var donorTracks_temp = [
            { 'name': 'Race', 'fieldName': 'race', 'type': 'race', 'group': 'Clinical', 'sort': sortByString, 'template': default_track_template },
            { 'name': 'Age at Diagnosis', 'fieldName': 'age_at_diagnosis', 'type': 'age', 'group': 'Clinical', 'sort': sortByIntDesc, 'template': default_track_template},
            { 'name': 'Vital Status', 'fieldName': 'vital_status', 'type': 'vital', 'group': 'Clinical', 'sort': sortByString, 'template': default_track_template},
            { 'name': 'Days to Death', 'fieldName': 'days_to_death', 'type': 'dd', 'group': 'Clinical', 'sort': sortByIntDesc, 'template': default_track_template},
            { 'name': 'Gender', 'fieldName': 'gender', 'type': 'gender', 'group': 'Clinical', 'sort': sortByString, 'collapsed': true, 'template': default_track_template},
            { 'name': 'Ethnicity', 'fieldName': 'ethnicity', 'type': 'ethnicity', 'group': 'Clinical', 'sort': sortByString, 'collapsed': true, 'template': default_track_template},
            { 'name': 'Clinical', 'fieldName': 'clinical', 'type': 'clinical', 'group': 'Data Types', 'sort': sortByIntDesc, 'template': datatype_track_template},
            { 'name': 'Biospecimen', 'fieldName': 'biospecimen', 'type': 'biospecimen', 'group': 'Data Types', 'sort': sortByIntDesc, 'template': datatype_track_template},
            { 'name': 'Raw Sequencing Data', 'fieldName': 'rsd', 'type': 'rsd', 'group': 'Data Types', 'sort': sortByIntDesc, 'template': datatype_track_template},
            { 'name': 'Simple Nucleotide Variation', 'fieldName': 'snv', 'type': 'snv', 'group': 'Data Types', 'sort': sortByIntDesc, 'template': datatype_track_template},
            { 'name': 'Copy Number Variation', 'fieldName': 'cnv', 'type': 'cnv', 'group': 'Data Types', 'sort': sortByIntDesc, 'template': datatype_track_template},
            { 'name': 'Gene Expression', 'fieldName': 'gene_exp', 'type': 'gene_exp', 'group': 'Data Types', 'sort': sortByIntDesc, 'template': datatype_track_template},
        ];

    var donorFill = function (d) {
        var data_type = d.type;
        var data_value = d.value ? d.value.toLowerCase() : 'not reported';
        var fill_color;
        if (data_value === 'not reported')
            return 'white';
        switch (data_type){
            case 'race':
            case 'vital':
            case 'gender':
            case 'ethnicity':
                if (!data_value in data_type_legend)
                    data_value = 'other';
                fill_color = data_type_legend[data_type][data_value];
                break;
            case 'age':
            case 'dd':
            case 'clinical':
            case 'biospecimen':
            case 'rsd':
            case 'snv':
            case 'cnv':
                fill_color = data_type_legend[data_type];
                break;
            default:
                fill_color = 'mediumpurple';
                break;
        }
        return fill_color;
    };

    var mainGrid_templates = {
        'mainGrid':'<div class="wrapper">{{#observation}} Case: {{observation.case_code}} <br> Gene: {{observation.geneId}} <br> Consequence: {{observation.consequence}} <br> {{/observation}}</div>',
        'mainGridCrosshair': '<div class="wrapper">{{#donor}} Case: {{donor.case_code}} <br> {{/donor}} {{#gene}}Gene: {{gene.symbol}} <br> {{/gene}}</div>'
    };

    var geneFill = function(d){
        return 'mediumpurple';
    };

    var params = {
        element: '#grid-div',
        margin: { top: 40, right: 100, bottom: 80, left: 50 },
        height: 200,
        width: 700,
        heatMap: false,
        trackHeight: 12,
        trackLegendLabel: '<img class="oncogrid-track-label" style="width:13px;height:13px;margin-top:-7px;" src="/static/img/question.png" alt="legend">',//todo:change this to static path
        donorFillFunc: donorFill,
        geneTracks: geneTracks,
        geneFillFunc: geneFill,
        expandableGroups: ['Clinical'],
        templates: mainGrid_templates
        };

    var updateOncogrid = function(plot_selector, donors, genes, observations, donor_track_count_max){
        oncogrid_plot_div = $(plot_selector).find('.oncogrid-screen')[0];
        //console.log(oncogrid_plot_div[0].id);
        params['donors'] = donors;
        params['genes'] = genes;
        params['observations'] = observations;

        var donorTracks =[];
        //do not add donor tracks with no counts
        for (var i = 0; i< donorTracks_temp.length; i++){
            var fieldName = donorTracks_temp[i]['fieldName'];
            var max_count = donor_track_count_max[fieldName];
            if(max_count > 0) {
                donorTracks.push(donorTracks_temp[i]);
            }
        }
        params['donorTracks'] = donorTracks;
        params['donorOpacity'] = function (d) {
            var opacity;
            switch (d.fieldName){
                case 'age_at_diagnosis':
                case 'days_to_death':
                    var full_val = donor_track_count_max[d.fieldName] == 0 ? 100 : donor_track_count_max[d.fieldName];
                    opacity = d.value ? (d.value != 'not reported' ? d.value / full_val : 1) : 0;
                    break;
                case 'gender':
                case 'vital_status':
                case 'race':
                case 'ethnicity':
                    opacity = 1;
                    break;
                case 'clinical':
                case 'biospecimen':
                case 'rsd':
                case 'snv':
                case 'cnv':
                case 'gene_exp':
                    opacity = d.value ? 1 : 0;
                    break;
                default:
                    opacity = 0;
            }
            return opacity;
        };

        var max_case_count = 0;
        for (var i=0; i<genes.length; i++){
            max_case_count = Math.max(max_case_count, genes[i]['case_score']);
        }
        params['geneOpacityFunc'] = function (d) {
            return d.value / max_case_count;
        };
        grid = new OncoGrid(params);
        grid.render();


        $('.oncogrid-toolbar').on('click', '.reload', reload);
        $('.oncogrid-toolbar').on('click', '.cluster', function(){grid.cluster();});
        $('.oncogrid-toolbar').on('click', '.heatmap-toggle', toggleHeatmap);
        $('.oncogrid-toolbar').on('click', '.grid-toggle', toggleGridLines);
        $('.oncogrid-toolbar').on('click', '.crosshair-toggle', toggleCrosshair);
        $('.oncogrid-toolbar').on('click', '.fullscreen-toggle', toggleFullscreen);

        //events
        $('.oncogrid-button')
            .on('mouseover', function (e) {
                var tooltip_div = $('.og-tooltip-oncogrid');
                tooltip_div.html('<div class="wrapper">' + $(this).find('.button-text').html() + '</div>');
                tooltip_div
                    .css('left', ($(this).offset().left - $('.plot-div').offset().left +20)+"px")
                    .css('top', ($(this).offset().top - $('.plot-div').offset().top -28)+"px")
                    .css('opacity',0.9);
            })
            .on('mouseout', function () {
                var tooltip_div = $('.og-tooltip-oncogrid');
                tooltip_div
                    .css('opacity', 0);
            });


        $(document).bind('webkitfullscreenchange MSFullscreenChange mozfullscreenchange fullscreenchange', function(e) {
            fullscreen = document.fullScreen || document.mozFullScreen || document.webkitIsFullScreen;
            $('.fullscreen-toggle').toggleClass('active', fullscreen);
        });
    };


    var reload = function(){
        grid.destroy();
        grid = new OncoGrid(params);
        grid.render();
        $('.heatmap-toggle').removeClass('active');
        $('.grid-toggle').removeClass('active');
        $('.crosshair-toggle').removeClass('active');
    };

    var toggleHeatmap = function(){
        grid.toggleHeatmap();
        $('.heatmap-toggle').toggleClass('active', grid.heatMapMode);

    };
    var toggleGridLines = function(){
        grid.toggleGridLines();
        $('.grid-toggle').toggleClass('active', grid.drawGridLines);

    };
    var toggleCrosshair = function(){
        grid.toggleCrosshair();
        $('.crosshair-toggle').toggleClass('active', grid.crosshairMode);
    };

    var toggleFullscreen = function(){
        if(fullscreen){
            closeFullscreen();
        }
        else{
            openFullscreen();
        }
    };

    var openFullscreen = function() {
        var oncogrid_div_id = oncogrid_plot_div.id;
        var oncogrid_div = document.getElementById(oncogrid_div_id);
        console.log(oncogrid_div);
        if (oncogrid_div.requestFullscreen) {
            oncogrid_div.requestFullscreen();
        } else if (oncogrid_div.mozRequestFullScreen) { /* Firefox */
            oncogrid_div.mozRequestFullScreen();
        } else if (oncogrid_div.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
            oncogrid_div.webkitRequestFullscreen();
        } else if (oncogrid_div.msRequestFullscreen) { /* IE/Edge */
            oncogrid_div.msRequestFullscreen();
        }

    };

    var closeFullscreen = function() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) { /* Firefox */
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) { /* Chrome, Safari and Opera */
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { /* IE/Edge */
            document.msExitFullscreen();
        }
    };



    var data_type_legend = {
        'race': {
            'american indian or alaska native': '#98df8a',
            'asian': '#aec7e8',
            'black or african american': '#ffbb78',
            'native hawaiian or other pacific islander': '#2ca02c',
            'white': '#1f77b4',
            'not reported': 'white',
            'other': 'lightgrey'
        },
        'vital': {
            'alive': '#1693c0',
            'dead': 'darkred',
            'not reported': 'white',
            'other': 'lightgrey'
        },
        'gender': {
            'male': '#420692',
            'female': '#dc609c',
            'not reported': 'white',
            'other': 'lightgrey'
        },
        'ethnicity': {
            'not hispanic or latino': '#d62728',
            'hispanic or latino': '#ff9896',
            'not reported': 'white',
            'other': 'lightgrey'
        },
        'age' : 'darkslategrey',
        'dd' : 'blue',
        'clinical' : 'darkkhaki',
        'biospecimen' : 'darkslategrey',
        'rsd' : 'cyan',
        'snv': 'darkkhaki',
        'cnv': 'darksalmon'
    };

    return {
        createOncogridPlot: function (plot_selector, donor_data, gene_data, observation_data, donor_track_count_max){
            //obs_donors) {
            if (donor_data.length > 0 && gene_data.length > 0 && observation_data.length) {
                updateOncogrid(plot_selector, donor_data, gene_data, observation_data, donor_track_count_max);//, obs_donors);
            }
        }
    }
});

