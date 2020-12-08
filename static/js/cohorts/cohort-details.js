/**
 *
 * Copyright 2020, Institute for Systems Biology
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
    baseUrl: STATIC_FILES_URL + 'js/',
    paths: {
        jquery: 'libs/jquery-3.5.1',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        underscore: 'libs/underscore-min',
        assetscore: 'libs/assets.core',
        assetsresponsive: 'libs/assets.responsive',
        base: 'base',
        tippy: 'libs/tippy-bundle.umd.min',
        '@popperjs/core': 'libs/popper.min'
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'assetscore': ['jquery', 'bootstrap', 'jqueryui'],
        'assetsresponsive': ['jquery', 'bootstrap', 'jqueryui'],
        '@popperjs/core': {
          exports: "@popperjs/core"
        },
        'tippy': {
          exports: 'tippy',
            deps: ['@popperjs/core']
        }
    }
});

require([
    'jquery',
    'jqueryui',
    'base',
    'tippy',
    'bootstrap',
    'assetscore'
    ,'assetsresponsive',
], function($, jqueryui, base, tippy, bootstrap) {
    A11y.Core();

    var downloadToken = new Date().getTime();

    $('#download-csv').on('click', function(e) {
        download_manifest("csv", $(this), e)
    });

    $('#download-tsv').on('click', function(e) {
        download_manifest("tsv", $(this), e)
    });

    $('#download-json').on('click', function(e) {
        download_manifest("json", $(this), e)
    });

    $('.export-option input[type="radio"]').click(function(){
        update_export_option($(this).attr("value"));
    });

    var update_export_option = function(export_option) {
        $('#bq-manifest').hide();
        $('#file-manifest').hide();
        $('#' + export_option).show();
    };

    update_export_option("file-manifest");

    var download_manifest = function(file_type, clicked_button, e) {
        let manifest_type = $('input[name="manifest-type"]:checked').val();

        $('#unallowed-chars-alert').hide();
        $('#name-too-long-alert-modal').hide();

        var name = $('#export-manifest-name').val();
        var unallowed = (name.match(base.blacklist) || []);

        if (name.length == 0) {
            $('#download-csv').prop('title','Please provide a file name.');
            $('#export-manifest-name')[0].focus();
            e.preventDefault();
            return false;
        }

        if (clicked_button.is('[disabled=disabled]')) {
            e.preventDefault();
            return false;
        }

        if (unallowed.length > 0) {
            $('.unallowed-chars').text(unallowed.join(", "));
            $('#unallowed-chars-alert').show();
            e.preventDefault();
            return false;
        }

        if (name.length > 255) {
            $('#name-too-long-alert-modal').show();
            e.preventDefault();
            return false;
        }

        $('#download-csv').attr('disabled','disabled');
        $('#download-tsv').attr('disabled','disabled');
        $('#download-json').attr('disabled','disabled');
        $('#get-bq-table').attr('disabled','disabled');

        $('#manifest-in-progress').modal('show');

        if(manifest_type == 'file-manifest') {
            base.blockResubmit(function () {
                update_download_manifest_buttons();
                $('#manifest-in-progress').modal('hide');
            }, downloadToken, 'downloadToken');
        }

        var checked_fields = [];
        $('.field-checkbox').each(function()
        {
            var cb = $(this)[0];
            if (cb.checked)
            {
                checked_fields.push(cb.value);
            }
        });

        var checked_columns = [];
        $('.column-checkbox').each(function()
        {
           var cb = $(this)[0];
           if (cb.checked)
           {
               checked_columns.push(cb.value);
           }
        });

        $('input[name="file_type"]').val(file_type);
        $('input[name="header_fields"]').val(JSON.stringify(checked_fields));
        $('input[name="columns"]').val(JSON.stringify(checked_columns));
        $('input[name="downloadToken"]').val(downloadToken);
        $('input[name="include_header"]').val($('#include-header-checkbox').is(':checked') ? 'true': 'false');

        var select_box_div = $('#file-part-select-box');
        var select_box = select_box_div.find('select');
        if (select_box_div.is(":visible")) {
            var selected_file_part = select_box.children("option:selected").val();
            $('input[name="file_part"]').val(selected_file_part);
        } else {
            $('input[name="file_part"]').val("");
        }

        if(manifest_type == 'file-manifest') {
            $('#export-manifest-form').submit();
        } else {
            $.ajax({
                url: $('#export-manifest-form').attr('action'),
                data: $('#export-manifest-form').serialize(),
                method: 'GET',
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
                    update_download_manifest_buttons();
                    $('#manifest-in-progress').modal('hide');
                    $('#export-manifest-modal').modal('hide');
                    $('#export-manifest-form')[0].reset();
                    $('#bq-export-option input').prop('checked', true).trigger("click");
                }
            });
        }
    };

    $('.column-checkbox').change(function() {
        update_download_manifest_buttons();
    });

    $("#export-manifest-name").change(function(){
        update_download_manifest_buttons();
    });

    var update_download_manifest_buttons = function(){
        var num_selected_column =$('.column-checkbox:checked').length;
        var input_cohort_name_len = $('#export-manifest-name').val().length;

        if (input_cohort_name_len == 0 || num_selected_column == 0) {
            $('#download-csv').attr('disabled', 'disabled');
            $('#download-tsv').attr('disabled', 'disabled');
            $('#download-json').attr('disabled', 'disabled');
            $('#get-bq-table').attr('disabled', 'disabled');
        }
        else
        {
            $('#download-csv').removeAttr('disabled');
            $('#download-tsv').removeAttr('disabled');
            $('#download-json').removeAttr('disabled');
            $('#get-bq-table').removeAttr('disabled');
        }

        if (num_selected_column == 0) {
            $('#no-column-alert-modal').show();
        }
        else
        {
            $('#no-column-alert-modal').hide();
        }
    };

    update_download_manifest_buttons();

    $('#get-bq-table').on('click',function(){
        download_manifest('',$(this));
    });

});