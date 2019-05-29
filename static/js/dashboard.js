require.config({
    baseUrl: STATIC_FILES_URL + 'js/',
    paths: {
        jquery: 'libs/jquery-1.11.1.min',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        session_security: 'session_security',
        underscore: 'libs/underscore-min',
        tablesorter: 'libs/jquery.tablesorter.min',
        base: 'base'
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'session_security': ['jquery'],
        'assetscore': ['jquery', 'bootstrap', 'jqueryui'],
        'assetsresponsive': ['jquery', 'bootstrap', 'jqueryui'],
        'tablesorter': ['jquery'],
        'base': ['jquery'],
    }
});

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
        $(this).find('form')[0].reset();
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


    // Solr Search
    //
    $('#nb-keyword-search-form').on('submit', function (e) {
        // console.log('submit');
        e.preventDefault();
        // var url = 'http://localhost:8983/solr/notebooks/select';
        var url = SOLR_URL + 'notebooks/select';
        var keywords = $(this).find('.nb-keyword-field').val();
        var list_max = 5;

        var count_p = $(this).parents('.panel-body').find('.nb-result-count');

        var table_list = $(this).parents('.panel-body').find('.table-list');
        $.ajax({
            'url': url,
            crossDomain: true,
            data: {'wt': 'json', 'q': keywords},
            success: function (data) {
                var num_found = data.response.numFound;
                var docs = data.response.docs;
                var html_list = "";
                for(var i = 0 ; i < docs.length && i < list_max ; i++){
                    html_list += '<li><a href=\"/notebooks/'+docs[i].id+'/public\" title=\"'+docs[i].name +
                                    '\"><div class=\"list-main\"><h5 class=\"list-title\">'+docs[i].name +
                                    '</h5><p>'+(docs[i].description)+'</p></div></a></li>'
                }
                var count_message = num_found+' result'+ (num_found > 0 ? 's' : '') +' found' +
                    (num_found > list_max ? (' Showing 5 results'):'');
                count_p.html(count_message);
                table_list.html(html_list);
            },
            dataType: 'jsonp',
            jsonp: 'json.wrf'
        });

    });

});