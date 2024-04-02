/**
 *
 * Copyright 2015, Institute for Systems Biology
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
        jquery: 'libs/jquery-3.7.1.min',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        underscore: 'libs/underscore-min',
        assetscore: 'libs/assets.core',
        assetsresponsive: 'libs/assets.responsive',
        d3: 'libs/d3.min',
        d3tip: 'libs/d3-tip',
        science: 'libs/science.min',
        stats: 'libs/science.stats.min',
        vizhelpers: 'helpers/vis_helpers'
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'autocomplete': ['jquery'],
        'assetscore': ['jquery', 'bootstrap', 'jqueryui'],
        'assetsresponsive': ['jquery', 'bootstrap', 'jqueryui']
    }
});

require([
    'jquery',
    'jqueryui',
    'bootstrap',
    'assetscore',
    'assetsresponsive'

], function() {
    var api_url = '';
    if (window.location.origin.indexOf('stage') != -1) {
        api_url = 'https://stage-dot-idc.appspot.com/_ah/api/feature_type_api/v1/feature_search?keyword=';
    }
    else if (window.location.origin.indexOf('cgcdemo') != -1){
        api_url = 'https://idc.appspot.com/_ah/api/feature_type_api/v1/feature_search?keyword=';
    } else {
        api_url = window.location.origin + '/_ah/api/feature_type_api/v1/feature_search?';
    }

//    $('#features').on('keydown', function() {
//        var val = $(this).val();
//        var new_api_url = api_url + val;
//
//        console.log(new_api_url);
//        $.ajax({
//            type: 'GET',
//            url: new_api_url,
//            success: function (data, status, xhr) {
//                if (data.hasOwnProperty('items')) {
//                    var list = data['items'];
//                    var features_list = [];
//                    for (var i = 0; i < list.length; i++) {
//                        features_list.push(list[i]['label']);
//                    }
//                    console.log(features_list);
//                    $('#features').autocomplete({
//                        source: features_list
//                    })
//                }
//
//            }
//        });
//    });
    $('#features').autocomplete({
        source: function (request, response) {
            console.log(request.term);
                $.ajax({
                    type: 'GET',
                    url: api_url,
                    dataType: "json",
                    cache: false,
                    data: { keyword: request.term },
                    success: function (data) {
                        if (data.hasOwnProperty('items')) {
                            response($.map(data['items'], function (item) {
                                return {
                                    label: item['label'],
                                    value: item['internal_id']
                                };
                            }));
                        }
                    }
                });
            },
            minLength: 3
    });
//    $('#features').autocomplete({
//        source: gene_list
//    });
});