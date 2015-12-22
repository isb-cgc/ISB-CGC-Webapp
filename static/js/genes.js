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

    // Valid gene list
    var genelist = ['PTEN', 'PIK3CA', 'AKT', 'MTOR', 'BRCA1'];
    var geneListField = $('#geneListField');

    var geneFavs = (genes_fav_detail.length) ? genes_fav_detail.genes : [];

    if(typeof(uploaded_genes)!== 'undefined' && uploaded_genes.length > 0 ){
        geneFavs = geneFavs.concat(uploaded_list);
    }

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
            $(event.relatedTarget).addClass('invalid error');
            $('.helper-text__invalid').show();
        }

        if($('div.token.invalid.error').length < 1){
            $('.helper-text__invalid').hide();
        }
        if($('div.token.invalid.repeat').length < 1){
            $('.helper-text__repeat').hide();
        }
    }).on('tokenfield:removedtoken', function(event){
        if($('div.token.invalid.error').length < 1){
            $('.helper-text__invalid').hide();
        }
        if($('div.token.invalid.repeat').length < 1){
            $('.helper-text__repeat').hide();
        }
    });

    // Clear all entered genes list on click
    $('#clearAll').on('click', function (event) {
        if($('.tokenfield').hasClass('focus')){
            // the tokenfield takes enter key and click event, and it will trigger the clear all method,
            // this code checks whether tokenfield is on focus, if yes, it preventDefault and do nothing
            event.preventDefault();
        }else{
            geneListField.tokenfield('setTokens', ' ');
        }
        return false;
    });

    // Genes upload page
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

        $('#file-upload-btn').click(function(){
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
            }else{
                $('#selected-file-name').text(file.name);
                $('#uploading').addClass('in');
                $('#uploadBtn').hide();
            }

            if(event.target.files != undefined){
                var fr = new FileReader();
                var uploaded_gene_list;
                fr.onload = function(event){
                    uploaded_gene_list = fr.result.split(/[ \(,\)]+/);

                    // Send the uploaded gene's list to the backend
                    uploaded_list = checkUploadedGeneListAgainstGeneIdentifier(uploaded_gene_list);

                }
                fr.readAsText(event.target.files.item(0));
            }
        })
    }

    $('#paste-upload').on('click', function(){
        var pasted_genes = $($(this).data('target')).val().split(/[ ,]+/);

        uploaded_list = checkUploadedGeneListAgainstGeneIdentifier(pasted_genes);
        console.log(pasted_genes);
    })
    $('#upload-without-error-genes').on('click', function(){
        genes_upload(uploaded_list.valid);
    })
    $('#upload-with-error-genes').on('click', function(){
        var newlist = $($(this).data('target')).val().split(/[ ,]+/);
        newlist = uploaded_list.valid.concat(newlist);
        genes_upload(newlist);
    })
    function genes_upload(genes){
        var csrftoken = get_cookie('csrftoken');
        $.ajax({
            type: 'POST',
            url : base_api_url + '/genes/0/upload/',
            data: {genes: genes},
            beforeSend: function(xhr){xhr.setRequestHeader("X-CSRFToken", csrftoken);},
            success: function (data) {

                window.location = base_api_url + '/genes/0/edit';
            },
            error: function(data){
                console.log(data)
            }
        })
    }
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
    function checkUploadedGeneListAgainstGeneIdentifier(gene_list){
        // Delete any repetitive genes
        var genes = truncateRepeatGenes(gene_list);
        var invalid_genes = [];
        var valid_genes = [];

        genes.forEach(function(gene){
            if(genelist.indexOf(gene.toUpperCase()) < 0){
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
        }else{
            genes_upload(valid_genes);
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