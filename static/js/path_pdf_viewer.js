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
        jquery: 'libs/jquery-1.11.1.min',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        session_security: 'session_security',
        underscore: 'libs/underscore-min',
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'session_security': ['jquery'],
    }
});

require([
    'jquery',
    'jqueryui',
    'bootstrap',
    'session_security'
], function ($) {

    $('#path-report-iframe').on('load',function(){
        $('.load-spinner').hide();
        // Resize the iFrame's height to center the view vertically
        if($('#path-pdf').length > 0) {
            $('#path-report-iframe').height(($(window).height() - $('.navbar').height() - ($('#path-report-viewer').height() - $('#path-report-iframe').height())));
            $(window).scrollTop(0);
        }
    });

    // Because we're operating a bit outside the Bootstrap framework on the path-pdf template,
    // we need to force the loading spinner to size properly
    if($('#path-pdf').length > 0) {
        $('.load-spinner').width($('#path-report-iframe').css('width'));
        $('.load-spinner').height($('#path-report-iframe').css('height'));
    }

    $('.load-spinner').hide();
});
