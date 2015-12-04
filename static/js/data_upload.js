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
        base: 'base',
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'session_security': ['jquery'],
        'assetscore': ['jquery', 'bootstrap', 'jqueryui'],
        'assetsresponsive': ['jquery', 'bootstrap', 'jqueryui'],
        'underscore': {exports: '_'},
    }
});

require([
    'jquery',
    'jqueryui',
    'bootstrap',
    'session_security',
    'underscore',
    'assetscore',
    'assetsresponsive',
    'base',
], function($, jqueryui, bootstrap, session_security, _) {
    'use strict';

    // using tabs to toggle project information section
    $('a[data-target="#project-info"]').on('show.bs.tab', function(e){
        var target = $(this).data('target')

        $(target).collapse('show');
        $('#study-info').collapse('hide');
    }).on('hide.bs.tab', function(e){
        var target = $(this).data('target')

        $(target).collapse('hide');
        $('#study-info').collapse('show');
    })

    // toggle upload ui on selected radio
    $('#data-upload-group input[type="radio"]').on('change', function(e){
        var target = $(this).data('target');
        var collapseElems = $('#data-upload-group').find('.collapse');
        if(this.checked){
            $(target).collapse('show');
            collapseElems.not(target).removeClass('in');
        }
    })
})