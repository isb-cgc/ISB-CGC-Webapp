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

    $('.filter-panel li.checkbox, #program_set').on('change', 'input', function() {
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
    });

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

    var ANONYMOUS_FILTERS = {};

    var save_anonymous_filters = function()
    {
        // Collect all selected filters and save to session storage
        var filters = [];
        $('.search-checkbox-list input:checked').each(function() {
            var $this = $(this);
            var value = {
                'attr_id': $this.data('data-filter-attr-id'),
                'value_id'  : $this.data('value'),
            };
            filters.push(value);
        });

        var filterStr = JSON.stringify(filters);
        sessionStorage.setItem('anonymous_filters', filterStr);
    };

    var load_anonymous_filters = function()
    {
        // Load anonymous filters from session storage and clear it, so it is not always there
        var str = sessionStorage.getItem('anonymous_filters');
        ANONYMOUS_FILTERS = JSON.parse(str);
        sessionStorage.removeItem('anonymous_filters');
    };

    var apply_anonymous_filters = function()
    {
        // Check if anonymous filter exist, then find all checkbox and check them
        if (ANONYMOUS_FILTERS !== null && ANONYMOUS_FILTERS.length > 0) {
            for (i = 0; i < ANONYMOUS_FILTERS.length; ++i) {
                var aFilter = ANONYMOUS_FILTERS[i];

                var attr_id = aFilter.attr_id.toString();
                var value_id = aFilter.value_id.toString();

                apply_anonymous_checkbox_filter(attr_id, value_id);
            }
        }
    };

    var apply_anonymous_checkbox_filter = function(attr_id, value_id)
    {
        var checkbox = $('input[data-filter-attr-id=attr_id][value=value_id]');

        if (checkbox !== null) {
            // Set checked and trigger change to update other related data
            checkbox.prop("checked", true);
            checkbox.trigger('change', [Boolean(i !== (ANONYMOUS_FILTERS.length-1))]);
        }
    };

    load_anonymous_filters();
    apply_anonymous_filters();

    $('#log-in-to-save-btn').on('click', function()
    {
        // $.setCookie('login_from','new_cohort','/');
        save_anonymous_filters();
    });
});
