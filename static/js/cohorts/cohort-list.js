/**
 *
 * Copyright 2018, Institute for Systems Biology
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
        'datatables.net': 'libs/jquery.dataTables.min',
        underscore: 'libs/underscore-min',
        assetscore: 'libs/assets.core',
        assetsresponsive: 'libs/assets.responsive',
        jquerydt: 'libs/jquery.dataTables.min',
        session_security: 'session_security/script',
        base: 'base',
        sqlFormatter: 'libs/sql-formatter.min',
        tippy: 'libs/tippy-bundle.umd.min',
        '@popperjs/core': 'libs/popper.min'
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
        'datatables.net': ['jquery']
    }
});

require([
    'jquery',
    'base',
    'sqlFormatter',
    'tippy',
    'datatables.net',
    'jqueryui',
    'bootstrap'
], function($,base, sqlFormatter, tippy) {

    var cohort_list_table = $('#cohort-table').DataTable({
        "dom": '<"dataTables_controls"ilpf>rt<"bottom"><"clear">',
        "order": [[ 1, "desc" ]],
        "columns": [
            { "orderable": false },
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            { "orderable": false },
            { "orderable": false },
            { "orderable": false },
            { "orderable": false }
        ]
    });

    var QUERY_STRINGS = {};

    $('#cohort-table tbody').on('click', 'td.details-control', function () {
        var tr = $(this).parents('tr');
        var row = cohort_list_table.row(tr);

        if (row.child.isShown()) {
            // This row is already open - close it
            row.child.hide();
            tr.removeClass('shown');
            $(this).prop('title', 'Click to display additional cohort details.');
        } else {
            $(this).prop('title', 'Click to hide cohort details.');
            var desc = tr.data('description');
            var collex = tr.data('collex');
            var name = tr.data('name');
            var filters = tr.data('filters');
            (row.child() && row.child().length) ? row.child.show() : row.child(
                $(`<tr><td></td>`+
                    `<td colspan="6"><p><b>Name </b><br/>`+name+`</p>`+
                    `<p><b>Description </b><br/>`+desc+`</p>`+
                    `<p><b>Collections </b><br/>`+collex+`</p></td>`+
                    `<td colspan="3"><p><b>Filters</b><br />`+filters+`</p></td>`+
                    `</tr>`)
            ).show();
            tr.addClass('shown');
        }
    });

    // Resets forms in modals on cancel. Suppressed warning when leaving page with dirty forms
    $('.modal').on('hide.bs.modal', function() {
        $('.filename-missing').removeClass('filename-missing');
        var form = $(this).find('form');
        if(form.length){
            form[0].reset();
            $('#delete-cohort-form input.cohort-id').remove();
            $('#base-id').empty();
            $('#subtract-ids').empty();
        }
    });

    $('.add-cohort').on('click', function() {
        $(this).siblings('.search-cohorts').show();
        return false;
    });

    $('#cohort-table').on('click', '.compare-version', function(){
        let cohort_row = $(this).closest('tr');
        let id = $(cohort_row).find('.id-col').text().trim();
        let case_col = $(cohort_row).find('.case-col').text().trim();
        let study_col = $(cohort_row).find('.study-col').text().trim();
        let series_col = $(cohort_row).find('.series-col').text().trim();
        let totals = JSON.stringify(["PatientID","StudyInstanceUID","SeriesInstanceUID"]);

       //# PatientId, StudyInstanceUID SeriesInstanceUID
        let url = '/cohorts/'+id+'/stats/?update=true'
        url = encodeURI(url);
        $('#version_d').find('#ui-id-1')[0].innerHTML='Comparing Versions of Cohort '+id;
        $('.spinner').show();
        $.ajax({
            url: url,
            dataType: 'json',
            type: 'get',
            contentType: 'application/x-www-form-urlencoded',
            success: function (data) {
                $('#version_d').show();
                var pageWidth = window.innerWidth;
                var pageHeight = window.innerHeight;
                var myElementWidth = document.getElementById('version_d').offsetWidth;
                var myElementHeight = document.getElementById('version_d').offsetHeight;
                document.getElementById('version_d').style.top = (pageHeight / 2) - (myElementHeight / 2) + "px";
                document.getElementById('version_d').style.left = (pageWidth / 2) - (myElementWidth / 2) + "px";
                $('#version_d').find('.case_o')[0].innerHTML=case_col;
                $('#version_d').find('.case_c')[0].innerHTML=data['PatientID'].toString();

                $('#version_d').find('.study_o')[0].innerHTML=study_col;
                $('#version_d').find('.study_c')[0].innerHTML=data['StudyInstanceUID'].toString();

                $('#version_d').find('.series_o')[0].innerHTML=series_col;
                $('#version_d').find('.series_c')[0].innerHTML=data['SeriesInstanceUID'].toString();
                if(data['PatientID'] <= 0) {
                    $('.load-new').attr("disabled","disabled");
                    $('.none-found').show();
                } else {
                    $('.load-new').removeAttr("disabled");
                    $('.none-found').hide();
                    $('.load-new').attr("onclick","location.href = '/explore/?cohort_id="+id+"'");
                }
                if(data['inactive_attr']) {
                    $('#version_d .inactive-filters').show();
                    $('#version_d .inactive-filters .inactive-attrs').text(data['inactive_attr']);
                } else {
                    $('#version_d .inactive-filters').hide();
                }
                if(!data['filters_found']) {
                    $('#version_d .no-filters-found').show();
                    $('#version_d .some-found').hide();
                } else {
                    $('#version_d .no-filters-found').hide();
                    $('#version_d .some-found').show();
                }
               $('.spinner').hide();
            },
            error: function () {
                $('.spinner').hide();
                console.log("problem getting data");
            }
        });
    });

    $('#cohort-table').on('click', '.bq-string-display', function() {
        if($('#bq-string-display .bq-string').attr('cohort_id') !== $(this).data('cohort-id')) {
            let for_update = $(this).data('bq-string-uri').includes("update");
            $('#bq-string-display .notes').hide();
            $('#bq-string-display .bq-string').html("Loading...");
            $('#bq-string-display .bq-string').attr('cohort_id',$(this).data('cohort-id'));
            $.ajax({
                url: $(this).data('bq-string-uri'),
                type: 'GET',
                success: function (data) {
                    // sql-formatter doesn't support BigQuery at the moment, so we need to do a little tweaking of the
                    // output.
                    let formattedSql = sqlFormatter.format(
                        data['data']['query_string'].replace("#standardSQL", "")
                    );
                    formattedSql = formattedSql.replace(/\s-\s/g, "-")
                        .replace(/((JOIN|FROM)\s+`)\s+/g, "$1")
                        .replace(/(\.[A-Za-z0-9_]+)\s`/g, "$1`")
                        // Indent ON to the next line for ease of reading
                        .replace(/([^\S\n\r]*)(LEFT|RIGHT)*(\sJOIN\s[A-Za-z0-9`_\.\s-]+)\s(ON\s)/g, "$1$2$3\n$1$4")
                    ;
                    $('#bq-string-display .copy-this').attr('content', formattedSql);
                    $('#bq-string-display .bq-string').html(formattedSql);
                    $('#bq-string-display .unformatted').removeClass('unformatted');
                    if(for_update) {
                        if(data['inactive_attr']) {
                            $('#bq-string-display .inactive-filters').show();
                            $('#bq-string-display .inactive-filters .inactive-attrs').text(data['inactive_attr']);
                        } else {
                            $('#bq-string-display .inactive-filters').hide();
                        }
                        !(data['filters_found']) ? $('#bq-string-display .no-filters-found').show() : $('#bq-string-display .no-filters-found').hide();
                        (data['PatientID'] <= 0) ? $('#bq-string-display .none-found').show() : $('#bq-string-display .none-found').hide();
                        (data['inactive_attr'] || data['PatientID'] <= 0 || !(data['filters_found'])) ? $('.no-table-change').show() : $('.no-table-change').hide();
                    }
                },
                error: function (xhr) {
                    console.debug(xhr);
                }
            });
        }
    });

    $('#cohort-table').on('click', '.delete-cohort', function(){
        let cohort_id = $(this).data('cohort-id');
        $('span.del-cohort').text(cohort_id);
        $('#delete-cohort-form').append('<input class="cohort-id" type="hidden" name="id" value="' + cohort_id + '" />');
    });

    tippy.delegate('#cohort-table', {
        allowHTML:true,
        content: 'This cohort contains one or more attributes which are no longer available in the current version.<br />' +
            'If you bring this cohort into latest IDC data version, the filters for those inactive attributes will be removed.<br />' +
            'The cases, series, and studies contained in your cohort may change from this version.',
        target: '.inactive-attr'
    });

    $(document).ready(function () {
        $('.cohorts-panel, .site-footer').removeClass('hidden');
    });
});