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

    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'session_security': ['jquery'],
        'assetscore': ['jquery', 'bootstrap', 'jqueryui'],
        'assetsresponsive': ['jquery', 'bootstrap', 'jqueryui'],
        'underscore': {exports: '_'}
    }
});

require([
    'jquery',
    'jqueryui',
    'bootstrap',
    'session_security',
    'underscore',
    'assetscore',
    'assetsresponsive'
], function($, jqueryui, bootstrap, session_security, _) {
    'use strict';

    A11y.Core();

    // Menu toggle
    if($(window).scrollTop() < 10){
        $('#subnav').on('hide.bs.collapse', function () {
            $('#body').toggleClass('menu-open');
        });
        $('#subnav').on('show.bs.collapse', function(){
            $('#body').toggleClass('menu-open');
        });
    }

})