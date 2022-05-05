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
        base: 'base',
        sqlFormatter: 'libs/sql-formatter.min'
    }
});

require([
    'jquery',
    'base',
    'sqlFormatter'
], function($, base, sqlFormatter) {

    function getBqString(bqStringUri, OP, payload) {
        var csrftoken = $.getCookie('csrftoken');
        $.ajax({
            url: bqStringUri,
            type: OP,
            data: payload,
            beforeSend: function(xhr){xhr.setRequestHeader("X-CSRFToken", csrftoken);},
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
            },
            error: function (xhr) {
                console.debug(xhr);
            }
        });
    }

    $('#cohort-table').on('click', '.bq-string-display', function() {
        if($('#bq-string-display .bq-string').attr('cohort_id') !== $(this).data('cohort-id')) {
            $('#bq-string-display .bq-string').html("Loading...");
            $('#bq-string-display .bq-string').attr('cohort_id',$(this).data('cohort-id'));
            getBqString($(this).data('bq-string-uri'), 'GET', null);
        }
    });

    $('.explore-container').on('click', '.bq-string-display', function() {
        if($('#bq-string-display .bq-string').attr('filter-params') !== $(this).attr('filter-params')) {
            $('#bq-string-display .bq-string').html("Loading...");
            $('#bq-string-display .bq-string').attr('filter-params',$(this).attr('filter-params'));
            getBqString("/explore/bq_string/", 'POST', {"filters": $(this).attr('filter-params')});
        }
    });
});