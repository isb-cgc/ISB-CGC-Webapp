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
        text: 'libs/require-text',
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

    $('.row-expand-button').on('click', function (e) {
        var $this = $(this),
            studies = $this.closest('table').find('.study');

        $this.data('expanded', !$this.data('expanded'));

        if($this.data('expanded')) {
            studies.addClass('hidden');
            studies.filter('[data-project-id="' + $this.closest('tr').data('project-id') + '"]').removeClass('hidden');
        } else {
            studies.addClass('hidden');
        }
    })
});