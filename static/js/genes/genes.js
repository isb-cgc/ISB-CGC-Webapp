require.config({
    baseUrl: STATIC_FILES_URL+'js/',
    paths: {
        jquery: 'libs/jquery-1.11.1.min',
        jqueryui: 'libs/jquery-ui.min',
        bootstrap: 'libs/bootstrap.min',
        session_security: 'session_security',
        underscore: 'libs/underscore-min',
        base: 'base',
        bloodhound: 'libs/bloodhound',
        typeahead : 'libs/typeahead',
        tokenfield: 'libs/bootstrap-tokenfield.min'
    },
    shim: {
        'jqueryui': ['jquery'],
        'bootstrap': ['jquery'],
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
    'session_security',
    'bloodhound',
    'typeahead',
    'underscore',
    'base',
    'tokenfield'
], function($, jqueryui, session_security, Bloodhound, typeahead, _, base) {
    // Because jQueryUI and Bootstrap use the same name for their tooltip function,
    // we need to bridge the jQueryUI function name into something else, which
    // in turn requires a forced load order of jQuery and then bootstrap. Nest requirements
    // to ensure this happens.
    $.widget.bridge('uitooltip', $.ui.tooltip);

    require(['bootstrap'], function(bootstrap){
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
            prefetch : BASE_URL + '/genes/suggest/a.json',
            remote: {
                url: BASE_URL + '/genes/suggest/%QUERY.json',
                wildcard: '%QUERY'
            }
        });

        gene_suggestions.initialize();
        function createTokenizer() {
            // be aware bootstrap tokenfield requires 'value' as the datem attribute field : https://github.com/sliptree/bootstrap-tokenfield/issues/189
            geneListField.tokenfield({
                typeahead : [
                    {
                        hint: false
                    }, {
                        source: gene_suggestions.ttAdapter(),
                        display: 'value'
                    }
                ],
                delimiter : " ",
                minLength: 2-1,         // Bug #289 in bootstrap-tokenfield, submitted, remove -1 if it gets fixed and we update
                tokens: geneFavs
            }).on('tokenfield:createtoken',function(event){
                //  Check whether the user enter a repetitive token
                //  If it is a repetitive token, show a message instead
                var existingGenes = geneListField.tokenfield('getTokens');
                $.each(existingGenes, function (index, gene) {
                    if (gene.value.toUpperCase() === event.attrs.value.toUpperCase()) {
                        event.attrs.isRepeatEntry = true;
                        $('.helper-text__repeat').show();
                    }
                });
            }).on('tokenfield:createdtoken', function (event) {
                event.attrs.isRepeatEntry && $(event.relatedTarget).addClass(
                    'invalid repeat repeat-of-'+event.attrs.value.toUpperCase()
                );

                // Check whether user entered a valid gene name
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
                });
                if(geneListField.tokenfield('getTokens').length > 0) {
                    $('.create-gene-list input[type="submit"]').removeAttr('disabled');
                }
            }).on('tokenfield:removedtoken', function (event) {
                // Update duplicate flagging
                var theseRepeats = [];
                if($('div.repeat-of-'+event.attrs.value.toUpperCase()).length > 0) {
                    var firstRepeat = $('div.repeat-of-'+event.attrs.value.toUpperCase()).first();
                    firstRepeat.removeClass('repeat repeat-of-'+event.attrs.value.toUpperCase());
                    if(!firstRepeat.hasClass('error')){
                        firstRepeat.removeClass('invalid');
                    }
                }
                if ($('div.token.invalid.error').length < 1) {
                    $('.helper-text__invalid').hide();
                }
                if ($('div.token.invalid.repeat').length < 1) {
                    $('.helper-text__repeat').hide();
                }

                if(geneListField.tokenfield('getTokens').length <= 0) {
                    $('.create-gene-list input[type="submit"]').attr('disabled', 'disabled');
                }
            }).on('tokenfield:edittoken',function(e){
                e.preventDefault();
                return false;
            });
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
                // Bootstrap tokenfield bug #183: there's no easy way to clear out all the tokens. Suggested
                // solution is to set an empty token array and clear out the underlying text field.
                geneListField.tokenfield('setTokens', []);
                geneListField.val('');
                $('.create-gene-list input[type="submit"]').attr('disabled', 'disabled');
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
                        var frLine = fr.result.trim();
                        uploaded_gene_list = frLine.split(/[ \(,\)]+/).filter(Boolean);

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

        // Resets forms on cancel. Suppressed warning when leaving page with dirty forms
        $('.cancel-edit').on('click', function() {
            $('#unallowed-chars-alert').hide();
            var form = $('.create-gene-list')[0];
            if(form){
                form.reset();
            }
        });

        $('form.create-gene-list').on('submit', function(e) {
            var name = $('#genes-list-name').prop('value');
            $('#unallowed-chars-alert').hide();

            // Do not allow white-space only names
            if(name.match(/^\s*$/)) {
                $('#genes-list-name').prop('value','');
                e.preventDefault();
                return false;
            }

            var unallowed = name.match(base.blacklist);

            if(unallowed) {
                $('.unallowed-chars').text(unallowed.join(", "));
                $('#unallowed-chars-alert').show();
                event.preventDefault();
                return false;
            }

            // Do not allow submission of empty gene lists
            if(geneListField.tokenfield('getTokens').length <= 0) {
                e.preventDefault();
                return false;
            }
            $('.create-gene-list input[type="submit"]').attr('disabled', 'disabled');
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

        function validate_genes(list, callback){
            if(list.length > 0){
                var csrftoken = get_cookie('csrftoken');
                $.ajax({
                    type        : 'POST',
                    dataType    :'json',
                    url         : BASE_URL + '/genes/is_valid/',
                    data        : JSON.stringify({'genes-list' : list}),
                    beforeSend  : function(xhr){xhr.setRequestHeader("X-CSRFToken", csrftoken);},
                    success : function (data) {
                        if(!data.error) {
                            callback(data.results);
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
            });
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
                if(genes_count_object[gene.toUpperCase()]){
                    genes_count_object[gene.toUpperCase()] += 1;
                }else{
                    genes_count_object[gene.toUpperCase()] = 1;
                }
            });
            return Object.keys(genes_count_object);
        }

        // Initialize tooltips
        $('[data-toggle="tooltip"]').tooltip();
    });
});