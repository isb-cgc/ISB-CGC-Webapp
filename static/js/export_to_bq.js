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
        'jqueryui': ['jquery'],
        'base': ['jquery', 'jqueryui', 'bootstrap', 'underscore']
    }
});

require([
    'jquery',
    'base',
    'jqueryui',
    'bootstrap'
], function ($, base) {

    // Filelist Manifest Export to BQ
    $('.table-type').on('change', function (e) {
        $('#export-to-bq-table').val('');
        if ($(this).find(':checked').val() == 'append') {
            $('#export-to-bq-form input[type="submit"]').attr('disabled', 'disabled');
            $('#export-to-bq-table option:not([type="label"])').remove();
            var tables = $('#export-to-bq-project-dataset :selected').data('tables');
            for (var i = 0; i < tables.length; i++) {
                $('#export-to-bq-table').append('<option value="' + tables[i] + '">' + tables[i] + '</option>')
            }
            $('.table-list').show();
            $('.new-table-name').hide();
        } else {
            $('#export-to-bq-form input[type="submit"]').removeAttr('disabled');
            validate_new_table_name(e);
            $('.table-list').hide();
            $('.new-table-name').show();
        }
    });

    $('#new-table-name').on('keypress keyup paste', function (e) {
        var self = $(this);
        setTimeout(function () {
            validate_new_table_name(e);
        }, 70);
    });

    var validate_new_table_name = function(e){
        $('#export-to-bq-modal .modal-js-messages').empty();
        var str = $('#new-table-name').val();
        if (str.match(/[^A-Za-z0-9_]/)) {
            e.preventDefault();
            base.showJsMessage("error", "BigQuery table names are restricted to numbers, letters, and underscores.", false, $('#export-to-bq-modal .modal-js-messages'));
            $('#export-to-bq-form input[type="submit"]').attr('disabled', 'disabled');
            return false;
        } else {
            $('#export-to-bq-form input[type="submit"]').removeAttr('disabled');
        }

        if (str.length >= parseInt($('#new-table-name').attr('maxlength'))) {
            e.preventDefault();
            base.showJsMessage("warning", "You have reached the maximum size of the table name.", false, $('#export-to-bq-modal .modal-js-messages'));
            return false;
        }
    };

    $('#export-to-bq-table').on('change', function () {
        if ($(this).find(':selected').attr('type') !== "label") {
            $('#export-to-bq-form input[type="submit"]').removeAttr('disabled');
        }
    });

    $('#export-to-bq-project-dataset').on('change', function (e) {
        $('.table-type, .new-table-name').removeAttr('disabled');
        $('.table-type, .new-table-name').removeAttr('title');
        $('#export-to-bq-table option:not([type="label"])').remove();
        if ($('.table-type').find(':checked').val() == 'append') {
            if ($('#export-to-bq-table :selected').attr('type') !== "label") {
                $('#export-to-bq-form input[type="submit"]').removeAttr('disabled');
            } else {
                $('#export-to-bq-form input[type="submit"]').attr('disabled', 'disabled');
            }
        } else {
            $('#export-to-bq-form input[type="submit"]').removeAttr('disabled');
            validate_new_table_name(e);
        }

        var tables = $('#export-to-bq-project-dataset :selected').data('tables');
        if (tables.length > 0) {
            $('input.table-type[value="append"]').removeAttr('disabled');
            $('input.table-type[value="append"]').parents('label').removeAttr('title');
            for (var i = 0; i < tables.length; i++) {
                $('#export-to-bq-table').append('<option value="' + tables[i] + '">' + tables[i] + '</option>')
            }
        } else {
            $('input.table-type[value="append"]').attr('disabled', 'disabled');
            $('input.table-type[value="append"]').parents('label').attr('title', "There are no tables in this dataset.");
        }
    });

    $('.container').on('hide.bs.modal', '#export-to-bq-modal', function () {
        $('.table-type, .new-table-name').attr('disabled', 'disabled');
        $('.table-type, .new-table-name').attr('title', 'Select a project and dataset to enable this option');
        $('.new-table-name').show();
        $('.table-list').hide();
        $('.modal-js-messages').empty();
        $('#export-to-bq-form input[type="submit"]').attr('disabled', 'disabled');
        $('#export-to-bq-form')[0].reset();
        $('#export-underway').hide();
    });

    $('.container').on('click', 'button[data-target="#export-to-bq-modal"]', function (e) {
        // Don't reload the data if we have it already
        if($('#export-to-bq-modal select optgroup').length > 0) {
            $('#export-to-bq-modal .loading-overlay').hide();
            return true;
        }

        $('#export-to-bq-form input[type="submit"]').attr('disabled', 'disabled');
        $('#export-to-bq-modal .loading-overlay').show();

        $.ajax({
            type: 'GET',
            url: BASE_URL + '/accounts/users/'+request_user_id+'/datasets/',
            success: function (data) {
                if (data['status'] === 'success') {
                    if (Object.keys(data['data']['projects']).length > 0) {
                        var projects = data['data']['projects'];
                        for (var i = 0; i < projects.length; i++) {
                            if ($('optgroup.' + projects[i]['name']).length <= 0) {
                                $('#export-to-bq-project-dataset').append('<optgroup class="' + projects[i]['name'] + '" label="' + projects[i]['name'] + '"></optgroup>');
                            }
                            var datasets = projects[i]['datasets'];
                            for (var j in datasets) {
                                if (datasets.hasOwnProperty(j)) {
                                    $('optgroup.' + projects[i]['name']).append(
                                        '<option class="dataset" value="' + projects[i]['name'] + ':' + j + '">' + j + '</option>'
                                    );
                                    $('option[value="' + projects[i]['name'] + ':' + j + '"]').data({'tables': datasets[j]});
                                }
                            }
                        }
                    }
                }
                $('#export-to-bq-modal .loading-overlay').hide();
            },
            error: function (xhr) {
                var responseJSON = $.parseJSON(xhr.responseText);
                var link_to_bqr = responseJSON.msg.match(/register at least one dataset/);
                var link_to_gcpr = responseJSON.msg.match(/register at least one project/);
                if (link_to_bqr) {
                    responseJSON.msg = responseJSON.msg.replace(
                        "register at least one dataset",
                        '<a href="http://isb-cancer-genomics-cloud.readthedocs.io/en/latest/sections/webapp/program_data_upload.html#registering-cloud-storage-buckets-and-bigquery-datasets-a-pre-requisite-for-using-your-own-data-in-idc" target="_BLANK">register at least one dataset</a>'
                    );
                }
                if (link_to_gcpr) {
                    responseJSON.msg = responseJSON.msg.replace(
                        "register at least one project",
                        '<a href="http://isb-cancer-genomics-cloud.readthedocs.io/en/latest/sections/webapp/Gaining-Access-To-Contolled-Access-Data.html?#registering-your-google-cloud-project-service-account" target="_BLANK">register at least one project</a>'
                    );
                }
                base.showJsMessage('error', responseJSON.msg, true, "#export-to-bq-js-messages");
                $('#export-to-bq-modal .loading-overlay').hide();
            },
            complete: function () {
            }
        });
    });


    $('.container').on('submit', '#export-to-bq-form', function(e) {
        e.preventDefault();
        e.stopPropagation();

        var $this = $(this);

        if ($this.find('.table-type :checked').val() == 'new') {
            $('#export-to-bq-table').val('');
        }
        var fields = $this.serialize();

        $('#export-to-bq-form input[type="submit"]').attr('disabled', 'disabled');
        $('#export-underway').css('display', 'inline-block');

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
                $('#export-to-bq-form input[type="submit"]').removeAttr('disabled');
                $('#export-to-bq-modal').modal('hide');
                $('#export-underway').hide();
                $this[0].reset();
            }
        });
        return false;
    });

});