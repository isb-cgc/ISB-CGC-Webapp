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
        jquery: 'libs/jquery-3.5.1',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        base: 'base'
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery']
    }
});

require([
    'jquery',
    'base',
    'jqueryui',
    'bootstrap'
], function ($, base) {

    // Filelist Manifest Export to GCS

    $('#file-name').on('keypress keyup paste', function (e) {
        setTimeout(function () {
            validate_new_table_name(e);
        }, 70);
    });

    var validate_new_table_name = function (e) {
        $('#export-to-gcs-modal .modal-js-messages').empty();
        var str = $('#file-name').val();
        if (str.match(/[^A-Za-z0-9_\.\-\/]/)) {
            e.preventDefault();
            base.showJsMessage("error", "File names are restricted to numbers, letters, periods, dashes, slashes, and underscores.", false, $('#export-to-gcs-modal .modal-js-messages'));
            $('#export-to-gcs-form input[type="submit"]').attr('disabled', 'disabled');
            return false;
        } else {
            $('#export-to-gcs-form input[type="submit"]').removeAttr('disabled');
        }

        if (str.length >= parseInt($('#file-name').attr('maxlength'))) {
            e.preventDefault();
            base.showJsMessage("warning", "You have reached the maximum size allowed for a file name.", false, $('#export-to-gcs-modal .modal-js-messages'));
            return false;
        }
    };

    $('#export-to-gcs-project-bucket').on('change', function (e) {
        if ($(this).find(':selected').attr('type') !== "label") {
            $('#export-to-gcs-form input[type="submit"]').removeAttr('disabled');
            $('.file-name, .file-format').removeAttr('disabled');
            $('.file-name, .file-format').removeAttr('title');
            $('.file-name').attr('title','Add slashes (/) to create subfolders.');
            validate_new_table_name(e);
        }
    });

    $('.container').on('hide.bs.modal', '#export-to-gcs-modal', function () {
        $('.file-name, .file-format').attr('disabled', 'disabled');
        $('.file-name, .file-format').attr('title', 'Select a project and bucket to enable this option.');
        $('.file-name, .file-format').show();
        $('.modal-js-messages').empty();
        $('#export-to-gcs-form input[type="submit"]').attr('disabled', 'disabled');
        $('#export-to-gcs-form')[0].reset();
        $('#gcs-export-underway').hide();
    });

    $('.container').on('click', 'button[data-target="#export-to-gcs-modal"]', function (e) {
        // Don't reload the data if we have it already
        if($('#export-to-gcs-modal select optgroup').length > 0) {
            $('#export-to-gcs-modal .loading-overlay').hide();
            return true;
        }

        $('#export-to-gcs-form input[type="submit"]').attr('disabled', 'disabled');
        $('#export-to-gcs-modal .loading-overlay').show();

        $.ajax({
            type: 'GET',
            url: BASE_URL + '/accounts/users/'+request_user_id+'/buckets/',
            success: function (data) {
                if (data['status'] === 'success') {
                    if (Object.keys(data['data']['projects']).length > 0) {
                        var projects = data['data']['projects'];
                        for (var i = 0; i < projects.length; i++) {
                            if ($('optgroup.'+projects[i]['name']+'-buckets').length <= 0) {
                                $('#export-to-gcs-project-bucket').append('<optgroup class="' + projects[i]['name'] + '-buckets" label="' + projects[i]['name'] + '"></optgroup>');
                            }
                            var buckets = projects[i]['buckets'];
                            for (var j in buckets) {
                                if (buckets.hasOwnProperty(j)) {
                                    $('optgroup.' + projects[i]['name']+'-buckets').append(
                                        '<option class="bucket" value="' + buckets[j] + '">' + buckets[j] + '</option>'
                                    );
                                }
                            }
                        }
                    }
                }
                $('#export-to-gcs-modal .loading-overlay').hide();
            },
            error: function (data) {
                var link_to_bqr = data.responseJSON.msg.match(/register at least one bucket/);
                var link_to_gcpr = data.responseJSON.msg.match(/register at least one project/);
                if (link_to_bqr) {
                    data.responseJSON.msg = data.responseJSON.msg.replace(
                        "register at least one dataset",
                        '<a href="http://isb-cancer-genomics-cloud.readthedocs.io/en/latest/sections/webapp/program_data_upload.html#registering-cloud-storage-buckets-and-bigquery-datasets-a-pre-requisite-for-using-your-own-data-in-idc" target="_BLANK">register at least one dataset</a>'
                    );
                }
                if (link_to_gcpr) {
                    data.responseJSON.msg = data.responseJSON.msg.replace(
                        "register at least one project",
                        '<a href="http://isb-cancer-genomics-cloud.readthedocs.io/en/latest/sections/webapp/Gaining-Access-To-Contolled-Access-Data.html?#registering-your-google-cloud-project-service-account" target="_BLANK">register at least one project</a>'
                    );
                }
                base.showJsMessage('error', data.responseJSON.msg, true, "#export-to-gcs-js-messages");
                $('#export-to-gcs-modal .loading-overlay').hide();
            },
            complete: function () {
            }
        });
    });


    $('.container').on('submit', '#export-to-gcs-form', function(e) {
        e.preventDefault();
        e.stopPropagation();

        var $this = $(this);

        var fields = $this.serialize();

        $('#export-to-gcs-form input[type="submit"]').attr('disabled', 'disabled');
        $('#gcs-export-underway').css('display', 'inline-block');

        $.ajax({
            url: $this.attr('action'),
            data: fields,
            method: 'POST',
            success: function (data) {
                if(data.message) {
                    base.showJsMessage("info",data.message,true);
                }
            },
            error: function (xhr) {
                var responseJSON = $.parseJSON(xhr.responseText);
                // If we received a redirect, honor that
                if(responseJSON.redirect) {
                    base.setReloadMsg(responseJSON.level || "error",responseJSON.message);
                    window.location = responseJSON.redirect;
                } else {
                    base.showJsMessage(responseJSON.level || "error",responseJSON.message,true);
                }
            },
            complete: function(xhr, status) {
                $('#export-to-gcs-form input[type="submit"]').removeAttr('disabled');
                $('#export-to-gcs-modal').modal('hide');
                $('#gcs-export-underway').hide();
                $this[0].reset();
            }
        });
        return false;
    });

});