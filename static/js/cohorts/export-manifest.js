/**
 *
 * Copyright 2020-2025, Institute for Systems Biology
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
        jquery: 'libs/jquery-3.7.1.min',
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
        session_security: 'session_security/script',
        cartutils: 'cartutils'

    },
    shim: {
        '@popperjs/core': {
            exports: "@popperjs/core"
        },
        'tippy': {
            exports: 'tippy',
            deps: ['@popperjs/core']
        },
        'cartutils': ['jquery'],
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
    'cartutils',
    'base', // Do not remove
    'bootstrap',
    'assetscore',
    'assetsresponsive',
], function($, jqueryui, tippy, cartutils, base) {

    A11y.Core();

    var downloadToken = new Date().getTime();

    $('#export-manifest-modal').on('show.bs.modal', function(event) {
        var button = $(event.relatedTarget)
        //coming from explorer page series or study
        if (button.hasClass('series-export') || button.hasClass('study-export')){
            update_export_modal_for_mini(button);
        } else if (button.hasClass('cart-export')){
            updatePartitionsFromScratch();
             window.updatePartitionsFromScratch();
             var ret =cartutils.formcartdata();
             window.partitions = ret[0];
             window.filtergrp_lst = ret[1];

             var projS = new Set();
             for (var i=0;i<partitions.length;i++){
                projS.add(partitions[i].id[0]);
             }
            var mxstudies=0;
            var mxseries=0;
            var projl = [...projS]
            for (var i=0;i<projl.length;i++){
               var proj = projl[i]
               mxseries+= window.selProjects[proj].mxseries;
               mxstudies+= window.selProjects[proj].mxstudies;
            }
            var filterSets = new Array();
            for(let i=0; i< window.cartHist.length;i++) {
               filterSets.push(window.cartHist[i]['filter'])
            }
            update_export_modal_for_cart(partitions, filterSets);
        } else if (button.hasClass('cart-export-from-cp')){
            update_export_modal_for_cart(window.partitions, window.filtergrp_list);
        } else if(button.hasClass('export-cohort-manifest')) {
            $('input[name="async_download"]').val(parseInt(button.attr('data-series-count')) > 65000 ? "True" : "False");
        }
    });

    var update_export_modal_for_cart = function(partitions, filtergrp_list, mxstudies=0, mxseries=0){
        is_cohort = false;
        let export_form = $('#export-manifest-form');
        var name_base='';
        $('.modal-title').text("Export Cart Manifest");
        export_form.append('<input type="hidden" name="from_cart">')
        export_form.find('input[name="from_cart"]').val("True");
        if(filtergrp_list !== null && filtergrp_list !== undefined && filtergrp_list.length > 0) {
            export_form.append('<input type="hidden" name="filtergrp_list">')
            export_form.find('input[name="filtergrp_list"]').val(JSON.stringify(filtergrp_list));
        }

        export_form.append('<input type="hidden" name="partitions">')
        export_form.find('input[name="partitions"]').val(JSON.stringify(partitions));
        export_form.append('<input type="hidden" name="mxstudies">')
        export_form.find('input[name="mxstudies"]').val(mxstudies);
        export_form.append('<input type="hidden" name="mxseries">')
        export_form.find('input[name="mxseries"]').val(mxseries);

        $('input[name="async_download"]').val(
            (parseInt(localStorage.getItem('manifestSeriesCount')) > 65000) ? "True" : "False"
        );

        export_form.append('<input type="hidden" name="filter_async">')
        export_form.find('input[name="filter_async"]').val( $('input[name="async_download"]').val() );

        let file_name = $('input[name="file_name"]');
        file_name.attr("name-base",name_base);

        $('#download-s5cmd').addClass('iscart');
        $('#download-idc-index').addClass('iscart');

        $('.filter-tab.manifest-file').hide();
        $('.filter-tab.manifest-bq').hide();

        update_file_names();
    }

     var reset_after_cart = function(){
        let export_modal = $('#export-manifest-modal');
        export_modal.find('input[name="from_cart"]').remove();
        export_modal.find('input[name="partitions"]').remove();
        export_modal.find('input[name="filtergrp_list"]').remove();
        export_modal.find('input[name="mxseries"]').remove();
        export_modal.find('input[name="mxstudies"]').remove();
        $('input[name="async_download"]').val( $('#export-manifest-form').find('input[name="filter_async"]').val());
        $('#export-manifest-form').find('input[name="filter_async"]').remove();
        $('#download-s5cmd').removeClass('iscart');
        $('#download-idc-index').removeClass('iscart');

        $('.filter-tab.manifest-file').show();
        $('.filter-tab.manifest-bq').show();
        $('.modal-title').text('Export Manifest');
    }

    const update_export_modal_for_mini = function(button){
        let export_modal = $('#export-manifest-modal');
        let export_form = $('#export-manifest-form');
        var title='';
        var filterNm='';
        var mini_type='';
        var name_base='';

        $('input[name="idc-index-loc-type"]').hide();
        $('.header-fields-container').hide();
        $('.idc-index-loc-type').hide();
        $('#download-idc-index').hide();
        $('.download-manifest-text').hide();

        $('.manifest-idc-index a').trigger('click');
        export_modal.find('input[name="async_download"]').val('false');
        if (button.hasClass('series-export')) {
            title = 'Series Export';
            filterNm = 'SeriesInstanceUID';
            mini_type = 'series';
            name_base='series_manifest';
            export_form.append('<input type="hidden" name="aws">')
            export_form.append('<input type="hidden" name="crdc">')
            export_form.append('<input type="hidden" name="single_series">')
            export_form.append('<input type="hidden" name="gcs">')
            export_modal.find('input[name="aws"]').val(button.parent().parent().data('aws'));
            export_modal.find('input[name="gcs"]').val(button.parent().parent().data('gcs'));
            export_modal.find('input[name="crdc"]').val(button.parent().parent().data('crdc'));
            export_modal.find('input[name="single_series"]').val("True");
        } else if (button.hasClass('study-export')) {
            title = 'Study Export';
            filterNm = 'StudyInstanceUID';
            mini_type = 'study';
            name_base='study_manifest';
        }

        $('.modal-title').text(title);
        export_form.append('<input type="hidden" name="mini">')
        export_form.find('input[name="mini"]').val(mini_type);

        export_form.append('<input type="hidden" name="uid">')
        export_modal.find('input[name="uid"]').val(button.data('uid'));

        let filt_str=export_form.find('input[name="filters"]').val()
        let filters= new Object();
        if (filt_str.length>0 && button.hasClass('study-export')){
            filters = JSON.parse(filt_str)
        }

        filters[filterNm]=[button.data('uid')]
        $('#export-manifest-form input[name="filters"]').val(JSON.stringify(filters));
        let file_name = $('input[name="file_name"]');
        file_name.attr("name-base",name_base);
        $('.manifest-file').hide();
        $('.manifest-bq').hide();
        $('#manifest-source').text((mini_type === "series" ? "" : "download this study manifest, "));
        if (button.hasClass('study-export')) {
            $('#s5cmd-header-fields').find('input[value="cohort_name"]').parent().hide();
            $('#s5cmd-header-fields').find('input[value="user_email"]').parent().hide();
        }
        update_file_names();
    };


    $('#export-manifest-modal').on('hide.bs.modal', function() {
        $('input').removeAttr('name-base');
        if ($('#export-manifest-modal').find('input[name="mini"]').length>0){
            reset_after_mini();
        }
        if ($('#export-manifest-modal').find('input[name="from_cart"]').length>0){
            reset_after_cart()
        }
    });

    $('#export-manifest-modal').on('hidden.bs.modal', function() {
      $('.manifest-file').show();
      $('.manifest-bq').show();
      $('#download-idc-index').show();
      $('.header-fields-container').show();
      $('.idc-index-loc-type').show();
      $('.download-manifest-text').show();
      $('#s5cmd-header-fields').find('input[value="cohort_name"]').parent().show();
      $('#s5cmd-header-fields').find('input[value="user_email"]').parent().show();
      $('.modal-title').text('Export Manifest');
      $('#manifest-source').text('manifest');
    });

    var reset_after_mini = function(){
        let export_modal = $('#export-manifest-modal');
        export_modal.find('input[name="mini"]').remove();
        export_modal.find('input[name="uid"]').remove();
        export_modal.find('input[name="crdc_uid"]').remove();
        export_modal.find('input[name="aws"]').remove();
        export_modal.find('input[name="single_series"]').remove();
        export_modal.find('input[name="gcs"]').remove();
        var filt_str = $('#export-manifest-form').find('input[name="filters"]').val()
        var filters=JSON.parse(filt_str);
        if ('StudyInstanceUID' in filters){
          delete filters['StudyInstanceUID']
        }
        if ('SeriesInstanceUID' in filters){
          delete filters['SeriesInstanceUID']
        }
    };

    $('.get-manifest').on('click', function(e) {
        download_manifest($(this).attr("data-export-type"), $(this), e)
    });

    var download_manifest = function(export_type, clicked_button, e) {
        if (clicked_button.is('[disabled=disabled]')) {
            e.preventDefault();
            return false;
        }

        let is_async = ($('input[name="async_download"]').val().toLowerCase() === "true");
        let is_full_export = (export_type === 'csv' || export_type === 'tsv' || export_type === 'json');
        let export_manifest_form = $('#export-manifest-form');
        let export_manifest = $('#export-manifest');

        let manifest_type = (export_type === 'bq' ? 'bq-manifest' : 'file-manifest');
        $('#unallowed-chars-alert').hide();
        $('#name-too-long-alert-modal').hide();

        let name = $('input[name="file_name"]').attr('name-base');
        if(export_type === 's5cmd' || export_type === 'idc_index') {
            name = name+"_"+$('input[name="loc_type_'+export_type+'"]:checked').val();
        }
        let unallowed = (((name !== undefined && name !== null) && name.match(base.blacklist)) || []);

        if (unallowed.length > 0) {
            $('.unallowed-chars').text(unallowed.join(", "));
            $('#unallowed-chars-alert').show();
            e.preventDefault();
            return false;
        }

        $('#manifest-in-progress').modal('show');
        if(manifest_type === 'file-manifest') {
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
        $('input[name="file_type"]').val(export_type);
        $('input[name="header_fields"]').val(JSON.stringify(checked_fields));
        $('input[name="file_name"]').val(name);
        $('input[name="columns"]').val(JSON.stringify(checked_columns));
        $('input[name="downloadToken"]').val(downloadToken);
        $('input[name="manifest-type"]').val(manifest_type);
        $('input[name="include_header"]').val('false');

        if(export_type !== 'bq') {
            $('input[name="include_header"]').val(($('#include-header-'
            + (export_type === 's5cmd' ? 's5cmd' : 'file')
                + '-checkbox').is(':checked')) ? 'true' : 'false');
        }
        if(manifest_type === 'file-manifest' && !is_async) {
            export_manifest_form.trigger('submit');
        } else {
            export_manifest.attr('disabled','disabled');
            export_manifest.attr('data-pending-manifest', 'true');
            export_manifest.attr('title','A manifest is currently being built.');
            $.ajax({
                url: export_manifest_form.attr('action'),
                data: export_manifest_form.serialize(),
                method: 'GET',
                success: function (data) {
                    if(data.message) {
                        base.showJsMessage("info",data.message,true);
                    }
                    if(data.jobId) {
                        let long_running_msg = "";
                        if(is_async && is_full_export) {
                            long_running_msg = "NOTE: This type of export can produce a very large file. ";
                        }
                        sessionStorage.setItem("user-manifest", data.file_name);
                        base.showJsMessage("info",
                            "Your manifest is being prepared. Once it is ready, this space will make it available for "
                            + `download. ${long_running_msg}`
                            + "<i class=\"fa-solid fa-arrows-rotate fa-spin\"></i>"
                            , true);
                        base.checkManifestReady(data.file_name);
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
                    $('#manifest-in-progress').modal('hide');
                    $('#export-manifest-modal').modal('hide');
                    export_manifest_form[0].reset();
                }
            });
        }
    };

    $('input.loc_type').on('change', function(){
        update_file_names(null);
    });

    var update_file_names = function(clicked) {
        let export_manifest_modal = $('#export-manifest-modal');
        let file_name = $('input[name="file_name"]');
        if(!clicked) {
            if(!file_name.attr("name-base") || file_name.attr("name-base").length <= 0) {
                file_name.attr("name-base", (is_cohort ? "cohort_" + cohort_id + export_manifest_modal.data('file-timestamp') : "file_manifest"));
            }
        } else {
            if(!file_name.attr("name-base") || file_name.attr("name-base").length <= 0) {
                let cohort_ids = [clicked.data('cohort-id')];
                file_name.attr("name-base", "cohort_" + cohort_ids.join("_") + export_manifest_modal.data('file-timestamp'));
            }
        }
        let s5cmd_manifest_filename = "<filename>";
        let idc_index_manifest_filename = "<filename>";
        let s5cmd_endpoint_url = $('input[name="loc_type_s5cmd"]:checked').attr('data-endpoint-url');

        let s5cmd_text = `s5cmd --no-sign-request --endpoint-url ${s5cmd_endpoint_url} run ${s5cmd_manifest_filename}`;
        let idc_index_text = `idc download ${idc_index_manifest_filename}`;

        if (export_manifest_modal.find('input[name="mini"]').length > 0) {
            let uid=export_manifest_modal.find('input[name="uid"]').val();
            idc_index_text = `idc download ${uid}`;
        }
        $('.s5cmd-text').text(s5cmd_text);
        $('.s5cmd.copy-this').attr("content",s5cmd_text);
        $('.idc-index-text').text(idc_index_text);
        $('.idc-index.copy-this').attr("content",idc_index_text);
    }

    var update_download_manifest_buttons = function(clicked){
        if(clicked) {
            let cohort_row = clicked.parents('tr'),
                inactives = (cohort_row.data('inactive-versions') === "True");
            if(inactives) {
                $('.manifest-bq a').trigger('click');
                $('.manifest-button-wrapper a, .file-manifest-button-wrapper a').attr('disabled', 'disabled');
                $('.manifest-button-wrapper, .file-manifest-button-wrapper').addClass('version-disabled');
            } else {
                $('#s5cmd-max-exceeded, #file-manifest-max-exceeded').hide();
                $('.manifest-s5cmd a').trigger('click');
                $('.manifest-button-wrapper a, .file-manifest-button-wrapper a').removeAttr('disabled');
                $('.manifest-button-wrapper, .file-manifest-button-wrapper').removeClass('version-disabled');
            }
        }
        $('.cmd-file-name').text($('#export-s5cmd-name').val());
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
    if(!user_is_auth) {
        bq_disabled_message += ' Please log in with a Google Social account to enable this feature.'
    } else if((user_is_social) && (typeof(user_id)!=="undefined")){
        bq_disabled_message += ' You can link your account to a Google ID from the '
            +  '<a target="_blank" rel="noopener noreferrer" href="/users/' + user_id + '/">'
            + 'Account Details</a> page.'
    } else if ((typeof(is_cohort)!=="undefined") && (!is_cohort)) {
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
