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
    var grid;
    var updateOncogrid = function(donors, genes, observations, donor_track_count_max){
        //console.log(donors);
        //console.log(genes);
        //console.log(observations);
        //console.log(observations);

        var track_template = '<div class="wrapper">{{displayId}}<br>{{displayName}}: {{displayValue}}</div>';
        var donorTracks_temp = [
            { 'name': 'Race', 'fieldName': 'race', 'type': 'race', 'group': 'Clinical', 'sort': sortByString, 'template': track_template },
            { 'name': 'Age at Diagnosis', 'fieldName': 'age_at_diagnosis', 'type': 'age', 'group': 'Clinical', 'sort': sortByInt, 'template': track_template},
            { 'name': 'Vital Status', 'fieldName': 'vital_status', 'type': 'vital', 'group': 'Clinical', 'sort': sortByInt, 'template': track_template},
            { 'name': 'Days to Death', 'fieldName': 'days_to_death', 'type': 'dd', 'group': 'Clinical', 'sort': sortByInt, 'template': track_template},
            { 'name': 'Gender', 'fieldName': 'gender', 'type': 'gender', 'group': 'Clinical', 'sort': sortByString, 'collapsed': true, 'template': track_template},
            { 'name': 'Ethnicity', 'fieldName': 'ethnicity', 'type': 'ethnicity', 'group': 'Clinical', 'sort': sortByString, 'collapsed': true, 'template': track_template},
            { 'name': 'Clinical', 'fieldName': 'clinical', 'type': 'clinical', 'group': 'Data Types', 'sort': sortByInt, 'template': track_template},
            { 'name': 'Biospecimen', 'fieldName': 'biospecimen', 'type': 'biospecimen', 'group': 'Data Types', 'sort': sortByInt, 'template': track_template},
            { 'name': 'Raw Sequencing Data', 'fieldName': 'rsd', 'type': 'rsd', 'group': 'Data Types', 'sort': sortByInt, 'template': track_template},
            { 'name': 'Simple Nucleotide Variation', 'fieldName': 'snv', 'type': 'snv', 'group': 'Data Types', 'sort': sortByInt, 'template': track_template},
            { 'name': 'Copy Number Variation', 'fieldName': 'cnv', 'type': 'cnv', 'group': 'Data Types', 'sort': sortByInt, 'template': track_template},
            { 'name': 'Gene Expression', 'fieldName': 'gene_exp', 'type': 'gene_exp', 'group': 'Data Types', 'sort': sortByInt, 'template': track_template},
        ];
        var donorTracks =[];

        for(var i = 0; i< donorTracks_temp.length; i++){
            var fieldName = donorTracks_temp[i]['fieldName'];
            var max_count = donor_track_count_max[fieldName];
            if(max_count > 0)
                donorTracks.push(donorTracks_temp[i]);
        }
        //console.log(donorTracks);
        var geneTracks = [
            {'name': '#Cases affected', 'fieldName': 'case_score', 'type': 'int', 'group': 'GDC', 'template': track_template},
        ];

        var mainGrid_templates = {
            'mainGrid':'<div class="wrapper">{{#observation}} Case: {{observation.donorId}} <br> Gene: {{observation.geneId}} <br> Consequence: {{observation.consequence}} <br> {{/observation}}</div>',
            'mainGridCrosshair': '{{#donor}} Donor: {{donor.id}} <br> {{/donor}} {{#gene}}Gene: {{gene.symbol}} <br> {{/gene}} {{#obs}}Mutations: {{obs}} <br> {{/obs}}'
        };

        var donorOpacity = function (d) {
            //console.log(donor_track_count_max);
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
        /*colorMap = {
            'missense_variant': '#ff9b6c',
            'frameshift_variant': '#57dba4',
            'stop_gained': '#af57db',
            'start_lost': '#ff2323',
            'stop_lost': '#d3ec00',
            'initiator_codon_variant': '#5abaff'
        };*/


        var params = {
            element: '#grid-div',
            donors: donors,
            genes: genes,
            observations: observations,
            height: 150,
            width: 600,
            heatMap: false,
            trackHeight: 20,
            trackLegendLabel: '<i>?</i>',
            donorTracks: donorTracks,
            donorOpacityFunc: donorOpacity,
            donorFillFunc: donorFill,
            //colorMap: colorMap,
            geneTracks: geneTracks,
            geneOpacityFunc: geneOpacity,
            geneFillFunc: geneFill,
            expandableGroups: ['Clinical'],
            templates: mainGrid_templates

        };

        grid = new OncoGrid(params);
        grid.render();
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
        'cnv': 'darksalmon',
        'gene_exp': 'mediumseagreen'
    };


    var geneFill =function(d){
        return 'mediumpurple';
    }
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
        /*if (d.type === 'race') {
            var race = d.value.toLowerCase() in legend_race ? d.value.toLowerCase() : 'other';
            return legend_race[race];
        }
        else if (d.type === 'age') {
            return 'darkslategrey';
        }
        else if (d.type === 'vital'){
            var vital_status = d.value.toLowerCase() in legend_vital ? d.value.toLowerCase() : 'unknown';
            return legend_vital[vital_status];
        } else if (d.type === 'dd'){
            return d.value == 'None' ? 'white':'blue';
        } else if (d.type === 'gender'){
            return legend_gender[d.value.toLowerCase()]
        } else if (d.type === 'ethnicity'){
            return legend_ethnicity[d.value.toLowerCase()];
        }*/
    };

    var geneOpacity = function (d) {
        return d.value / 400;
    };

    var sortByBool = function (field) {
        return function (a, b) {
            if (a[field] && !b[field]) {
                return 1;
            } else if (!a[field] && b[field]) {
                return -1;
            } else {
                return 0;
            }
        };
    };

    var sortByInt = function (field) {
        return function (a, b) {
            return a[field] - b[field];
        };
    };

    var sortByString = function () {
        return function (a, b) {
            return a - b;
        }
    };

        // var grid = new OncoGrid(params);
        //
        // grid.render();

    function removeCleanDonors() {
        var criteria = function (d) {
            return d.score === 0;
        };
        grid.removeDonors(criteria);
    }

    function toggleCrosshair() {
        grid.toggleCrosshair();
    }

    function toggleGridLines() {
        grid.toggleGridLines();
    }

    function resize() {
        var width = document.getElementById('width-resize').value;
        var height = document.getElementById('height-resize').value;
        grid.resize(width, height);
    }

        // function renderOncogrid(){
        //     grid.render();
        // }
    return {
        createOncogridPlot: function (donor_data, gene_data, observation_data, donor_track_count_max) {
            if (donor_data.length > 0 && gene_data.length > 0 && observation_data.length) {
                updateOncogrid(donor_data, gene_data, observation_data, donor_track_count_max);
            }
        }
    }
})
