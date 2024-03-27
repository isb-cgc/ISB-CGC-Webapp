require.config({
    baseUrl: STATIC_FILES_URL + 'js/',
    paths: {
        jquery: 'libs/jquery-3.7.1.min',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        underscore: 'libs/underscore-min',
        tablesorter: 'libs/jquery.tablesorter.min',
        base: 'base'
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'assetscore': ['jquery', 'bootstrap', 'jqueryui'],
        'assetsresponsive': ['jquery', 'bootstrap', 'jqueryui'],
        'tablesorter': ['jquery']
    }
});

require([
    'jquery',
    'base',
    'jqueryui',
    'bootstrap',
    'tablesorter'
], function ($, base) {

    $('.min-max a').on('click', function () {
        $(this).find('i').toggleClass('fa-angle-double-up');
        $(this).find('i').toggleClass('fa-angle-double-down');
    });

    if(typeof USER_SETTINGS_KEY !== 'undefined') {
        $(window).on('beforeunload', function () {
            var settingsObj = {};
            $('.panel-collapse').each(function (index, elem) {
                settingsObj[$(elem).attr('id')] = $(elem).attr('aria-expanded');
            });
            sessionStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(settingsObj));
        });

        if (sessionStorage.getItem(USER_SETTINGS_KEY)) {
            var settingsObj = JSON.parse(sessionStorage.getItem(USER_SETTINGS_KEY));

            for (var i in settingsObj) {
                if (settingsObj.hasOwnProperty(i)) {
                    var expanded = settingsObj[i];
                    var elem = $('#' + i);
                    if (elem.attr('aria-expanded') !== expanded) {
                        elem.attr('aria-expanded', expanded);
                        elem.toggleClass('in');
                        elem.siblings('.panel-heading').find('i').toggleClass('fa-angle-double-up');
                        elem.siblings('.panel-heading').find('i').toggleClass('fa-angle-double-down');
                    }
                }
            }
        }
    }
});