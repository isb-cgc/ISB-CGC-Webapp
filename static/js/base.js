require.config({
    baseUrl: '/static/js/',
    paths: {
        jquery: 'libs/jquery-1.11.1.min',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        session_security: 'session_security',
        underscore: 'libs/underscore-min',
        assetscore: 'libs/assets.core',
        assetsresponsive: 'libs/assets.responsive',

    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'session_security': ['jquery'],
        'assetscore': ['jquery', 'bootstrap', 'jqueryui'],
        'assetsresponsive': ['jquery', 'bootstrap', 'jqueryui'],
        'underscore': {exports: '_'}
    }
});

require([
    'jquery',
    'jqueryui',
    'bootstrap',
    'session_security',
    'underscore',
    'assetscore',
    'assetsresponsive'
], function($, jqueryui, bootstrap, session_security, _) {
    'use strict';

    A11y.Core();

    // Menu toggle

    $('#subnav').on('hide.bs.collapse', function () {
        $('#body').removeClass('menu-open');
    });
    $('#subnav').on('show.bs.collapse', function(){
        $('#body').addClass('menu-open');
    });

    $('.btn').click(function(event){
       var $ripple = $('<span class="btn__ripple"></span>');
        $ripple.appendTo(this).css({
           top: (event.offsetY - 12) + 'px',
           left: (event.offsetX - 12) + 'px'
        }).on('animationend webkitAnimationEnd oanimationend MSAnimationEnd', function(e){
            $(this).remove();
        });
        //return false;
    })
    // Radio button controls bootstrap collapse
    toggleRadio('upload');
    function toggleRadio(groupname){
        var radioButton =  $('.radio input[name=' + groupname + ']');
        radioButton.on('change', function(event){
            var collapseTarget = ($(this).data('target')) ? $(this).data('target') : $(this).href;
            var collpaseHide = $(radioButton.not(this)[0]).data('target');
            if($(this).is(':checked')){
                $(collapseTarget).collapse('show');
                $(collpaseHide).collapse('hide');
            }else{
                $(collapseTarget).collapse('hide');
            }
        })
    }

    // Adapted from https://docs.djangoproject.com/en/1.9/ref/csrf/
    $.getCookie = function getCookie(name) {
        var cookieValue = null;
        if (document.cookie && document.cookie != '') {
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
                var cookie = jQuery.trim(cookies[i]);
                // Does this cookie string begin with the name we want?
                if (cookie.substring(0, name.length + 1) == (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    };

    function csrfSafeMethod(method) {
        // these HTTP methods do not require CSRF protection
        return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
    }
    $.ajaxSetup({
        beforeSend: function(xhr, settings) {
            var csrftoken = $.getCookie('csrftoken');
            if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
                xhr.setRequestHeader("X-CSRFToken", csrftoken);
            }
        }
    });

    $.createMessage = function(message, messageType) {
        var message_obj = $('<div class="row">' +
                            '<div class="col-lg-12">' +
                            '<div class="alert alert-'+messageType+' alert-dismissible">' +
                            '<button type="button" class="close" data-dismiss="alert"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>'
                            + message + '</div></div></div>');
        message_obj.prependTo('main > .container');
    };
    //function openPublicTabOnUrlHash(targetTabID){
    //     // Open public tabs based on url hash
    //    if(window.location.hash && window.location.hash.slice(1) == 'public') {
    //      // If url hash exist
    //        var target = $("a[href='" + targetTabID + "']") || $("a[data-target='" + targetTabID + "']");
    //        target.tab('show');
    //    }
    //}
    //openPublicTabOnUrlHash('#public-cohorts-list');
});