+function($){
    'use strict';
    $('#subnav').on('hide.bs.collapse', function () {
        $('#body').toggleClass('menu-open');
    });
    $('#subnav').on('show.bs.collapse', function(){
        $('#body').toggleClass('menu-open');
    });
}(jQuery)