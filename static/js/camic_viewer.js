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
    baseUrl: STATIC_FILES_URL+'js/',
    paths: {
        jquery: 'libs/jquery-1.11.1.min',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        session_security: 'session_security',
        underscore: 'libs/underscore-min',
        tokenfield: 'libs/bootstrap-tokenfield.min'
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'session_security': ['jquery'],
        'tokenfield': ['jquery', 'jqueryui']
    }
});

require([
    'jquery',
    'jqueryui',
    'bootstrap',
    'session_security',
    'tokenfield'
], function ($) {

    $('.barcode-link').on('click',function(){
        var barcode = $(this).data('value');
        $('#view-camic').attr('action',$('#view-camic').attr('action').replace(/camic\/.*/,'camic/'+barcode+'/'));
        $('#camic-iframe').attr('src',$('#camic-iframe').attr('src').replace(/=.*/,'='+barcode));
    });

    $('.barcode-link').on('click',function(){
        $('.load-spinner').show();
    });

    $('#camic-iframe').on('load',function(){
        $('.load-spinner').hide();
        // Resize the iFrame's height to center the view vertically
        if($('#camic-single').length > 0) {
            $('#camic-iframe').height(($(window).height() - $('.navbar').height() - ($('#camic-viewer').height() - $('#camic-iframe').height())));
            $(window).scrollTop(0);
        }
    });

    // Because we're operating a bit outside the Bootstrap framework on the camic-single template,
    // we need to force the loading spinner to size properly
    if($('#camic-single').length > 0) {
        $('.load-spinner').width($('#camic-iframe').css('width'));
        $('.load-spinner').height($('#camic-iframe').css('height'));
    }

    $('.load-spinner').show();
});
