/**
 *
 * Copyright 2016, Institute for Systems Biology
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

/**
 * Test comment for Test Branch in
 *
 */

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
        d3: 'libs/d3.min',
        d3tip: 'libs/d3-tip',
        search_helpers: 'helpers/search_helpers',
        vis_helpers: 'helpers/vis_helpers',
        tree_graph: 'visualizations/createTreeGraph',
        stack_bar_chart: 'visualizations/createStackedBarchart',
        d3parsets: 'libs/d3.parsets',
        draw_parsets: 'parallel_sets',
        base: 'base'
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'session_security': ['jquery'],
        'assetscore': ['jquery', 'bootstrap', 'jqueryui'],
        'assetsresponsive': ['jquery', 'bootstrap', 'jqueryui']
    }
});

require([
    'jquery',
    'jqueryui',
    'bootstrap',
    'session_security',
    'd3',
    'd3tip',
    'search_helpers',
    'vis_helpers',
    'tree_graph',
    'stack_bar_chart',
    'assetscore',
    'assetsresponsive',
    'base'
], function ($, jqueryui, bootstrap, session_security, d3, d3tip, search_helpers) {

    var savingComment = false;
    var savingChanges = false;
    var SUBSEQUENT_DELAY = 600;
    var update_displays_thread = null;

    // Resets forms in modals on cancel. Suppressed warning when leaving page with dirty forms
    $('.modal').on('hide.bs.modal', function() {
        var form = $(this).find('form')[0];
        if(form){
            form.reset();
        }
    });

    var search_helper_obj = Object.create(search_helpers, {});

    var update_displays = function(withoutCheckChanges) {

        (update_displays_thread !== null) && clearTimeout(update_displays_thread);

        update_displays_thread = setTimeout(function(){
            search_helper_obj.update_counts_parsets(base_url, 'metadata_counts_platform_list', cohort_id, 'v2').then(
                function(){!withoutCheckChanges && check_changes();}
            );
        },SUBSEQUENT_DELAY);
    };

    var checkbox_callback = function() {
        var $this = $(this);

        if ($this.is(':checked')) { // Checkbox checked
            var feature = $this.closest('.cohort-feature-select-block'),
                value = $this;

            var tokenValDisplName = (value.data('value-displ-name') && value.data('value-displ-name').length > 0) ?
                value.data('value-displ-name') : (value.data('value-name') == 'None' ? 'NA' : value.data('value-name')),
                tokenFeatDisplName = /*(feature.data('feature-displ-name') && feature.data('feature-displ-name').length > 0) ?
                    feature.data('feature-displ-name') :*/ feature.data('feature-name');


            if (feature.data('feature-type') == 'datatype') { // Datatype feature
                var feature_value = value.data('value-name').split('-');

                tokenFeatDisplName = 'SAMP:' + feature_value[0];
                tokenValDisplName = feature_value[1];

                if (feature_value[1] == 'True') {
                    feature_value[1] = 1;
                } else {
                    feature_value[1] = 0;
                }

                var token = $('<span>').data({
                    'feature-id'   : 'SAMP:' + feature_value[0],
                    'feature-name' : feature_value[0],
                    'value-id'     : value.data('value-id'),
                    'value-name'   : feature_value[1]
                });

            } else {
                var token = $('<span>').data({
                    'feature-id'   : feature.data('feature-id'),
                    'feature-name' : feature.data('feature-name'),
                    'value-id'     : value.data('value-id'),
                    'value-name'   : value.data('value-name')
                });
            }

            token.append(
                $('<a>').addClass('delete-x filter-label label label-default')
                    .text(tokenFeatDisplName + ': ' + tokenValDisplName)
                    .append('<i class="fa fa-times">')
            );
            
            $this.data({
                'select-filters-item': token.clone(true),
                'create-cohort-form-item': token.clone(true)
            });
            $('.selected-filters .panel-body').append( $this.data('select-filters-item') );
            $('#create-cohort-form .form-control-static').append( $this.data('create-cohort-form-item') );
            $('a.delete-x').on('click', function() {
                var checked_box = $('div[data-feature-id="' + $(this).parent('span').data('feature-id') + '"] input[type="checkbox"][data-value-name="' + $(this).parent('span').data('value-name') + '"]');
                checked_box.prop('checked', false);
                var span_data = $(this).parent('span').data();
                $(this).parent('span').remove();

                // Remove create cohort form pill
                $('#create-cohort-form .form-control-static span').each(function() {
                    if ($(this).data('feature-id') == span_data['feature-id'] && $(this).data('value-name') == span_data['value-name']) {
                        $(this).remove();
                    }
                });

                update_displays(true);
                return false;
            });
        } else { // Checkbox unchecked
            // Remove create cohort form pill
            $('#create-cohort-form .form-control-static span').each(function() {
                if ($(this).data('feature-id') == $this.data('create-cohort-form-item').data('feature-id') && $(this).data('value-name') == $this.data('create-cohort-form-item').data('value-name')) {
                    $(this).remove();
                }
            });
            $this.data('select-filters-item').remove();
            $this.data('create-cohort-form-item').remove();

        }
        update_displays();
    };

    $('.search-checkbox-list input[type="checkbox"]').on('change', checkbox_callback);

    $('.filter-input').autocomplete({
        source: attr_list,
        select: function(event, ui) {
            $('#filter-list-div').append('<h5>'+ ui.item.label + '</h5>');
            $('#filter-list-div').append('<ul class="search-checkbox-list" id="'+ui.item.value+'"></ul>');
            for (var i = 0; i < attr_counts[ui.item.value].length; i++) {
                var checkbox_str = '<input type="checkbox" name="elements-selected" id="'
                    + ui.item.value + '-' + attr_counts[ui.item.value][i]['value'].replace(/\s+/g, '_') +'" >'
                    + '<label for="'+ui.item.value + '-' + attr_counts[ui.item.value][i]['value'].replace(/\s+/g, '_') +'">'
                    + attr_counts[ui.item.value][i]['value'] + '<span class="count">(' + attr_counts[ui.item.value][i]['count'] + ')</span>'
                    + '</label>';
                var checkbox_item = $(checkbox_str);
                checkbox_item.on('change', checkbox_callback);
                $('ul#'+ui.item.value).append('<li></li>');
                $('ul#'+ui.item.value+' li').append(checkbox_item);
                // After adding item to filters, remove from list
                attr_list.splice(attr_list.indexOf(ui.item.value), 1);
                $('.filter-input').autocomplete('option', 'source', attr_list);
            }
            $(this).val('');
            return false;
        }
    });

    $('#clear-filters').on('click', function() {
        $('.selected-filters .panel-body').empty();
        $('#filter-panel input:checked').each(function() {
            $(this).prop('checked', false);
        });
        $('#create-cohort-form .form-control-static').empty();
        update_displays();
    });

    $('#add-filter-btn').on('click', function() {
        $('#content-panel').removeClass('col-md-12').addClass('col-md-8');
        $('#filter-panel').show();
        $('.selected-filters').show();
        $('.page-header').hide();
        $('input[name="cohort-name"]').show();
        $('#default-cohort-menu').hide();
        $('#edit-cohort-menu').show();
        showHideMoreGraphButton();
        $('#multi-categorical').prop('scrollLeft',150);
    });

    $('#cancel-add-filter-btn').on('click', function() {
        $('#content-panel').removeClass('col-md-8').addClass('col-md-12');
        $('#filter-panel').hide();
        $('.selected-filters').hide();
        $('.page-header').show();
        $('input[name="cohort-name"]').hide();
        $('#default-cohort-menu').show();
        $('#edit-cohort-menu').hide();
    });

    $('#create-cohort-form, #apply-filters-form').on('submit', function(e) {

        if(savingChanges) {
            e.preventDefault();
            return false;
        }

        var form = $(this);

        $('#apply-filters-form input[type="submit"]').prop('disabled',true);
        savingChanges = true;

        $('.selected-filters .panel-body span').each(function() {
            var $this = $(this),
                value = {
                    'feature': { name: $this.data('feature-name'), id: $this.data('feature-id') },
                    'value'  : { name: $this.data('value-name')  , id: $this.data('value-id')   }
                };
            form.append($('<input>').attr({ type: 'hidden', name: 'filters', value: JSON.stringify(value)}));
        });


        if (cohort_id) {
            $('#apply-filter-cohort-name').prop('value', $('#edit-cohort-name').val());
            form.append('<input type="hidden" name="source" value="' + cohort_id + '" />');
            form.append('<input type="hidden" name="deactivate_sources" value="' + true + '" />');
        }
    });

    $('#clin-accordion').on('show.bs.collapse', function (e) {
        $(e.target).siblings('a').find('i.fa-caret-down').show();
        $(e.target).siblings('a').find('i.fa-caret-right').hide();

    });

    $('#clin-accordion').on('hide.bs.collapse', function (e) {
        $(e.target).siblings('a').find('i.fa-caret-right').show();
        $(e.target).siblings('a').find('i.fa-caret-down').hide()
    });

    $('.show-more').on('click', function() {
        $(this).siblings('li.extra-values').show();
        $(this).siblings('.show-less').show();
        $(this).hide();
    });

    $('.show-less').on('click', function() {
        $(this).siblings('li.extra-values').hide();
        $(this).siblings('.show-more').show();
        $(this).hide();
    });
    if($('.col-lg-8').length == 0){
        showHideMoreGraphButton();
    }
    // Show hide more graph button based on whether there is more tree graph
    function showHideMoreGraphButton(){
        var containerHeight = $('#cohort-details .clinical-trees .panel-body').outerHeight();
        var treeGraphActualHeight = $('#tree-graph-clinical').height();

        if(containerHeight >= treeGraphActualHeight){
            $('#more-graphs').hide();
        }else{
            $('#more-graphs').show();
        }
    }
    $('#more-graphs button').on('click', function() {
        $('#more-graphs').hide();
        $('#less-graphs').show();
        $('.clinical-trees .panel-body').animate({
            height: '430px'
        }, 800);
    });

    $('#less-graphs button').on('click', function() {
        $('#less-graphs').hide();
        $('#more-graphs').show();
        $('.clinical-trees .panel-body').animate({
            height: '210px'
        }, 800);
    });

    $('.show-flyout').on('click', function() {
        $('.comment-flyout').animate({
            right: '-1px'
        }, 800);
    });
    $('.hide-flyout').on('click', function() {
        $(this).parents('.fly-out').animate({
            right: '-300px'
        }, 800);
    });

    $('.add-comment').on('submit', function(event) {
        if(savingComment) {
            event.preventDefault();
            return false;
        }
        $('.save-comment-btn').prop('disabled', true);
        savingComment = true;
        event.preventDefault();
        var form = this;
        $.ajax({
            type: 'POST',
            url: base_url + '/cohorts/save_cohort_comment/',
            data: $(this).serialize(),
            success: function(data) {
                data = JSON.parse(data);
                $('.comment-flyout .flyout-body').append('<h5 class="comment-username">' + data['first_name'] + ' ' + data['last_name'] + '</h5>');
                $('.comment-flyout .flyout-body').append('<p class="comment-content">' + data['content'] + '</p>');
                $('.comment-flyout .flyout-body').append('<p class="comment-date">' + data['date_created'] + '</p>');
                form.reset();
                $('.save-comment-btn').prop('disabled', true);
                savingComment = false;
            },
            error: function() {
                console.error('Failed to save comment.')
                form.reset()
                savingComment = false;
            }
        });

        return false;
    });

    // Disable save changes if no change to title or no added filters
    var original_title = $('#edit-cohort-name').val();
    var save_changes_btn_modal = $('#apply-filters-form input[type="submit"]');
    var save_changes_btn = $('button[data-target="#apply-filters-modal"]');
    var check_changes = function() {
        if ($('#edit-cohort-name').val() != original_title || $('.selected-filters span').length > 0) {
            save_changes_btn.prop('disabled', false)
            save_changes_btn_modal.prop('disabled',false);
        } else {
            save_changes_btn.prop('disabled', true)
            save_changes_btn_modal.prop('disabled',true);
        }
    };


    // If this is a new cohort, set TCGA Project selected as default
    if (window.location.pathname.indexOf('new_cohort') >= 0
        || window.location.pathname.match(/cohorts\/workbook\/\d+\/worksheet\/\d+\/create/i) !== null
    ) {
        $('a[href="#collapse-Project"]').trigger('click')
        $('input[type="checkbox"][data-value-name="TCGA"]').trigger('click');
    } else {
        // If there's data passed in from the template, use it and drop it
        if(metadata_counts !== null && metadata_counts !== "") {
            search_helper_obj.update_counts_parsets_direct();
            metadata_counts = null;
        } else {
            update_displays(true);
        }
    }

    $('#shared-with-btn').on('click', function(e){
        var target = $(this).data('target');
        $(target + ' a[data-target="#shared-pane"]').tab('show');
    });

    $('#create-cohort-modal form').on('submit', function() {
        save_changes_btn.prop('disabled', 'disabled');
        save_changes_btn_modal.prop('disabled', 'disabled');
    });

    /*
        Remove shared user
     */
    $('.remove-shared-user').on('click', function() {
        var user_id = $(this).attr('data-user-id');
        var url = base_url + '/cohorts/unshare_cohort/' + cohort_id + '/';
        var csrftoken = $.getCookie('csrftoken');
        var button = $(this);
        $.ajax({
            type        :'POST',
            url         : url,
            dataType    :'json',
            data        : {owner: true, user_id: user_id},
            beforeSend  : function(xhr){xhr.setRequestHeader("X-CSRFToken", csrftoken);},
            success : function (data) {
                button.parents('tr').remove();
                var count = parseInt($($('.share-count')[0]).html());
                $('.share-count').each(function() {
                   $(this).html(count-1);
                });
            },
            error: function () {
                console.log('Failed to remove user');
            }
        })
    });

    // Disable comment button if no content
    $('.save-comment-btn').prop('disabled', true);
    $('#comment-content').keyup(function() {
        $(this).siblings('.save-comment-btn').prop('disabled', this.value == '' ? true : false)
    })

    // Disable the buttons at load because no changes have been made yet
    save_changes_btn.prop('disabled', true);
    save_changes_btn_modal.prop('disabled', true);

    $('#edit-cohort-name').keyup(function() {
        check_changes();
    })

    // Disable Duplicate Cohort button once clicked
    $('.clone-cohort-btn').on('click', function() {
        $(this).addClass('disabled');
    })

    $('li.applied-filter').each(function(index,elem){
        $(this).html($(this).text().replace(/\[/g,"<span>").replace(/\]/g,"</span>"));
    });
});

