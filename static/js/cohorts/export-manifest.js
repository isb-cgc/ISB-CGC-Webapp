/**
 *
 * Copyright 2021, Institute for Systems Biology
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
        tablesorter: 'libs/jquery.tablesorter.min',
        assetscore: 'libs/assets.core',
        assetsresponsive: 'libs/assets.responsive',
        jquerydt: 'libs/jquery.dataTables.min',
        base: 'base',
        tippy: 'libs/tippy-bundle.umd.min',
        '@popperjs/core': 'libs/popper.min',
        session_security: 'session_security/script'
    },
    shim: {
        '@popperjs/core': {
            exports: "@popperjs/core"
        },
        'tippy': {
            exports: 'tippy',
            deps: ['@popperjs/core']
        },
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'jquerydt': ['jquery'],
        'underscore': {exports: '_'},
        'tablesorter': ['jquery'],
        'assetscore': ['jquery', 'bootstrap', 'jqueryui'],
        'session_security': ['jquery'],
        'assetsresponsive': ['jquery', 'bootstrap', 'jqueryui']
    }
});

require([
    'jquery',
    'jqueryui',
    'tippy',
    'base', // Do not remove
    'bootstrap',
    'assetscore',
    'assetsresponsive',
], function($, jqueryui, tippy, base) {
    A11y.Core();

    var downloadToken = new Date().getTime();

    $('#export-manifest-modal').on('show.bs.modal', function(event) {
        var button = $(event.relatedTarget)
        if (button.hasClass('series-export') || button.hasClass('study-export')){
            update_export_modal_for_mini(button);
        }
    });

    var update_export_modal_for_mini= function(button){

        var title='';
        var filterNm='';
        var mini_type='';
        var name_base='';

        if (button.hasClass('series-export')) {
            title = 'Series Export';
            filterNm = 'Series InstanceUID';
            mini_type = 'series';
            name_base='series_manifest';

            $('#export-manifest-form').append('<input type="hidden" name="aws">')
            $('#export-manifest-modal').find('input[name="aws"]').val(button.parent().parent().data('aws'));
            $('#export-manifest-form').append('<input type="hidden" name="gcs">')
            $('#export-manifest-modal').find('input[name="gcs"]').val(button.parent().parent().data('gcs'));
            $('#export-manifest-form').append('<input type="hidden" name="crdc">')
            $('#export-manifest-modal').find('input[name="crdc"]').val(button.parent().parent().data('crdc'));

        }
        else if (button.hasClass('study-export')) {
            title = 'Study Export';
            filterNm = 'StudyInstanceUID';
            mini_type = 'study';
            name_base='study_manifest';
        }

        $('.modal-title').text(title);
        $('#export-manifest-form').append('<input type="hidden" name="mini">')
        $('#export-manifest-form').find('input[name="mini"]').val(mini_type);

        $('#export-manifest-form').append('<input type="hidden" name="uid">')
        $('#export-manifest-modal').find('input[name="uid"]').val(button.data('uid'));

        var filt_str=$('#export-manifest-form').find('input[name="filters"]').val()
        filters= new Object();
        if (filt_str.length>0){
            filters=JSON.parse(filt_str)
        }

        filters[filterNm]=[button.data('uid')]
        $('#export-manifest-form input[name="filters"]').val(JSON.stringify(filters));
        let file_name = $('input[name="file_name"]');
        file_name.attr("name-base",name_base);
        $('.manifest-file').hide();
        $('.manifest-bq').hide();
        $('#manifest-source').text((mini_type === "series" ? "" : "download this study manifest, "));
        if (button.hasClass('series-export')) {
            $('#export-manifest-form').find('#s5cmd-header-fields-container').hide();
            $('#export-manifest-form').find('#download-s5cmd').hide();
        }
        else if (button.hasClass('study-export')) {
            $('#s5cmd-header-fields').find('input[value="cohort_name"]').parent().hide();
            $('#s5cmd-header-fields').find('input[value="user_email"]').parent().hide();
        }
        update_file_names();
    }

    $('#export-manifest-modal').on('hide.bs.modal', function() {
        $('input').removeAttr('name-base');
        if ($('#export-manifest-modal').find('input[name="mini"]').length>0){
            reset_after_mini()
        }
    });

    var reset_after_mini = function(){
      $('#export-manifest-modal').find('input[name="mini"]').remove();
      $('#export-manifest-modal').find('input[name="uid"]').remove();
      $('#export-manifest-modal').find('input[name="crdc_uid"]').remove();
      $('#export-manifest-modal').find('input[name="aws"]').remove();
      $('#export-manifest-modal').find('input[name="gcs"]').remove();

      var filt_str=$('#export-manifest-form').find('input[name="filters"]').val()
        var filters=JSON.parse(filt_str);
      if ('StudyInstanceUID' in filters){
          delete filters['StudyInstanceUID']
      }
      if ('SeriesInstanceUID' in filters){
          delete filters['SeriesInstanceUID']
      }
      $('.manifest-file').show();
      $('.manifest-bq').show();
      $('#export-manifest-form').find('#s5cmd-header-fields-container').show();
      $('#export-manifest-form').find('#download-s5cmd').show();
      $('#s5cmd-header-fields').find('input[value="cohort_name"]').parent().show();
      $('#s5cmd-header-fields').find('input[value="user_email"]').parent().show();
      $('.modal-title').text('Export Manifest');
      $('#manifest-source').text('manifest');
    }

    $('#download-csv').on('click', function(e) {
        download_manifest("csv", $(this), e)
    });

    $('#download-tsv').on('click', function(e) {
        download_manifest("tsv", $(this), e)
    });

    $('#download-json').on('click', function(e) {
        download_manifest("json", $(this), e)
    });

    $('#download-s5cmd').on('click', function(e) {
        download_manifest("s5cmd", $(this), e)
    });

    $('#get-bq-table').on('click',function(e){
        download_manifest('bq',$(this), e);
    });

    var download_manifest = function(file_type, clicked_button, e) {
        let manifest_type = file_type === 'bq' ? 'bq-manifest' : 'file-manifest';

        $('#unallowed-chars-alert').hide();
        $('#name-too-long-alert-modal').hide();

        let name = $('input[name="file_name"]').attr('name-base');
        if(file_type === 's5cmd') {
            name = name+"_"+$('input.loc_type:checked').val();
        }
        let unallowed = (name.match(base.blacklist) || []);

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

        $('#manifest-in-progress').modal('show');

        if(manifest_type == 'file-manifest') {
            base.blockResubmit(function () {
                $('#manifest-in-progress').modal('hide');
            }, downloadToken, 'downloadToken');
        }

        let checked_fields = [];
        clicked_button.parents('.tab-pane.manifest').find('.field-checkbox').each(function() {
            var cb = $(this)[0];
            if (cb.checked) {
                checked_fields.push(cb.value);
            }
        });

        let checked_columns = [];
        clicked_button.parents('.tab-pane.manifest').find('.column-checkbox').each(function() {
            var cb = $(this)[0];
            if (cb.checked) {
                checked_columns.push(cb.value);
            }
        });

        $('input[name="file_type"]').val(file_type);
        $('input[name="header_fields"]').val(JSON.stringify(checked_fields));
        $('input[name="file_name"]').val(name);
        $('input[name="columns"]').val(JSON.stringify(checked_columns));
        $('input[name="downloadToken"]').val(downloadToken);
        $('input[name="manifest-type"]').val(manifest_type);

        $('input[name="include_header"]').val('false');

        if(file_type !== 'bq') {
            $('input[name="include_header"]').val(($('#include-header-'
            + (file_type === 's5cmd' ? 's5cmd' : 'file')
                + '-checkbox').is(':checked')) ? 'true' : 'false');
        }

        var select_box_div = $('#file-part-select-box');
        var select_box = select_box_div.find('select');
        if (select_box_div.is(":visible")) {
            var selected_file_part = select_box.children("option:selected").val();
            $('input[name="file_part"]').val(selected_file_part);
        } else {
            $('input[name="file_part"]').val("");
        }

        if(manifest_type == 'file-manifest') {
            $('#export-manifest-form').trigger('submit');
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
                    $('.get-manifest').removeAttr('disabled');
                    $('#manifest-in-progress').modal('hide');
                    $('#export-manifest-modal').modal('hide');
                    $('#export-manifest-form')[0].reset();
                }
            });
        }

    };

    $('input.loc_type').on('change',function(){
        update_file_names(null);
    });

    var update_file_names = function(clicked) {
        let file_name = $('input[name="file_name"]');
        if(!clicked) {
            if(!file_name.attr("name-base") || file_name.attr("name-base").length <= 0) {
                file_name.attr("name-base", (is_cohort ? "cohort_" + cohort_id + $('#export-manifest-modal').data('file-timestamp') : "file_manifest"));
            }
        } else {
            if(!file_name.attr("name-base") || file_name.attr("name-base").length <= 0) {
                let cohort_ids = [clicked.data('cohort-id')];
                file_name.attr("name-base", "cohort_" + cohort_ids.join("_") + $('#export-manifest-modal').data('file-timestamp'));
            }
        }
        let manifest_filename = file_name.attr("name-base")+"_"+$('input.loc_type:checked').val();
        let endpoint_url = ($('input.loc_type:checked').val() === "aws" ? "https://s3.amazonaws.com" : "https://storage.googleapis.com");
        let s5cmd_text = `s5cmd --no-sign-request --endpoint-url ${endpoint_url} run ${manifest_filename}.s5cmd`;


        if ($('#export-manifest-modal').find('input[name="mini"]').val()==='series') {
            let crdc=$('#export-manifest-modal').find('input[name="crdc"]').val()
            let bucket = ($('input.loc_type:checked').val() === "aws" ? $('input[name="aws"]').val() : $('input[name="gcs"]').val());
            s5cmd_text = `s5cmd --no-sign-request --endpoint-url ${endpoint_url} cp 's3://${bucket}/${crdc}/*' .`;

        }


        $('.s5cmd-text').text(s5cmd_text);
        $('.s5cmd.copy-this').attr("content",s5cmd_text);
    }

    var update_download_manifest_buttons = function(clicked){
        let cohort_row = null, inactives = false;
        if(clicked) {
            cohort_row = clicked.parents('tr');
            inactives = (cohort_row.data('inactive-versions') === "True");
        }
        if(inactives) {
            $('.manifest-bq a').trigger('click');
            $('.download-file a,.file-manifest a').attr('disabled', 'disabled');
            $('.manifest-s5cmd, .manifest-file').addClass('version-disabled');
            $('.manifest-s5cmd a, .manifest-file a').addClass('disabled');
        } else {
            $('.manifest-s5cmd a').trigger('click');
            $('.download-file a, .file-manifest a').removeAttr('disabled');
            $('.manifest-s5cmd a, .manifest-file a').removeClass('disabled');
            $('.manifest-file, .manifest-s5cmd').removeClass('version-disabled');
            if(cohort_row) {
                let file_parts_count = cohort_row.data('file-parts-count');
                let display_file_parts_count = cohort_row.data('display-file-parts-count')
                if (file_parts_count > display_file_parts_count) {
                    $('#manifest-file').attr('title', 'Your cohort\'s size exceeds the limit for file manifest download--please use BQ export or s5cmd manifest.');
                    $('#manifest-file').attr('disabled', 'disabled');
                } else {
                    var select_box_div = $('#file-part-select-box');
                    var select_box = select_box_div.find('select');
                    if (file_parts_count > 1) {
                        select_box_div.show();
                        for (let i = 0; i < display_file_parts_count; ++i) {
                            select_box.append($('<option/>', {
                                value: i,
                                text : "File Part " + (i + 1)
                            }));
                        }
                    } else {
                        select_box_div.hide();
                    }
                }
            }
            $('.cmd-file-name').text($('#export-s5cmd-name').val());
        }
    };

    // The Export button for each cohort on the Cohort List Page
    $('#saved-cohorts-list').on('click', '.export-cohort-manifest', function(){
        let cohort_ids = [$(this).data('cohort-id')];

        $('#export-manifest-form').attr(
            'action',
            $('#export-manifest-form').data('uri-base')+"?ids="+encodeURIComponent(cohort_ids.join(","))
        );

        $('input[name="ids"]').val(cohort_ids.join(","))

        update_file_names($(this));
        update_download_manifest_buttons($(this));
    });

    // The Export Manifest button on the cohort details page
    $('#export-manifest').on('click',function(){
        update_file_names();
        update_download_manifest_buttons();
    });

    let bq_disabled_message = 'Exporting to BigQuery requires you to be logged in with a linked Google Social Account, and to save your filters as a cohort.';
    if(!user_is_social) {
        bq_disabled_message += ' You can link your account to a Google ID from the '
            +  '<a target="_blank" rel="noopener noreferrer" href="/users/' + user_id + '/">'
            + 'Account Details</a> page.'
    } else if(!user_is_auth) {
        bq_disabled_message += ' Please log in with a Google Social account to enable this feature.'
    } else if(!is_cohort) {
        bq_disabled_message += ' Please save these filters as a cohort to enable this feature.'
    }

    tippy.delegate('#export-manifest-modal', {
        content: bq_disabled_message,
        theme: 'dark',
        placement: 'right',
        arrow: true,
        interactive: true,
        allowHTML: true,
        target: '.bq-disabled'
    });

    tippy.delegate('#export-manifest-modal', {
        content: "Only a cohort with an active data version can be downloaded as a file",
        theme: 'dark',
        placement: 'top',
        arrow: true,
        interactive: true,
        onTrigger: (instance, event) => {
            if($(event.target).hasClass('version-disabled')) {
                instance.enable();
            } else {
                instance.disable();
            }
        },
        onUntrigger: (instance, event) => {
            instance.enable();
        },
        allowHTML: true,
        target: '.version-disabled'
    });

});