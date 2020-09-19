require.config({
    baseUrl: STATIC_FILES_URL + 'js/',
    paths: {
        jquery: 'libs/jquery-3.5.1',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        underscore: 'libs/underscore-min',
        tablesorter: 'libs/jquery.tablesorter.min',
        base: 'base',
        imagesearch: 'image_search',
        cohortfilelist: 'cohort_filelist',
        tippy: 'libs/tippy-bundle.umd.min',
        //d3: 'libs/d3.v5.min',
        '@popperjs/core': 'libs/popper.min'
    },
    shim: {
        '@popperjs/core': {
          exports: "@popperjs/core"
        },
        'tippy': {
          exports: 'tippy',
            deps: ['@popperjs/core']
        },
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'assetscore': ['jquery', 'bootstrap', 'jqueryui'],
        'assetsresponsive': ['jquery', 'bootstrap', 'jqueryui'],
        'tablesorter': ['jquery'],
        'base': ['jquery'],
        //'imagesearch':['d3'],

    }
});

require([
    'jquery',
    'tippy',
    'base',
    'imagesearch',
    'jqueryui',
    'bootstrap',
    'tablesorter',
    'cohortfilelist',
], function ($, tippy, base, imagesearch, d3, cohortfilelist) {

    /*$('.filter-panel li.checkbox, #program_set').on('change', 'input', function() {
        if($('#search_def p').length > 0) {
            $('#save-cohort-btn').prop('disabled','');
            if(user_is_auth) {
                $('#save-cohort-btn').prop('title','');
            }
        } else {
            $('#save-cohort-btn').prop('disabled','disabled');
            if(user_is_auth) {
                $('#save-cohort-btn').prop('title','Please select at least one filter.');
            }
        }
    }); */

    // Resets forms in modals on cancel. Suppressed warning when leaving page with dirty forms
    $('#save-cohort-modal').on('show.bs.modal', function() {
        var filters = {};
        $('#program_set input:checked').each(function(){
            $('#selected-filters-prog-set').append('<span>'+$(this).data('filter-display-attr')+': '+$(this).data('filter-display-val')+'</span>');
            if(!filters[$(this).data('filter-attr-id')]) {
                filters[$(this).data('filter-attr-id')] = [];
            }
            filters[$(this).data('filter-attr-id')].push($(this).prop('value'));
        });
        $('#search_orig_set .search-checkbox-list input:checked').each(function(){
            $('#selected-filters-orig-set').append('<span>'+$(this).data('filter-display-attr')+': '+$(this).data('filter-display-val')+'</span>');
            if(!filters[$(this).data('filter-attr-id')]) {
                filters[$(this).data('filter-attr-id')] = [];
            }
            filters[$(this).data('filter-attr-id')].push($(this).prop('value'));
        });
        $('#search_related_set .search-checkbox-list input:checked').each(function(){
            $('#selected-filters-rel-set').append('<span>'+$(this).data('filter-display-attr')+': '+$(this).data('filter-display-val')+'</span>');
            if(!filters[$(this).data('filter-attr-id')]) {
                filters[$(this).data('filter-attr-id')] = [];
            }
            filters[$(this).data('filter-attr-id')].push($(this).prop('value'));
        });
        $('#search_derived_set .search-checkbox-list input:checked').each(function(){
            $('#selected-filters-der-set').append('<span>'+$(this).data('filter-display-attr')+': '+$(this).data('filter-display-val')+'</span>');
            if(!filters[$(this).data('filter-attr-id')]) {
                filters[$(this).data('filter-attr-id')] = [];
            }
            filters[$(this).data('filter-attr-id')].push($(this).prop('value'));
        });
        $('#save-cohort-modal .selected-filters').each(function(){
            if($(this).find('span').length <= 0) {
                $(this).hide();
            } else {
                $(this).show();
            }
        });
        $('input[name="selected-filters"]').prop('value', JSON.stringify(filters));
    });

    $('#save-cohort-modal').on('hide.bs.modal', function() {
        $('#save-cohort-modal .selected-filters span').remove();
        $('input[name="selected-filters"]').prop('value', '');
    });

    tippy('.collection_name', {
        content: function(reference) {
            let tooltip = collection_tooltips[$(reference).siblings('input.collection_value').attr('value')];
            if(tooltip) {
                return '<div class="collection-tooltip">'+tooltip+'</div>';
            }
            return '<span></span>';

        },
        theme: 'light',
        arrow: false,
        allowHTML: true,
        interactive: true
    });
});
