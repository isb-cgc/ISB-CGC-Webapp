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
        tokenfield: 'libs/bootstrap-tokenfield.min'
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'session_security': ['jquery'],
        'assetscore': ['jquery', 'bootstrap', 'jqueryui'],
        'assetsresponsive': ['jquery', 'bootstrap', 'jqueryui'],
        'underscore': {exports: '_'},
        'tokenfield': ['jquery', 'jqueryui']
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
    'tokenfield'
], function($, jqueryui, bootstrap, session_security, _) {
    'use strict';

    // This file is used for genes creation page
    // TODO:
    // - Probably need to change name later
    // - Validate genes list field before submit
    // - hook up source to existing genes list

    // Valid gene list
    var genelist = ['PTEN', 'PIK3CA', 'AKT', 'MTOR', 'BRCA1'];

    $('#geneListField').tokenfield({
        autocomplete: {
            source: genelist,
            delay: 100,
            appendTo: "#tokenfield-holder",
        },
        showAutocompleteOnFocus: true
    })
    $('#geneListField').on('tokenfield:createtoken', function (event) {
        //  check whether user enter a valid gene name
        var isValid = true;
        if(_.indexOf(genelist, event.attrs.value.toUpperCase()) < 0) {
            isValid = false
            event.preventDefault();
            alert('the value is not correct')
        }
    })

    // Clear all entered genes list on click
    $('#clearAll').click(function (event) {
        $('#geneListField').tokenfield('setTokens', ' ');
        alert('Your list of gene favorites has been cleared');
    })

})