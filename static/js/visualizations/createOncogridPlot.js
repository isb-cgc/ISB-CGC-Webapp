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
    var updateOncogrid = function(donors, genes, observations){
        console.log(donors);
        console.log(genes);
        console.log(observations);
        /*var track = {
            'template':'<div class="wrapper">{{displayId}}<br>{{displayName}}: {{displayValue}}</div>'
        }*/
        var track_template = '<div class="wrapper">{{displayId}}<br>{{displayName}}: {{displayValue}}</div>';
        var donorTracks = [
            { 'name': 'Race', 'fieldName': 'race', 'type': 'race', 'group': 'Clinical', 'sort': sortByString, 'template': track_template },
            { 'name': 'Age at Diagnosis', 'fieldName': 'age_at_diagnosis', 'type': 'int', 'group': 'Clinical', 'sort': sortByInt, 'template': track_template},
            { 'name': 'Vital Status', 'fieldName': 'vital_status', 'type': 'vital', 'group': 'Clinical', 'sort': sortByInt, 'template': track_template},
            { 'name': 'Days to Death', 'fieldName': 'days_to_death', 'type': 'int', 'group': 'Clinical', 'sort': sortByInt, 'template': track_template},
            { 'name': 'Gender', 'fieldName': 'gender', 'type': 'gender', 'group': 'Clinical', 'sort': sortByString, 'template': track_template},
            { 'name': 'Ethnicity', 'fieldName': 'ethnicity', 'type': 'ethnicity', 'group': 'Clinical', 'sort': sortByString, 'collapsed': true, 'template': track_template},
            { 'name': 'Clinical', 'fieldName': 'clinical', 'type': 'int', 'group': 'Data Types', 'sort': sortByInt, 'template': track_template},
            { 'name': 'Biospecimen', 'fieldName': 'biospecimen', 'type': 'int', 'group': 'Data Types', 'sort': sortByInt, 'template': track_template},
            { 'name': 'Raw Sequencing Data', 'fieldName': 'rsd', 'type': 'int', 'group': 'Data Types', 'sort': sortByInt, 'template': track_template},
            { 'name': 'Simple Nucleotide Variation', 'fieldName': 'snv', 'type': 'int', 'group': 'Data Types', 'sort': sortByInt, 'template': track_template},
        ];

        var geneTracks = [
            {'name': '#Cases affected', 'fieldName': 'case_score', 'type': 'int', 'group': 'GDC', 'template': track_template},
        ];

        var mainGrid_templates = {
            'mainGrid':'<div class="wrapper">{{#observation}} Case: {{observation.donorId}} <br> Gene: {{observation.geneId}} <br> Consequence: {{observation.consequence}} <br> {{/observation}}</div>',
            'mainGridCrosshair': '{{#donor}} Donor: {{donor.id}} <br> {{/donor}} {{#gene}}Gene: {{gene.symbol}} <br> {{/gene}} {{#obs}}Mutations: {{obs}} <br> {{/obs}}'
        };

        var params = {
            element: '#grid-div',
            donors: donors,
            genes: genes,
            observations: observations,
            height: 450,
            width: 600,
            heatMap: true,
            trackHeight: 20,
            trackLegendLabel: '<i>?</i>',
            donorTracks: donorTracks,
            donorOpacityFunc: donorOpacity,
            donorFillFunc: donorFill,
            geneTracks: geneTracks,
            geneOpacityFunc: geneOpacity,
            expandableGroups: ['Clinical'],
            templates: mainGrid_templates

        };

        grid = new OncoGrid(params);
        grid.render();
    };


    var donorOpacity = function (d) {
        if (d.type === 'int') {
            return d.value ? d.value / 30 : 0;
        } else if (d.type === 'vital') {
            return d.value.toLowerCase() =='alive' ? 1 : 0;
        } else if (d.type === 'gender') {
            return d.value.toLowerCase() =='female' ? 1 : 0.5;
        } else if (d.type === 'bool') {
            return d.value ? 1 : 0;
        } else {
            return 0;
        }
    };

    var donorFill = function (d) {
        if (d.type === 'bool') {
            if (d.value === true) {
                return '#abc';
            } else {
                return '#f00';
            }
        } else {
            return '#6d72c5';
        }
    };

    var geneOpacity = function (d) {
        return d.value / 40;
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
        createOncogridPlot: function (donor_data, gene_data, observation_data) {
            if (donor_data.length > 0 && gene_data.length > 0 && observation_data.length) {
                updateOncogrid(donor_data, gene_data, observation_data);
            }
        }
    }
})
