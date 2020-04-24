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
    baseUrl: STATIC_FILES_URL + 'js/',
    paths: {
        jquery: 'libs/jquery-1.11.1.min',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        assetscore: 'libs/assets.core',
        assetsresponsive: 'libs/assets.responsive',
        underscore: 'libs/underscore-min',
        base: 'base',
        session_security: 'session_security/script'
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'assetscore': ['jquery', 'bootstrap', 'jqueryui'],
        'assetsresponsive': ['jquery', 'bootstrap', 'jqueryui'],
        'session_security': ['jquery'],
        'base': ['jquery', 'jqueryui', 'session_security', 'bootstrap', 'underscore']
    }
});

require([
    'jquery'
    ,'base'
    ,'session_security',
    ,'jqueryui'
    ,'bootstrap'
    ,'assetscore'
    ,'assetsresponsive'
], function($) {
    A11y.Core();
    console.debug("[STATUS] Loading landing.js at "+(new Date()));
    //pause video when scrolling to other videos
    $(".carousel-control, .carousel-indicators li:not(.active)").click(function () {
        $('.tutorial-vid').each(function() {
            this.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
        });
    });
});