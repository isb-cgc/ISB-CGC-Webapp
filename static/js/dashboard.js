// require.config({
//     baseUrl: STATIC_FILES_URL + 'js/',
//     paths: {
//         jquery: 'libs/jquery-1.11.1.min',
//         bootstrap: 'libs/bootstrap.min',
//         jqueryui: 'libs/jquery-ui.min',
//         session_security: 'session_security/script',
//         underscore: 'libs/underscore-min',
//         tablesorter: 'libs/jquery.tablesorter.min',
//         base: 'base'
//     },
//     shim: {
//         'bootstrap': ['jquery'],
//         'jqueryui': ['jquery'],
//         'session_security': ['jquery'],
//         'assetscore': ['jquery', 'bootstrap', 'jqueryui'],
//         'assetsresponsive': ['jquery', 'bootstrap', 'jqueryui'],
//         'tablesorter': ['jquery'],
//         'base': ['jquery']
//     }
// });

require([
    'jquery',
    'base',
    'jqueryui',
    'bootstrap',
    'session_security',
    'tablesorter'
], function ($, base) {

    // Resets forms in modals on cancel. Suppressed warning when leaving page with dirty forms
    $('.modal').on('hide.bs.modal', function () {
        var modal_form = $(this).find('form')[0];
        if (modal_form) modal_form.reset();
    });

    $('#more-analysis').on('show.bs.collapse', function () {
        $('a[data-target="#more-analysis"]').text('Show Less');
    }).on('hide.bs.collapse', function () {
        $('a[data-target="#more-analysis"]').text('Show More');
    });

    $('#create-workbook').on('submit', function () {
        $(this).find('button[type="submit"]').attr('disabled', 'disabled');
    });

    $('.min-max a').on('click', function () {
        $(this).find('i').toggleClass('fa-angle-double-up');
        $(this).find('i').toggleClass('fa-angle-double-down');
    });

    // detect if popup are being blocked from the user browser: if so show popup blocker warning banner
    var popupsBlocked;
    var test_window = window.open('', "_blank");
    if (!test_window) {
        popupsBlocked = new Boolean(true);
    } else {
        test_window.onload = function (e) {
            setTimeout(function () {
                if (test_window.outerWidth === 0) {
                    popupsBlocked = new Boolean(true);
                } else {
                    popupsBlocked = new Boolean(false);
                }
            }, 1000);
        };
    }
    if (popupsBlocked){
        $('#popup-blocker-warning').show();
    }else{
        test_window.close();
    }

    // Ajax call to get opt_in_show value
    $.ajax({
        type: 'GET',
        url: BASE_URL + '/opt_in/check_show/',
        dataType  :'json',
        data: $(this).serialize(),
        success: function(data) {
            if (data['result'])
            {
                $('#opt-in-pop-up-modal').modal('show');
            }
        },
        error: function(data) {
        }
    });

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
});