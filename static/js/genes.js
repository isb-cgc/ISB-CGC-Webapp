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
    var geneFavs = genes_fav_detail ? genes_fav_detail.genes : [];
    geneListField.tokenfield({
        autocomplete: {
            source: genelist,
            delay: 100,
            appendTo: "#tokenfield-holder"
        },
        showAutocompleteOnFocus: true,
        minLength: 2,
        tokens: geneFavs
    }).on('tokenfield:createdtoken', function (event) {
        //  Check whether the user enter a repetitive token
        //  If it is a repetitive token, show a message instead
       console.log(event);
        console.log($(this).tokenfield('getTokens'));
        var existingGenes = event.currentTarget.value.split(', ');
        var parentHolder = $('#tokenfield-holder');
        console.log(existingGenes);
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
    }).on('tokenfield:edittoken', function(event){

    }).on('tokenfield:removetoken', function(event){

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

    // Genes upload page
    // Check if the browser support formdata for file upload
    var xhr2 = !! ( window.FormData && ("upload" in ($.ajaxSettings.xhr())  ));
    if(!xhr2 || !window.File || !window.FileReader || !window.FileList || !window.Blob){
        var errorMsg = 'Your browser doesn\'t support file upload. You can paste your gene list from the option below.';
        $('#uploadBtn').attr('disabled', true).parent()
                       .append('<p class="small">' + errorMsg + '</p>');
    }else{
        // If file upload is supported
        var fileUploadField = $('#fileUploadField');
        var validFileTypes = ['txt', 'csv'];

        $('#uploadBtn').click(function(){
            fileUploadField.click();
        });
        fileUploadField.on('change', function(event){
            var file = this.files[0];
            var ext = file.name.split(".").pop().toLowerCase();

            // check file format against valid file types
            if(validFileTypes.indexOf(ext) < 0){
                alert('Please upload a .txt or .csv file');
                return false;
            }else{
                var $uploadBtn = $('#uploadBtn');
                var text = $uploadBtn.text();
                $uploadBtn.addClass('active').prepend("<i class='fa fa-circle-o-notch fa-spin'></i>") ;
            }

            if(event.target.files != undefined){
                var fr = new FileReader();
                var uploaded_gene_list;
                fr.onload = function(event){
                    uploaded_gene_list = fr.result.split(/[ \(,\)]+/);
                    // Delete any repetitive gene
                    uploaded_gene_list= truncateRepeatGenes(uploaded_gene_list);
                    // Send the uploaded gene's list to the backend
                    // TODO: refactored this validation code out when api is ready

                }
                fr.readAsText(event.target.files.item(0));
            }
        })
    }

    function truncateRepeatGenes(genes){
        var genes_count_object = {};
        genes.forEach(function(gene){
            if(genes_count_object[gene]){
                genes_count_object[gene] += 1;
            }else{
                genes_count_object[gene] = 1;
            }
        });
        return Object.keys(genes_count_object);
    }
});