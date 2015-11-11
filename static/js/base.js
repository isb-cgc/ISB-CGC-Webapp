+function($){
    'use strict';

    if($(window).scrollTop() < 10){
        $('#subnav').on('hide.bs.collapse', function () {
            $('#body').toggleClass('menu-open');
        });
        $('#subnav').on('show.bs.collapse', function(){
            $('#body').toggleClass('menu-open');
        });
    }

}(jQuery)