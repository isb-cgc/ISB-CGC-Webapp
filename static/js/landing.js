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

// require.config({
//     baseUrl: STATIC_FILES_URL + 'js/',
//     paths: {
//         jquery: 'libs/jquery-1.11.1.min',
//         bootstrap: 'libs/bootstrap.min',
//         jqueryui: 'libs/jquery-ui.min',
//         assetscore: 'libs/assets.core',
//         assetsresponsive: 'libs/assets.responsive',
//         underscore: 'libs/underscore-min',
//         base: 'base',
//         session_security: 'session_security/script'
//     },
//     shim: {
//         'bootstrap': ['jquery'],
//         'jqueryui': ['jquery'],
//         'assetscore': ['jquery', 'bootstrap', 'jqueryui'],
//         'assetsresponsive': ['jquery', 'bootstrap', 'jqueryui'],
//         'session_security': ['jquery'],
//         'base': ['jquery', 'jqueryui', 'session_security', 'bootstrap', 'underscore']
//     }
// });

require([
    'jquery'
    ,'base'
    ,'session_security',
    ,'jqueryui'
    ,'bootstrap'
    ,'assetscore'
    ,'assetsresponsive'
], function($, base) {
    A11y.Core();
    console.debug("[STATUS] Loading landing.js at "+(new Date()));
    //pause video when scrolling to other videos
    $(".carousel-control, .carousel-indicators li:not(.active)").click(function () {
        $('.tutorial-vid').each(function() {
            this.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
        });
    });

    $('#opt-in-form').on('submit', function (event) {
        $('#invalid-opt-in-alert').hide();

        var form = this;
        var first_name = $(form).find("#first-name").val();
        var last_name  = $(form).find("#last-name").val();
        var email = $(form).find("#email").val();
        var affiliation  = $(form).find("#affiliation").val();
        var feedback = $(form).find("#feedback").val();

        if (first_name.match(base.blacklist)) {
            $('#invalid-opt-in-field').text("First Name");
            $('#invalid-opt-in-alert').show();
            return false;
        }

        if (last_name.match(base.blacklist)) {
            $('#invalid-opt-in-field').text("Last Name");
            $('#invalid-opt-in-alert').show();
            return false;
        }

        if (!email.match(base.email)) {
            $('#invalid-opt-in-field').text("Email");
            $('#invalid-opt-in-alert').show();
            return false;
        }

        if (affiliation.match(base.blacklist)) {
            $('#invalid-opt-in-field').text("Affiliation");
            $('#invalid-opt-in-alert').show();
            return false;
        }

        if (feedback.match(base.blacklist)) {
            $('#invalid-opt-in-field').text("Feedback");
            $('#invalid-opt-in-alert').show();
            return false;
        }

        var subscribed = $(form).find("#subscribed").find('option:selected').val();

        var form_data = {};
        form_data['first-name'] = first_name;
        form_data['last-name'] = last_name;
        form_data['email'] = email;
        form_data['affiliation'] = affiliation;
        form_data['feedback'] = feedback;
        form_data['subscribed']= subscribed;

        var url = BASE_URL + '/opt_in/form_submit';

        $.ajax({
            type: 'POST',
            url: url,
            data: form_data
        });
    });
});