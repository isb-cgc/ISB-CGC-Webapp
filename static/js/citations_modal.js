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

    var DOI_CACHE = {};

    A11y.Core();

    var downloadToken = new Date().getTime();

    $('#citations-modal').on('show.bs.modal', async function(event) {
        let button = $(event.relatedTarget);
        let dois = button.attr('data-dois').split("||");
        let cites_list = $("#citations-modal .citations-list");
        let copy_cites = $("#citations-modal .copy-this");
        cites_list.html(`
            Formatting citation(s)... <i class="fa fa-compass fa-spin"></i>
        `);
        let citations = [];
        await Promise.all(dois.map(async function(cite){
            if(!DOI_CACHE[cite]) {
                let response = await fetch(`https://doi.org/${cite}`, {
                    headers: {
                        "Accept": "text/x-bibliography; style=elsevier-vancouver-no-et-al"
                    }
                });
                if (!response.ok) {
                    citations.push(`Encountered an error requesting DOI ${cite}`);
                } else {
                    DOI_CACHE[cite] = await response.text();
                }
            }
            citations.push(DOI_CACHE[cite]);
        }));
        cites_list.html(citations.join("\n\n"));
        copy_cites.attr('content', citations.join("\n\n"));
    });

    $('#citations-modal').on('hide.bs.modal', function() {

    });

    $('#export-manifest-modal').on('hidden.bs.modal', function() {
        $(".citations-list").empty();
    });

    $('.copy-this').on('click', function(e) {
        // copy the entire set
    });

    tippy.delegate('#citations-modal', {
        content: 'Copied!',
        theme: 'blue',
        placement: 'right',
        arrow: true,
        interactive: true, // This is required for any table tooltip to show at the appropriate spot!
        target: '.copy-this',
        onShow(instance) {
            setTimeout(function() {
                instance.hide();
            }, 1000);
        },
        trigger: "click",
        maxWidth: 85
    });
});
