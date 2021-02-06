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
//     baseUrl: STATIC_FILES_URL+'js/',
//     paths: {
//         jquery: 'libs/jquery-1.11.1.min',
//     },
//     shim: {
//     }
// });

require([
    'jquery',
], function ($) {

    var fullscreen = false;
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
            $(window).scrollTop(0);
        }
    });

    var reset_spinner_dimension = function () {
        $('.load-spinner').width(fullscreen ? '100vw' : $('.iframe-container iframe').css('width'));
        $('.load-spinner').height(fullscreen ? '100vh': $('.iframe-container iframe').css('height'));
    };

    var openFullscreen = function() {
        var iframe_container = document.querySelector('.iframe-container');
        if (iframe_container.requestFullscreen) {
            iframe_container.requestFullscreen();
        } else if (iframe_container.mozRequestFullScreen) { /* Firefox */
            iframe_container.mozRequestFullScreen();
        } else if (iframe_container.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
            iframe_container.webkitRequestFullscreen();
        } else if (iframe_container.msRequestFullscreen) { /* IE/Edge */
            iframe_container.msRequestFullscreen();
        }
    };

    var closeFullscreen = function() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) { /* Firefox */
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) { /* Chrome, Safari and Opera */
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { /* IE/Edge */
            document.msExitFullscreen();
        }
    };

    $(document).bind('webkitfullscreenchange MSFullscreenChange mozfullscreenchange fullscreenchange', function(e) {
        fullscreen = document.fullScreen || document.mozFullScreen || document.webkitIsFullScreen;
        $('.iframe-container .toggle-fullscreen i').toggleClass('fa-compress', fullscreen);
        $('.iframe-container .toggle-fullscreen i').toggleClass('fa-expand', !fullscreen);
        $('.iframe-container').toggleClass('fullscreen', fullscreen);
        reset_spinner_dimension();
    });

    $('.iframe-container .toggle-fullscreen').on('click',function() {
        fullscreen ? closeFullscreen(): openFullscreen();
    });

    // Because we're operating a bit outside the Bootstrap framework on the camic-single template,
    // we need to force the loading spinner to size properly
    if($('#camic-single').length > 0) {
        reset_spinner_dimension();
    }

    $('.load-spinner').show();
});
