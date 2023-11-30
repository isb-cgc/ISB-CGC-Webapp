/**
 *
 * Copyright 2021, Institute for Systems Biology
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
require.config({
    baseUrl: STATIC_FILES_URL + 'js/',
    paths: {
        jquery: 'libs/jquery-3.5.1',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        underscore: 'libs/underscore-min',
        tablesorter: 'libs/jquery.tablesorter.min',
        assetscore: 'libs/assets.core',
        assetsresponsive: 'libs/assets.responsive',
        jquerydt: 'libs/jquery.dataTables.min',
        base: 'base',
        imagesearch: 'image_search',
        tippy: 'libs/tippy-bundle.umd.min',
        '@popperjs/core': 'libs/popper.min',
        session_security: 'session_security/script'
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
        'jquerydt': ['jquery'],
        'assetscore': ['jquery', 'bootstrap', 'jqueryui'],
        'assetsresponsive': ['jquery', 'bootstrap', 'jqueryui'],
        'tablesorter': ['jquery'],
        'underscore': {exports: '_'},
        'session_security': ['jquery'],
        'imagesearch': ['jquery', 'underscore', 'base', 'jquerydt', 'jqueryui', 'bootstrap']
    }
});

require([
    'jquery',
    'tippy',
    'base', // This must always be loaded
    'imagesearch',
    'jqueryui',
    'jquerydt',
    'bootstrap',
    'tablesorter'
], function ($, tippy, base) {
    var saving_cohort = false;

    $('#external-web-warning').on('show.bs.modal', function(){
        $('#collection-modal').hide();
    })

    $('#save-cohort-modal').on('show.bs.modal', function() {

        var modality_join = $('.join_val').filter(':checked').prop('value');
        var filters = {};
        $('.search-scope .search-checkbox-list input:checked , ' +
            '#search_orig_set .search-checkbox-list input:checked, ' +
            '#search_related_set .search-checkbox-list input:checked, ' +
            '#search_derived_set .search-checkbox-list input:checked').each(function(){

            if (!$(this).hasClass('hide-zeros')) {
                let modal_filter_block = '';
                 if ($(this).parents('.search-scope').length > 0) {
                    modal_filter_block = '#selected-filters-prog-set';
                } else if ($(this).parents('#search_orig_set').length > 0) {
                    modal_filter_block = '#selected-filters-orig-set';
                } else if ($(this).parents('#search_related_set').length > 0) {
                    modal_filter_block = '#selected-filters-rel-set';
                } else if ($(this).parents('#search_derived_set').length > 0) {
                    modal_filter_block = '#selected-filters-der-set';
                }

                if (!($(this).data('filter-attr-id')===1)) {
                    if ($(`${modal_filter_block} p.` + $(this).data('filter-attr-id')).length <= 0) {
                        $(`${modal_filter_block}`).append('<p class="cohort-filter-display ' + $(this).data('filter-attr-id')
                            + '"><span class="attr">' + $(this).data('filter-display-attr') + ':</span></p>');
                    }


                    if ( ($(this).data('filter-display-attr')=='Modality') && (filters[$(this).data('filter-attr-id')])  ){
                          $(`${modal_filter_block} p.` + $(this).data('filter-attr-id')).append(
                         '<span class="val">' + modality_join + '</span>'
                        );
                     }


                    $(`${modal_filter_block} p.` + $(this).data('filter-attr-id')).append(
                         '<span class="val">' + $(this).data('filter-display-val') + '</span>'
                    );
                    if (!filters[$(this).data('filter-attr-id')]) {
                        if ($(this).data('filter-display-attr')=='Modality'){
                            filters[$(this).data('filter-attr-id')] = {};
                            filters[$(this).data('filter-attr-id')]['values']=[]
                            filters[$(this).data('filter-attr-id')]['op']=modality_join
                        }
                        else {
                            filters[$(this).data('filter-attr-id')] = [];
                        }
                    }
                    if ($(this).data('filter-display-attr')=='Modality'){
                        filters[$(this).data('filter-attr-id')]['values'].push($(this).prop('value'));
                    }
                    else {
                        filters[$(this).data('filter-attr-id')].push($(this).prop('value'));
                    }

                }
            }
        });

        $('.ui-slider').each(function() {
            let modal_filter_block = '';
            if ($(this).parents('#program_set').length > 0) {
                modal_filter_block = '#selected-filters-prog-set';
            } else if ($(this).parents('#search_orig_set').length > 0) {
                modal_filter_block = '#selected-filters-orig-set';
            } else if ($(this).parents('#search_related_set').length > 0) {
                modal_filter_block = '#selected-filters-rel-set';
            } else if ($(this).parents('#search_derived_set').length > 0) {
                modal_filter_block = '#selected-filters-der-set';
            }

            var $this = $(this);
            var left_val = $this.slider("values", 0);
            var right_val = $this.slider("values", 1);
            var min = $this.slider("option", "min");
            var max = $this.slider("option", "max");

            if ($this.parent().hasClass('isActive') &&  ($this.parent().hasClass('wNone') && $this.siblings().find('.noneBut').find('input:checked').length>0) ) {
                if ($(`${modal_filter_block} p.` + $(this).data('filter-attr-id')).length <= 0) {
                    $(`${modal_filter_block}`).append('<p class="cohort-filter-display ' + $(this).data('filter-attr-id')
                        + '"><span class="attr">' + $(this).data('filter-display-attr') + ':</span></p>');
                }
                $(`${modal_filter_block} p.` + $(this).data('filter-attr-id')).append(
                    '<span class="val">None,' + left_val + " to " + right_val + '</span>'
                );
                filters[$(this).data('filter-attr-id')] = ["None",[left_val, right_val]];

            } else if ($this.parent().hasClass('isActive')) {
                if ($(`${modal_filter_block} p.` + $(this).data('filter-attr-id')).length <= 0) {
                    $(`${modal_filter_block}`).append('<p class="cohort-filter-display ' + $(this).data('filter-attr-id')
                        + '"><span class="attr">' + $(this).data('filter-display-attr') + ':</span></p>');
                }
                $(`${modal_filter_block} p.` + $(this).data('filter-attr-id')).append(
                    '<span class="val">' + left_val + " to " + right_val + '</span>'
                );
                filters[$this.data('filter-attr-id')] = [left_val, right_val];

            } else if ($this.parent().hasClass('wNone') && $this.siblings().find('.noneBut').find('input:checked').length>0){
                if ($(`${modal_filter_block} p.` + $(this).data('filter-attr-id')).length <= 0) {
                    $(`${modal_filter_block}`).append('<p class="cohort-filter-display ' + $(this).data('filter-attr-id')
                        + '"><span class="attr">' + $(this).data('filter-display-attr') + ':</span></p>');
                }
                $(`${modal_filter_block} p.` + $(this).data('filter-attr-id')).append(
                    '<span class="val">None</span>'
                );
                filters[$this.data('filter-attr-id')] = ["None"];
            }
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

    $('#save-cohort-modal').on('hide.bs.modal', function(e) {
        if(saving_cohort) {
            e.preventDefault();
            return false;
        }
        $('#save-cohort-modal .selected-filters p').remove();
        $('input[name="selected-filters"]').prop('value', '');
        $('#saving-cohort').css('display','none');
        $(this).find('input[type="submit"]').prop("disabled","");
    });

    $('#save-cohort-form, #apply-edits-form').on('submit', function(e) {

        $('#unallowed-chars-alert').hide();
        $('#name-too-long-alert-modal').hide();

        var name = $('#save-cohort-name').val() || $('#edit-cohort-name').val();
        var desc = $('#save-cohort-desc').val() || $('#edit-cohort-desc').val();

        var unallowed = (name.match(base.blacklist) || []).concat(desc ? desc.match(base.blacklist) || [] : []);

        if(unallowed.length > 0) {
            $('.unallowed-chars').text(unallowed.join(", "));
            $('#unallowed-chars-alert').show();
            e.preventDefault();
            return false;
        }

        if(name.length > 255) {
            $('#name-too-long-alert-modal').show();
            e.preventDefault();
            return false;
        }
        $(this).find('input[type="submit"]').attr("disabled","disabled");
        $('#saving-cohort').css('display','inline-block');
        saving_cohort = true;
        $('#save-cohort-modal').prop("saving", "saving");
    });

    $('#collection_modal_button').on("click", function(){
        $('#collection-modal').removeClass('in');
        $('#collection-modal').css("display","none");
    });

    tippy.delegate('table#proj_table', {
        content: function(reference) {
            let collection_id=$(reference).parent('tr').data('projectid');
            let tooltip = collection_tooltips[collection_id];
            if(tooltip) {
                return '<div class="collection-tooltip">' + tooltip + '</div>';
            }
            return '<span></span>';
        },
        theme: 'light',
        placement: 'right-end',
        arrow: false,
        allowHTML: true,
        interactive: true,
        target: 'td.collex_name',
        interactiveBorder: 10,
        maxWidth: 600,
    });

    const temp='<html><strong>now</strong></html>';

    tippy('.case-info', {
        interactive: true,
        content: 'The Case ID attribute in the portal corresponds to the DICOM Patient ID attribute'
    });

    tippy('.explainer', {
        interactive: true,
        allowHTML:true,
        content: 'As some attributes have non mutually exclusive values the charts may contain non zero counts for these values even when they are not selected in the left hand panel. See <a href="https://learn.canceridc.dev/portal/data-exploration-and-cohorts/exploring-imaging-data#understanding-counts-in-the-search-results" target="_blank" rel="noopener noreferrer">here</a> for a detailed explanation.'
    });

    tippy('.tooltip_filter_info',{
        content: 'Each chart below reports the number of cases (or patients) for all values within a given attribute, given the currently defined filter set. Once a case is selected, all series for that case, including those that do not meet the search criteria, are included. For example, cases selected based on the presence of CT modality may also contain PET modality, and thus counts for both values will appear in the chart, and the manifest.',
        theme: 'light',
        placement: 'right-end',
        arrow: false
    });

    tippy('.tooltip_chart_info',{
        content: 'Counts shown below are the number of cases (or patients) for each attribute value. Counts for each attribute (e.g. Modality) '+
            'are unchanged by the values (e.g. PET) selected (checked) for that attribute. They only change based on the values selected for all other attributes.',
        theme: 'light',
        placement: 'right-end',
        arrow: false
    });

    tippy('.checkbox-none',{
        content: 'Filtering on the \'None\' attribute is not currently supported within derived data.',
        theme: 'light',
        placement: 'top-start',
        arrow: false
    });

    tippy.delegate('.studies-table', {
        content: 'Some or all of the images in this collection are not publicly available.',
        theme: 'dark',
        placement: 'right',
        arrow: false,
        interactive:true,
        target: '.coll-explain',
        maxWidth: 130
    });

    tippy.delegate('.series-table', {
        content: function(reference) {
            if($(reference).hasClass('not-viewable')) {
                return 'No valid viewer is available for this modality.'
            }
            return 'Please open at the study level to view this series.';
        },
        theme: 'dark',
        placement: 'right',
        arrow: false,
        interactive:true,
        target: ['.no-viewer-tooltip', '.not-viewable'],
        maxWidth: 130
    });

    tippy.delegate('.studies-table', {
        content: 'This study cannot be viewed.',
        theme: 'dark',
        placement: 'right',
        arrow: false,
        interactive:true,
        target: ['.no-viewer-tooltip', '.not-viewable'],
        maxWidth: 130
    });

    tippy.delegate('.series-table', {
        content: 'Copied!',
        theme: 'blue',
        placement: 'right',
        arrow: true,
        interactive: true, // This is required for any table tooltip to show at the appropriate spot!
        target: '.copy-this-table',
        onShow(instance) {
            setTimeout(function() {
                instance.hide();
            }, 1000);
        },
        trigger: "click",
        maxWidth: 85
    });

    tippy.delegate('.studies-table', {
        content: 'Copied!',
        theme: 'blue',
        placement: 'right',
        arrow: true,
        interactive: true, // This is required for any table tooltip to show at the appropriate spot!
        target: '.copy-this-table',
        onShow(instance) {
            setTimeout(function() {
                instance.hide();
            }, 1000);
        },
        trigger: "click",
        maxWidth: 85
    });

    tippy.delegate('.series-table', {
        content: 'Some or all of the images in this collection are not publicly available.',
        theme: 'dark',
        placement: 'right',
        arrow: false,
        interactive:true,
        target: '.coll-explain',
        maxWidth: 130
    });

    tippy.delegate('.series-table', {
        content: function(reference) {
            return $(reference).data('description');
        },
        theme: 'dark',
        placement: 'right',
        arrow: false,
        target: '.description-tip',
        interactive: true, // This is required for any table tooltip to show at the appropriate spot!
        maxWidth: 800
    });

    tippy.delegate('#body', {
        content: function(reference) {
            return "Copied!";
        },
        theme: 'blue',
        placement: 'auto',
        arrow: true,
        target: '.copy-this',
        trigger: 'click',
        onShow(instance) {
            setTimeout(function() {
                instance.hide();
            }, 1000);
        },
        maxWidth: 85
    });

    $('.download-link').on('click', function(){
        $('#download-images').modal("hide");
    });
});
