/**
 *
 * Copyright 2015, Institute for Systems Biology
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

require.config({
    baseUrl: STATIC_FILES_URL+'js/',
    paths: {
        jquery: 'libs/jquery-1.11.1.min',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        session_security: 'session_security/script',
        underscore: 'libs/underscore-min',
        assetscore: 'libs/assets.core',
        assetsresponsive: 'libs/assets.responsive',
        d3: 'libs/d3.min',
        d3tip: 'libs/d3-tip',
        science: 'libs/science.min',
        stats: 'libs/science.stats.min',
        vizhelpers: 'helpers/vis_helpers',

        vq: 'circviz/vq',
        vqcircviz: 'circviz/vq.circvis',
        circviz_config: 'circviz/circvis_configure',
        circviz_datagen: 'circviz/data_generate',
        circviz_genome: 'circviz/genome_data'

    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'session_security': ['jquery'],
        'assetscore': ['jquery', 'bootstrap', 'jqueryui'],
        'assetsresponsive': ['jquery', 'bootstrap', 'jqueryui'],
        'vq': ['jquery', 'underscore', 'd3'],
        'vqcircviz': ['vq'],
        'circviz_genome': ['vq'],
        'circviz_config': ['vq', 'circviz_genome'],
        'circviz_datagen': ['vq', 'circviz_genome'],
        'underscore': {exports: '_'}
    }
});

require([
    'jquery',
    'jqueryui',
    'bootstrap',
    'session_security',
    'd3',
    'd3tip',
    'underscore',

    'vq',
    'vqcircviz',
    'circviz_config',
    'circviz_datagen',
    'circviz_genome',

    'vizhelpers',

    'assetscore',
    'assetsresponsive'
], function($, jqueryui, bootstrap, session_security, d3, d3tip, _) {
    A11y.Core();

    var features = [];

    associations = [];

    $('#30_random_edge').on('click',function() {
            var new_associations = _.map(_.range(30),function() { return fg.generateAssociation(0);},fg);
            addRFAssociations(new_associations);
            associations = associations.concat(new_associations);
        }
    );
    $('#1_random_edge').on('click',function() {
            var new_association = fg.generateAssociation();
            console.log(new_association);
            addRFAssociations(new_association);
            associations.push(new_association);
        }
    );

    $('#30_edges_remove').on('click', function() {
        if(associations.length) {circle.removeEdges(associations.splice(-30,30));}
    });


    $('#all_edges_remove').on('click', function() {
        circle.removeEdges('all');
        associations = [];
    });


    $('#30_nodes_add').on('click', function() {
        var new_features = _.map(_.range(30),function() { return fg.generateFeature(0);},fg);
        console.log(new_features);
        addFeatures(new_features);
        features = features.concat(new_features);
    });

    $('#30_nodes_remove').on('click', function() {
        if (features.length) { circle.removeNodes(features.splice(-30,30)); }
    });
    var fg = new FeatureGenerator({
        nodes: {
            fields: [
                {property:'mutation_count', max:400, roundOff:true},
                {property:'annotated_type', max:5, roundOff:true}
            ]
        },
        edges: {
            fields: [
                {property:'logged_pvalue', max:300, roundOff:true}
            ]
        }
    });

    $('#get_api_data').on('click', function() {
        var full_api_url = api_url + '/_ah/api/pairwise/v1/precomp/';
        $.ajax({
            type: 'GET',
            url: full_api_url,
            success: function (data, status, xhr) {
                addRFAssociations(data['items']);
                associations = associations.concat(data['items']);
            }
        });
    });

    associations = _.map(_.range(30),fg.generateAssociation,fg);

//    console.log('edges are stored in the variable "associations".');
//    console.log('extra nodes are stored in the variable "features".');

    function addRFAssociations(edges) {
        circle.addEdges(edges);
    }

    function addFeatures(nodes) {
        circle.addNodes(nodes);
    }


    var circle;
    circle = circvis.plot($('#wedge').get(0));
});
