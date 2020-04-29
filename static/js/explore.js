require.config({
    baseUrl: STATIC_FILES_URL + 'js/',
    paths: {
        jquery: 'libs/jquery-1.11.1.min',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        underscore: 'libs/underscore-min',
        tablesorter: 'libs/jquery.tablesorter.min',
        base: 'base',
        imagesearch: 'image_search',
        cohortfilelist: 'cohort_filelist',
        plotly: 'libs/plotly-latest.min'
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'assetscore': ['jquery', 'bootstrap', 'jqueryui'],
        'assetsresponsive': ['jquery', 'bootstrap', 'jqueryui'],
        'tablesorter': ['jquery'],
        'base': ['jquery'],
        'imagesearch': ['plotly']
    }
});

require([
    'jquery',
    'base',
    'imagesearch',
    'plotly',
    'jqueryui',
    'bootstrap',
    'tablesorter',
    'cohortfilelist',
], function ($, base, imagesearch, plotly, cohortfilelist) {

    // Resets forms in modals on cancel. Suppressed warning when leaving page with dirty forms
    $('.modal').on('hide.bs.modal', function () {
        $(this).find('form')[0].reset();
    });


    // All code which doesn't need to be accessed by other modules goes here

    // Eg. event listener setup


});
// If this module needs to be invoked via RequireJS, fill this out.
//
// define(['jquery',
//     'base',
//     'imagesearch',
//     'plotly',
//     'jqueryui',
//     'bootstrap'
// ],function($, base, imagesearch, plotly){
//     // Setup and static/private variables here
//
//     return {
//          <PROP/METHOD>: <VALUE/DEFINITION>
//     }
// });