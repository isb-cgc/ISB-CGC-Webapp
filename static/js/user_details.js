require.config({
    baseUrl: '/static/js/',
    paths: {
        jquery: 'libs/jquery-1.11.1.min',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        session_security: 'session_security',
        underscore: 'libs/underscore-min',
        assetscore: 'libs/assets.core',
        assetsresponsive: 'libs/assets.responsive'
    },
    shim: {
        'bootstrap': ['jquery'],
        'session_security': ['jquery'],
        'assetscore': ['jquery']
    }
});

require([
    'jquery',
    'jqueryui',
    'bootstrap',
    'session_security',

    'assetscore',
    'assetsresponsive'
], function($, jqueryui, bootstrap, session_security) {
    A11y.Core();
    $('.btn-group button').on('click', function() {
        $(this).toggleClass('active');
        $('input[name="credits"]').prop('value', $(this).val());
        $(this).siblings().each(function() {
            $(this).removeClass('active');
        })

    });
});