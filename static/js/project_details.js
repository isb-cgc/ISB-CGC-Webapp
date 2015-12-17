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

    $('.study-delete').on('click', function () {
        var $this = $(this),
            $study = $this.closest('.project-study');

        $study.addClass('panel-danger');
        if(!window.confirm('Are you sure you want to delete this study?')) {
            $study.removeClass('panel-danger');
            return;
        }

        $study.fadeOut({ queue:false }).slideUp(function () {
            $study.remove();
        });

        $.ajax({
            url: $this.data('url'),
            method: 'DELETE'
        }).fail(function () {
            $('.error-messages').append(
                $('<p>')
                    .addClass('alert alert-danger')
                    .text('There was an error deleting that study. Please reload and try again, or try again later.')
            );
        })
        .always(function () {
            $study.removeClass('deleting');
        });
    });

    $('.project-delete').on('click', function () {
        var $this = $(this);

        if(!window.confirm('Are you sure you want to delete this project?')) {
            return;
        }

        $.ajax({
            url: $this.data('url'),
            method: 'DELETE'
        }).then(function () {
            window.location = $this.data('redirect');
        }, function () {
                $('.error-messages').append(
                    $('<p>')
                        .addClass('alert alert-danger')
                        .text('We encountered an error, please try again later.')
                );
        })
        .always(function () {
            $study.removeClass('deleting');
        });
    });
});