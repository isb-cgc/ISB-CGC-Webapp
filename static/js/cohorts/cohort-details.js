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
        sqlFormatter: 'libs/sql-formatter.min'
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'assetscore': ['jquery', 'bootstrap', 'jqueryui'],
        'assetsresponsive': ['jquery', 'bootstrap', 'jqueryui']
    }
});

require([
    'jquery',
    'jqueryui',
    'base',
    'sqlFormatter',
    'bootstrap',
    'assetscore',
    'assetsresponsive'
], function($, jqueryui, base, sqlFormatter) {
    A11y.Core();

    $('#bq-string-display').on('show.bs.modal', function() {
        if($('#bq-string-display .unformatted').length > 0) {
            // sql-formatter doesn't support BigQuery at the moment, so we need to do a little tweaking of the
            // output.
            let formattedSql = sqlFormatter.format($('#bq-string-display .bq-string').text().replace("#standardSQL", ""));
            formattedSql = formattedSql.replace(/\s-\s/g, "-")
                .replace(/((JOIN|FROM)\s+`)\s+/g, "$1")
                .replace(/(\.[A-Za-z0-9_]+)\s`/g, "$1`")
                // Indent ON to the next line for ease of reading
                .replace(/([^\S\n\r]*)(LEFT|RIGHT)*(\sJOIN\s[A-Za-z0-9`_\.\s-]+)\s(ON\s)/g, "$1$2$3\n$1$4")
            ;
            $('#bq-string-display .copy-this').attr('content', formattedSql);
            $('#bq-string-display .bq-string').html(formattedSql);
            $('#bq-string-display .unformatted').removeClass('unformatted');
        }
    });

});