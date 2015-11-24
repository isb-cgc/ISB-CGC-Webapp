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

    // Radio button controls bootstrap collapse
    toggleRadio('upload');
    function toggleRadio(groupname){
        var radioButton =  $('.radio input[name=' + groupname + ']');
        radioButton.on('change', function(event){
            var collapseTarget = ($(this).data('target')) ? $(this).data('target') : $(this).href;
            var collpaseHide = $(radioButton.not(this)[0]).data('target');
            if($(this).is(':checked')){
                $(collapseTarget).collapse('show');
                $(collpaseHide).collapse('hide');
            }else{
                $(collapseTarget).collapse('hide');
            }
        })
    }

})