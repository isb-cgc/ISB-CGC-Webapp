require.config({
    baseUrl: STATIC_FILES_URL+'js/',
    paths: {
        jquery: 'libs/jquery-1.11.1.min',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        session_security: 'session_security',
        underscore: 'libs/underscore-min',
        base: 'base',
        bloodhound: 'libs/bloodhound',
        typeahead : 'libs/typeahead',
        tokenfield: 'libs/bootstrap-tokenfield.min'
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'session_security': ['jquery'],
        'underscore': {exports: '_'},
        'tokenfield': ['jquery', 'jqueryui'],
        'typeahead':{
            deps: ['jquery'],
            init: function ($) {
                return require.s.contexts._.registry['typeahead.js'].factory( $ );
            },
            hint: false
        },
        'bloodhound': {
           deps: ['jquery'],
           exports: 'Bloodhound'
        }
    }
});

require([
    'jquery',
    'jqueryui',
    'bootstrap',
    'session_security',
    'bloodhound',
    'typeahead',
    'underscore',
    'base',
    'tokenfield'
], function($, jqueryui, bootstrap, session_security, Bloodhound, typeahead, _, base) {
    'use strict';

    $('form.new-workbook input[type="submit"]').on('click',function(e){
        var form = $(this).parents('.new-workbook');
        var name = form.find('.new-workbook-name').val();
        var unallowed_chars_alert = $(this).parents('.new-workbook-modal').find('.unallowed-chars-wb-alert');
        unallowed_chars_alert.hide();

        // Do not allow white-space only names
        if(name.match(/^\s*$/)) {
            form.find('.new-workbook-name').prop('value','');
            e.preventDefault();
            return false;
        }

        var unallowed = name.match(base.blacklist);

        if(unallowed) {
            unallowed_chars_alert.find('.unallowed-chars-wb').text(unallowed.join(", "));
            unallowed_chars_alert.show();
            event.preventDefault();
            return false;
        }
    });
});