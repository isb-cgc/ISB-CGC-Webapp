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
                    }
                    result.valid_entries && deferred.resolve(result);
                    !result.valid_entries && deferred.reject(result);
                },
                error: function () {
                    alert("There was an error while parsing your barcode set.")
                }
            });
            return deferred;
        } else {
            return $.Deferred().reject(result);
        }
    }


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

                    // Do a rough file content validation
                    var tsvMatch = fr.result.match(/\t/g);
                    var csvMatch = fr.result.match(/,/g);
                    var whitelistMatch = fr.result.match(base.barcode_file_whitelist);

                    if((tsvMatch && csvMatch) || (!tsvMatch && !csvMatch) || (csvMatch && csvMatch.length % 2 != 0) || (tsvMatch && tsvMatch.length % 2 != 0) || whitelistMatch) {
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
                            showEntries(result);
                            $('.btn.save').removeAttr('disabled');
                        },function(result){
                            // We only reach this point if no entries are valid, so show an error message as well.
                            base.showJsMessage("error","None of the supplied barcode entries were valid. Please double-check the format of your entries.",true);
                            showEntries(result.invalid_entries);
                            fileUploadField.val("");
                            $('.btn.save').attr('disabled','disabled');
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

    function showEntries(result) {
        if(result.invalid_entries) {
            var entry_set = "";
            for(var i=0; i < result.invalid_entries.length; i++) {
                entry_set += result.invalid_entries[i]+'\n';
            }
            $('.invalid-entries').html(entry_set);
            $('.invalid-entries').show();
            $('#invalid-not-saved').show();
        } else {
            $('.invalid-entries').hide();
            $('#invalid-not-saved').hide();
        }

        if(result.valid_entries) {
            var entry_set = "";
            for(var i=0; i < result.valid_entries.length; i++) {
                entry_set += result.valid_entries[i]+'\n';
            }
            $('.valid-entries').html(entry_set);
            $('.valid-entries').show();
            $('.cohort-counts').empty();
            for(program in result.counts) {
                if(result.counts.hasOwnProperty(program)) {
                    var prod_deets = result.counts[program];
                    $('.cohort-counts').append('<tr><td>'+program+'</td><td>'+prod_deets['samples']+'</td><td>'+prod_deets['cases']+'</td>');
                }
            }
            $('.cohort-counts').show();
        } else {
            $('.valid-entries').hide();
            $('.cohort-counts').hide();
        }
    }


    // Event bindings

    $('button.instructions').on('click',function(){
        $(this).siblings('div.instructions').is(':visible') ? $(this).siblings('div.instructions').hide() : $(this).siblings('div.instructions').show();
    });


});

