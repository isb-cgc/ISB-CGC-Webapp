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
    $('#download-manifest').prop("href", $('#download-manifest').prop("href") + "?downloadToken="+downloadToken);
    $('#download-manifest').data('downloadToken',downloadToken);

    $('#download-manifest').on('click', function() {
        var self=$(this);

        self.attr('disabled','disabled');

        $('#download-in-progress').modal('show');

        base.blockResubmit(function() {
            self.removeAttr('disabled');
            $('#download-in-progress').modal('hide');
        },downloadToken, 'downloadToken');
    });

    tippy('.manifest-size-warning',{
        content: 'Your cohort is too large to be downloaded in its entirety, and will be truncated at 65,000 records ' +
        'ordered by PatientID, StudyID, SeriesID, and InstanceID.',
        theme: 'light',
        placement: 'left',
        arrow: false
    });
});