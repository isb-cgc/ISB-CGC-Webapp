/**
 *
 * Copyright 2017, Institute for Systems Biology
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

require.config({
    baseUrl: STATIC_FILES_URL+'js/',
    paths: {
        jquery: 'libs/jquery-1.11.1.min',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        session_security: 'session_security',
        underscore: 'libs/underscore-min',
        base: 'base'
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'session_security': ['jquery'],
        'base': ['jquery', 'jqueryui', 'session_security', 'bootstrap', 'underscore']
    }
});

require([
    'jquery',
    'jqueryui',
    'bootstrap',
    'session_security',
    'underscore',
    'base'
], function ($, jqueryui, bootstrap, session_security, _, base) {

    var savingChanges = false;
    var validated_barcodes = null;

    // Used for getting the CORS token for submitting data
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

    function validateEntries(barcodes) {
        var result = {
            valid_entries: null,
            invalid_entries: null
        };

        barcodes.filter(function(barcode){ return barcode !== ""; }).map(function(barcode) {
            // Trim leading and trailing quotes
            barcode = barcode.replace(/(^\s*['"])|(['"]\s*$)/g,"").trim();
            // Split the entry into its values
            var entry_split = barcode.split(/["']*\s*,\s*["']*/);
            if (entry_split.length !== 3) {
                if (!result.invalid_entries) {
                    result.invalid_entries = [];
                }
                result.invalid_entries.push(barcode);
            } else {
                if (!result.valid_entries) {
                    result.valid_entries = [];
                }
                result.valid_entries.push(entry_split[0] + ":" + entry_split[1] + ":" + entry_split[2]);
            }
        });

        // Any entries which were valid during the initial parse must now be checked against the database
        if(result.valid_entries) {
            var deferred = $.Deferred();
            var csrftoken = get_cookie('csrftoken');
            $.ajax({
                type        : 'POST',
                dataType    :'json',
                url         : BASE_URL + '/cohorts/validate_barcodes/',
                data        : JSON.stringify({'barcodes' : result.valid_entries}),
                beforeSend  : function(xhr){xhr.setRequestHeader("X-CSRFToken", csrftoken);},
                success : function (data) {
                    result.valid_entries = data.valid_entries ? data.valid_entries : null;
                    if(data.invalid_entries) {
                        if (!result.invalid_entries) {
                            result.invalid_entries = data.invalid_entries;
                        } else {
                            result.invalid_entries.concat(data.invalid_entries);
                        }
                        if(data.messages) {
                            result.messages = data.messages;
                        }
                    }
                    result.counts = data.counts;
                    result.valid_entries && deferred.resolve(result);
                    !result.valid_entries && deferred.reject(result);
                },
                error: function (data) {
                    // If no valid barcodes were found we wind up here
                    deferred.reject(data);
                }
            });
            return deferred;
        } else {
            return $.Deferred().reject(result);
        }
    }

    // Basic filtering for tsv or csv format, correct number of columns (including empties), and allowed characters
    function checkContentValidity(contents) {
        // Do a rough file content validation
        var tsvMatch = contents.match(/\t/g);
        var csvMatch = contents.match(/,/g);
        var whitelistMatch = contents.match(base.barcode_file_whitelist);

        return !((tsvMatch && csvMatch) || (!tsvMatch && !csvMatch) || (csvMatch && csvMatch.length % 2 != 0) || (tsvMatch && tsvMatch.length % 2 != 0) || whitelistMatch);
    }

    // Text-area paste
    $('#enter-barcodes button.verify').on('click',function(){
        var content = $('#enter-barcodes textarea').val();

        if(!checkContentValidity(content)) {
            base.showJsMessage("error","The entered set of barcodes is not properly formatted. Please double-check that they are in tab- or comma-delimited format.",true);
            return false;
        } else {
            $('.alert-dismissible button.close').trigger('click');
        }

        var entries = content.split('\n');

        // Validate the entries
        validateEntries(entries).then(
            function(result){
                showEntries(result, $('#enter-barcodes'));
                $('#enter-barcodes .save-cohort button').removeAttr('disabled');
                $('#enter-barcodes .save-cohort').show();
            },function(result){
                // We only reach this point if no entries are valid, so show an error message as well.
                base.showJsMessage("error","None of the supplied barcode entries were valid. Please double-check the format of your entries.",true);
                showEntries(result.responseJSON,$('#enter-barcodes'));
                fileUploadField.val("");
                $('#enter-barcodes .save-cohort button').attr('disabled','disabled');
                $('#enter-barcodes .save-cohort').hide();
            }
        );
    });


    // File Upload
    var xhr2 = !! ( window.FormData && ("upload" in ($.ajaxSettings.xhr())  ));
    if(!xhr2 || !window.File || !window.FileReader || !window.FileList || !window.Blob){
        var errorMsg = 'Your browser doesn\'t support file upload. Please use the \'Entry\' method instead.';
        $('#file-upload-btn').attr('disabled', true).parent()
                             .append('<p class="small">' + errorMsg + '</p>');
    } else {
        // If file upload is supported
        var fileUploadField = $('#file-upload-field');
        var validFileTypes = ['txt', 'csv', 'tsv'];

        $('#file-upload-btn').click(function(event){
            event.preventDefault()
            fileUploadField.click();
            $('.alert-dismissible button.close').trigger('click');
            $('.barcode-status').hide();
            $('#upload .save-cohort').attr('disabled','disabled');
        });

        fileUploadField.on('change', function(event){
            var file = this.files[0];
            var ext = file.name.split(".").pop().toLowerCase();

            // check file format against valid file types
            if(validFileTypes.indexOf(ext) < 0){
                // If file type is not correct
                base.showJsMessage("error","Please choose a .txt, .tsv, or .csv file.",true);
                fileUploadField.val("");
                return false;
            } else{
                $('#selected-file-name').text(file.name);
                $('#uploading').addClass('in');
                $('#file-upload-btn').hide();
            }

            if(event.target.files != undefined){
                var fr = new FileReader();
                fr.onload = function(event){

                    if(!checkContentValidity(fr.result)) {
                        base.showJsMessage("error","This file is not in a valid format. Please supply a comma- or tab-delimited file, in .tsv, .csv, or .txt format.",true);
                        $('#uploading').removeClass('in');
                        $('#file-upload-btn').show();
                        fileUploadField.val("");
                        return false;
                    }

                    var entries = fr.result.split('\n');

                    // Validate the entries
                    validateEntries(entries).then(
                        function(result){
                            showEntries(result, $('#upload-file'));
                            $('#upload-file .btn.save-cohort').removeAttr('disabled');
                            $('#upload-file .btn.save-cohort').show();
                        },function(result){
                            // We only reach this point if no entries are valid, so show an error message as well.
                            base.showJsMessage("error","None of the supplied barcode entries were valid. Please double-check the format of your entries.",true);
                            showEntries(result.responseJSON,$('#upload-file'));
                            fileUploadField.val("");
                            $('#upload-file .btn.save').attr('disabled','disabled');
                            $('#upload-file .btn.save-cohort').hide();
                        }
                    );
                    $('#uploading').removeClass('in');
                    $('#file-upload-btn').show();
                    fileUploadField.val("");
                }
                fr.readAsText(event.target.files.item(0));
                fileUploadField.val("");
            }
        })
    }

    function showEntries(result, tab) {
        if(result.invalid_entries && result.invalid_entries.length > 0) {
            tab.find('.validation-messages ul').empty();
            var entry_set = "";
            for(var i=0; i < result.invalid_entries.length; i++) {
                var entry = result.invalid_entries[i];
                entry_set += entry['case']+", "+entry['sample']+", "+entry['program']+'\n';
            }
            tab.find('.invalid-entries pre').html(entry_set);
            if(result.messages) {
                var msg_set = "";
                for(var i=0; i < result.messages.length; i++) {
                    tab.find('.validation-messages ul').append('<li>'+result.messages[i]+'</li>')
                }
                tab.find('.validation-messages').show();
            } else {
                tab.find('.validation-messages').hide();
            }
            tab.find('.invalid-entries').show();
        } else {
            tab.find('.invalid-entries').hide();
            tab.find('.invalid-not-saved').hide();
        }

        if(result.valid_entries && result.valid_entries.length > 0) {
            var entry_set = "";
            validated_barcodes = [];
            for(var i=0; i < result.valid_entries.length; i++) {
                var entry = result.valid_entries[i];
                entry_set += entry['case']+", "+entry['sample']+", "+entry['program']+'\n';
                validated_barcodes.push({'sample_barcode': entry['sample'], 'case_barcode': entry['case'], 'program': entry['program_id'], 'project': entry['project']});
            }
            tab.find('.valid-entries pre').html(entry_set);
            tab.find('.valid-entries input').remove();
            tab.find('.valid-entries').show();
            tab.find('.cohort-counts tbody').empty();
            for(var i = 0; i < result.counts.length; i++) {
                var prog_deets = result.counts[i];
                tab.find('.cohort-counts tbody').append('<tr><td>'+prog_deets['program']+'</td><td>'+prog_deets['samples']+'</td><td>'+prog_deets['cases']+'</td>');
            }
            tab.find('.cohort-counts').show();
            result.invalid_entries && result.invalid_entries.length > 0 && tab.find('.invalid-not-saved').show();
        } else {
            tab.find('.valid-entries').hide();
            tab.find('.cohort-counts').hide();
            tab.find('.invalid-not-saved').hide();
        }
        tab.find('.barcode-status').show();
    }


    // Event bindings

    $('button.instructions').on('click',function(){
        $(this).siblings('div.instructions').is(':visible') ? $(this).siblings('div.instructions').hide() : $(this).siblings('div.instructions').show();
    });

    $('button[data-target="#create-cohort-modal"]').on('click',function(e){
        // Clear previous alerts
        $('#unallowed-chars-alert').hide();

        $('#cohort-counts-modal tbody').empty();
        $('.tab-pane.data-tab.active .cohort-counts tbody tr').each(function(){
            $('#cohort-counts-modal tbody').append($(this).clone());
        });

    });

    $('#create-cohort-form').on('submit', function(e) {

        $('#unallowed-chars-alert').hide();

        if(savingChanges) {
            e.preventDefault();
            return false;
        }

        var unallowed = $('#create-cohort-name').val().match(base.whitelist);
        if(unallowed) {
            $('.unallowed-chars').text(unallowed.join(", "));
            $('#unallowed-chars-alert').show();
            e.preventDefault();
            return false;
        }

        var form = $(this);

        savingChanges = true;

        form.append('<input type="hidden" name="apply-name" value="true" />');
        form.append('<input type="hidden" name="apply-barcodes" value="true" />');
        form.append($('<input>').attr({type: "hidden", name: "barcodes", value: JSON.stringify(validated_barcodes)}));
    });
});

