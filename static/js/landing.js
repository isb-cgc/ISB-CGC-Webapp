require.config({
    baseUrl: '/static/js/',
    paths: {
        jquery: 'libs/jquery-1.11.1.min',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        session_security: 'session_security',
        underscore: 'libs/underscore-min',
        assetscore: 'libs/assets.core',
        assetsresponsive: 'libs/assets.responsive',
        d3: 'libs/d3.min',
        d3tip: 'libs/d3-tip'
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
    'jquery',
    'jqueryui',
    'bootstrap',
    'session_security',
    'd3',
    'd3tip',
    'visualizations/createTreeGraph',

    'helpers/vis_helpers',

    'assetscore',
    'assetsresponsive',
], function($, jqueryui, bootstrap, session_security, d3, d3tip, treegraph) {
    A11y.Core();

    var treegraph_obj = Object.create(treegraph, {});
    var total = 0;
    for (var i = 0; i < tree_data.length; i++) {
        total += parseInt(tree_data[i]['count']);
    }
    var tip = d3tip()
            .attr('class', 'd3-tip')
            .direction('n')
            .offset([0, 0])
            .html(function(d) {
                return '<span>' + d.name + ': ' + d.count + ' (' + ((d.count/total) * 100).toFixed(2) + '%)</span>';
            });
    var svg = d3.select('#disease-map')
        .append('svg')
        .attr('width', 500)
        .attr('height', 400);

    treegraph_obj.draw_tree(tree_data, svg, 'Disease Codes', 500, 400, true, tip);

    $('rect').on('click', function() {
        $('#spinner-overlay').show();
        var url = window.location.origin + '/search/?#disease_code=' + $(this).html();
        window.location = url;
    });

    $('.graph-block p span').html(total);
});