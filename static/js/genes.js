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
    var geneListField = $('#geneListField');

    geneListField.tokenfield({
        autocomplete: {
            source: genelist,
            delay: 100,
            appendTo: "#tokenfield-holder"
        },
        showAutocompleteOnFocus: true,
        minLength: 2
    }).on('tokenfield:createdtoken', function (event) {
        //  Check whether the user enter a repetitive token
        //  If it is a repetitive token, show a message instead
       console.log(event);
        var existingGenes = event.currentTarget.value.split(', ');
        var parentHolder = $('#tokenfield-holder');

        $.each(existingGenes, function (index, gene) {
            if(gene.toUpperCase() === event.attrs.value.toUpperCase()){
                $(event.relatedTarget).addClass('invalid repeat');
                $('.helper-text__repeat').show();
            }
        });

        //  check whether user enter a valid gene name
        var isValid = true;
        if(_.indexOf(genelist, event.attrs.value.toUpperCase()) < 0) {
            $(event.relatedTarget).addClass('invalid');
            $('.helper-text__invalid').show();
        }
    });

    // Clear all entered genes list on click
    $('#clearAll').on('click', function (event) {
        if($('.tokenfield').hasClass('focus')){
            // the tokenfield takes enter key and click evnet, and it will trigger the clear all method,
            // this code checks whether tokenfield is on focus, if yes, it preventDefault and do nothing
            event.preventDefault();
        }else{
            geneListField.tokenfield('setTokens', ' ');
        }
    });

});