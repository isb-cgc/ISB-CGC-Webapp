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
        base: 'base'
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'base': ['jquery', 'jqueryui', 'session_security', 'bootstrap', 'underscore']
    }
});

require([
    'jquery',
    'base',
    'jqueryui',
    'bootstrap'
], function ($, base) {

    // Filelist Manifest Export to BQ
    $('.table-type').on('change', function () {
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
            $('.table-list').hide();
            $('.new-table-name').show();
        }
    });

    $('#new-table-name').on('keypress keyup paste', function (e) {
        var self = $(this);
        setTimeout(function () {
            $('.message-container').empty();
            var str = self.val();

            if (str.match(/[^A-Za-z0-9_]/)) {
                e.preventDefault();
                base.showJsMessage("error", "BigQuery table names are restricted to numbers, letters, and underscores.", false, $('.message-container'));
                return false;
            }

            if (str.length >= parseInt($('#new-table-name').attr('maxlength'))) {
                e.preventDefault();
                base.showJsMessage("warning", "You have reached the maximum size of the table name.", false, $('.message-container'));
                return false;
            }
        }, 70);
    });

    $('#export-to-bq-table').on('change', function () {
        if ($(this).find(':selected').attr('type') !== "label") {
            $('#export-to-bq-form input[type="submit"]').removeAttr('disabled');
        }
    });

    $('#export-to-bq-project-dataset').on('change', function () {
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

    $('.container').on('click', '#export-to-bq-modal input[type="submit"]', function () {
        $('#export-underway').css('display', 'inline-block');
    });

    $('.container').on('hide.bs.modal', '#export-to-bq-modal', function () {
        $('#export-to-bq-project-dataset optgroup').remove();
        $('.table-type, .new-table-name').attr('disabled', 'disabled');
        $('.table-type, .new-table-name').attr('title', 'Select a project and dataset to enable this option');
        $('.new-table-name').show();
        $('.table-list').hide();
        $('.message-container').empty();
        $('#export-to-bq-table option:not([type="label"])').remove();
        $('#export-to-bq-form input[type="submit"]').attr('disabled', 'disabled');
    });

    $('.container').on('click', 'button[data-target="#export-to-bq-modal"]', function (e) {
        if ($('#export-to-bq-modal').data('opening')) {
            e.preventDefault();
            return false;
        }
        $('#export-to-bq-modal').data('opening', true);
        $('#export-to-bq-form input[type="submit"]').attr('disabled', 'disabled');
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
            },
            error: function (data) {
                var link_to_bqr = data.responseJSON.msg.match(/register at least one dataset/);
                var link_to_gcpr = data.responseJSON.msg.match(/register at least one project/);
                if (link_to_bqr) {
                    data.responseJSON.msg = data.responseJSON.msg.replace(
                        "register at least one dataset",
                        '<a href="http://isb-cancer-genomics-cloud.readthedocs.io/en/latest/sections/webapp/program_data_upload.html#registering-cloud-storage-buckets-and-bigquery-datasets-a-pre-requisite-for-using-your-own-data-in-isb-cgc" target="_BLANK">register at least one dataset</a>'
                    );
                }
                if (link_to_gcpr) {
                    data.responseJSON.msg = data.responseJSON.msg.replace(
                        "register at least one project",
                        '<a href="http://isb-cancer-genomics-cloud.readthedocs.io/en/latest/sections/webapp/Gaining-Access-To-Contolled-Access-Data.html?#registering-your-google-cloud-project-service-account" target="_BLANK">register at least one project</a>'
                    );
                }
                base.showJsMessage('error', data.responseJSON.msg, true, "#export-to-bq-js-messages");
            },
            complete: function () {
                $('#export-to-bq-modal').modal('show');
                $('#export-to-bq-modal').data('opening', false);
            }
        });
        // Don't let the modal open automatically; we're controlling that.
        e.preventDefault();
        return false;
    });


    $('#export-to-bq-form').on('submit', function () {
        if ($('.table-type :checked').val() == 'new') {
            $('#export-to-bq-table').val('');
        }
        $('#export-to-bq-form input[type="submit"]').attr('disabled', 'disabled');
    });

});