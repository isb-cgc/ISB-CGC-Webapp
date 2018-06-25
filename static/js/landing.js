/**
 *
 * Copyright 2017, Institute for Systems Biology
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
    baseUrl: STATIC_FILES_URL + 'js/',
    paths: {
        jquery: 'libs/jquery-1.11.1.min',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        session_security: 'session_security',
        underscore: 'libs/underscore-min',
        assetscore: 'libs/assets.core',
        assetsresponsive: 'libs/assets.responsive',
        d3: 'libs/d3.min',
        d3tip: 'libs/d3-tip',
        base: 'base'
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'session_security': ['jquery'],
        'assetscore': ['jquery', 'bootstrap', 'jqueryui'],
        'assetsresponsive': ['jquery', 'bootstrap', 'jqueryui']
    }
});

require([
    /*
    'jquery',
    'jqueryui',
    'bootstrap',
    'session_security',
    'd3',
    'd3tip',
    'visualizations/createTreeGraph',
    'helpers/vis_helpers',
    */
    'assetscore'
    /*
    ,'assetsresponsive',
    'base'
    */
], function(/* $, jqueryui, bootstrap, session_security, d3, d3tip, treegraph, vis_helpers */) {
    A11y.Core();

    //pause video when scrolling to other videos
    $(".carousel-control, .carousel-indicators li:not(.active)").click(function () {
        $('.tutorial-vid').each(function() {
            this.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
        });
    });


    //var treegraph_obj = Object.create(treegraph, {});
    //var total = 0;
    //for (var i = 0; i < tree_data.length; i++) {
    //    total += parseInt(tree_data[i]['count']);
    //}
    //var tip = d3tip()
    //        .attr('class', 'd3-tip')
    //        .direction('n')
    //        .offset([0, 0])
    //        .html(function(d) {
    //            return '<span>' + d.name + ': ' + d.count + ' (' + ((d.count/total) * 100).toFixed(2) + '%)</span>';
    //        });
    //var svg = d3.select('#disease-map')
    //    .append('svg')
    //    .attr('width', 500)
    //    .attr('height', 400);
    //
    //treegraph_obj.draw_tree(tree_data, svg, 'Disease Codes', 500, 400, true, tip);
    //
    //$('rect').on('click', function() {
    //    $('#spinner-overlay').show();
    //    var url = window.location.origin + '/search/?#disease_code=' + $(this).html();
    //    window.location = url;
    //});
    //
    //$('.graph-block p span').html(total);
});