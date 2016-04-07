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
        bloodhound: 'libs/bloodhound',
        typeahead : 'libs/typeahead',
        tokenfield: 'libs/bootstrap-tokenfield.min'
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'session_security': ['jquery'],
        'assetscore': ['jquery', 'bootstrap', 'jqueryui'],
        'assetsresponsive': ['jquery', 'bootstrap', 'jqueryui'],
        'underscore': {exports: '_'},
        'tokenfield': ['jquery', 'jqueryui'],
        'typeahead':{
            deps: ['jquery'],
            init: function ($) {
                return require.s.contexts._.registry['typeahead.js'].factory( $ );
            }
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
    'assetscore',
    'assetsresponsive',
    'base',
    'tokenfield'
], function($, jqueryui, bootstrap, session_security, Bloodhound, typeahead, _) {
    'use strict';

    var geneListField = $('#paste-in-genes');
    var geneFavs = (gene_fav) ? gene_fav.genes : [];

    if(typeof(uploaded_genes)!== 'undefined' && uploaded_genes.length > 0 ){
        geneFavs = geneFavs.concat(uploaded_genes);
    }

    //create bloodhound typeahead engine for gene suggestions
    var gene_suggestions = new Bloodhound({
        datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        prefetch : base_url + '/genes/suggest/a.json',
        remote: {
            url: base_url + '/genes/suggest/%QUERY.json',
            wildcard: '%QUERY'
        }
    });
    gene_suggestions.initialize();
    function createTokenizer() {
        // be aware bootstrap tokenfield requires 'value' as the datem attribute field : https://github.com/sliptree/bootstrap-tokenfield/issues/189
        geneListField.tokenfield({
            typeahead : [
                null, {
                    source : gene_suggestions.ttAdapter(),
                    display: 'value'
            }],
            delimiter : " ",
            minLength: 2,
            tokens: geneFavs
        }).on('tokenfield:createdtoken', function (event) {
            //  Check whether the user enter a repetitive token
            //  If it is a repetitive token, show a message instead
            var existingGenes = event.currentTarget.value.split(', ');
            var parentHolder = $('#tokenfield-holder');
            $.each(existingGenes, function (index, gene) {
                if (gene.toUpperCase() === event.attrs.value.toUpperCase()) {
                    $(event.relatedTarget).addClass('invalid repeat');
                    $('.helper-text__repeat').show();
                }
            });

            //  check whether user enter a valid gene name
            //var isValid = true;
            validate_genes([event.attrs.value], function validCallback(result){
                if(!result[event.attrs.value]){
                    $(event.relatedTarget).addClass('invalid error');
                    $('.helper-text__invalid').show();
                }
                if ($('div.token.invalid.error').length < 1) {
                    $('.helper-text__invalid').hide();
                }
                if ($('div.token.invalid.repeat').length < 1) {
                    $('.helper-text__repeat').hide();
                }
            })
        }).on('tokenfield:removedtoken', function (event) {
            if ($('div.token.invalid.error').length < 1) {
                $('.helper-text__invalid').hide();
            }
            if ($('div.token.invalid.repeat').length < 1) {
                $('.helper-text__repeat').hide();
            }
        })
    }
    createTokenizer();

    // Clear all entered genes list on click
    $('#clearAll').on('click', function (event) {
        if($('.tokenfield').hasClass('focus')){
            // the tokenfield takes enter key and click event, and it will trigger the clear all method,
            // this code checks whether tokenfield is on focus, if yes, it preventDefault and do nothing
            event.preventDefault();
        }else{
            geneFavs = [];
            geneListField.tokenfield('setTokens', []);
            geneListField.tokenfield('createToken' , 'this is an arbitrary token to get bootstrap to clear the existing tokens');
            geneListField.tokenfield('setTokens', []);
        }
        return false;
    });

    // Genes upload page, file upload button onclick
    // Check if the browser support formdata for file upload
    var xhr2 = !! ( window.FormData && ("upload" in ($.ajaxSettings.xhr())  ));
    var uploaded_list;
    if(!xhr2 || !window.File || !window.FileReader || !window.FileList || !window.Blob){
        var errorMsg = 'Your browser doesn\'t support file upload. You can paste your gene list from the option below.';
        $('#file-upload-btn').attr('disabled', true).parent()
                             .append('<p class="small">' + errorMsg + '</p>');
    }else{
        // If file upload is supported
        var fileUploadField = $('#file-upload-field');
        var validFileTypes = ['txt', 'csv'];

        $('#file-upload-btn').click(function(event){
            event.preventDefault()
            fileUploadField.click();
        });
        fileUploadField.on('change', function(event){
            var file = this.files[0];
            var ext = file.name.split(".").pop().toLowerCase();

            // check file format against valid file types
            if(validFileTypes.indexOf(ext) < 0){
                // If file type is not correct
                alert('Please upload a .txt or .csv file');
                return false;
            } else{
                $('#selected-file-name').text(file.name);
                $('#uploading').addClass('in');
                $('#file-upload-btn').hide();
            }

            if(event.target.files != undefined){
                var fr = new FileReader();
                var uploaded_gene_list;
                fr.onload = function(event){
                    uploaded_gene_list = fr.result.split(/[ \(,\)]+/).filter(Boolean);

                    // Send the uploaded gene's list to the backend
                    uploaded_list = checkUploadedGeneListAgainstGeneIdentifier(uploaded_gene_list);
                    for(var i in uploaded_list.valid){
                         geneListField.tokenfield('createToken', uploaded_list.valid[i]);
                    }
                    for(var i in uploaded_list.invalid){
                         geneListField.tokenfield('createToken', uploaded_list.invalid[i]);
                    }

                    $('#uploading').removeClass('in');
                    $('#file-upload-btn').show();
                }
                fr.readAsText(event.target.files.item(0));
            }
        })
    }

    //$('#paste-upload').on('click', function(){
    //    var pasted_genes = $($(this).data('target')).val().split(/[ ,]+/).filter(Boolean);
    //
    //    uploaded_list = checkUploadedGeneListAgainstGeneIdentifier(pasted_genes);
    //    console.log(pasted_genes);
    //})

    //$('#clearAll').on('click', function(){
    //    $('#paste-in-genes').val('');
    //})
    //$('#upload-without-error-genes').on('click', function(){
    //    // upload valid gene list
    //    // uploaded_list.valid
    //    console.log(uploaded_list.valid);
    //})
    //$('#upload-with-error-genes').on('click', function(){
    //    var newlist = $($(this).data('target')).val().split(/[ ,]+/).filter(Boolean);
    //    newlist = uploaded_list.valid.concat(newlist);
    //
    //    // Upload newlist
    //    console.log(uploaded_list.valid);
    //})

    $('form.create-gene-list').on('submit', function() {
        $(this).find('input[type="submit"]').attr('disabled', 'disabled');
    });

    /*
        Used for getting the CORS token for submitting data
     */
    function get_cookie(name) {
        var cookieValue = null;
        if (document.cookie && document.cookie != '') {
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
                var cookie = jQuery.trim(cookies[i]);
                // Does this cookie string begin with the name we want?
                if (cookie.substring(0, name.length + 1) == (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    function validate_genes(list, cb){
        if(list.length > 0){
            var csrftoken = get_cookie('csrftoken');
            $.ajax({
                type        : 'POST',
                dataType    :'json',
                url         : base_url + '/genes/is_valid/',
                data        : JSON.stringify({'genes-list' : list}),
                beforeSend  : function(xhr){xhr.setRequestHeader("X-CSRFToken", csrftoken);},
                success : function (data) {
                    if(!data.error) {
                        cb(data.results);
                    }
                },
                error: function () {
                    console.log('Failed to add gene_lists to workbook');
                }
            });
        }
    }

    function checkUploadedGeneListAgainstGeneIdentifier(gene_list){
        // Delete any repetitive genes
        var genes = truncateRepeatGenes(gene_list);
        var invalid_genes = [];
        var valid_genes = [];

        genes.forEach(function(gene){
            if(gene_list.indexOf(gene.toUpperCase()) < 0){
                invalid_genes.push(gene);
            }else{
                valid_genes.push(gene);
            }
        })
        if(invalid_genes.length > 0){
            //If some genes cannot be identified
            //hide default upload panel and show error panel
            $('#error-panel').addClass('in');
            $('#upload-panel').addClass('collapse');
            $('#error-genes').text(invalid_genes.join(' '));
        } else{
            //genes_upload(valid_genes);
        }
        return {invalid: invalid_genes, valid: valid_genes}
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