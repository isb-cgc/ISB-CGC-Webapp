/**
 *
 * Copyright 2015, Institute for Systems Biology
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

//    'parallel_sets',
//    'draw_parsets',
    'tree_graph',
    'stack_bar_chart',

    'assetscore',
    'assetsresponsive',
    'base'
], function ($, jqueryui, bootstrap, session_security, d3, d3tip, search_helpers, vis_helpers, parallel_sets, draw_parsets) {

    // Resets forms in modals on cancel. Suppressed warning when leaving page with dirty forms
    $('.modal').on('hide.bs.modal', function() {
        var form = $(this).find('form')[0];
        if(form){
            form.reset();
        }
    });

    var search_helper_obj = Object.create(search_helpers, {});

    var checkbox_callback = function() {
        var $this = $(this);

        if ($this.is(':checked')) { // Checkbox checked
            var feature = $this.closest('.cohort-feature-select-block'),
                value = $this;

            if (feature.data('feature-type') == 'datatype') { // Datatype feature
                var feature_value = value.data('value-name').split('-');
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
                    'value-name'   : value.data('value-name'),
                });
            }

            token.append(
                $('<a>').addClass('delete-x filter-label label label-default')
                    .text(feature.data('feature-name') + ': ' + value.data('value-name'))
                    .append('<i class="fa fa-times">')
            );
            
            $this.data({
                'select-filters-item': token.clone(true),
                'create-cohort-form-item': token.clone(true)
            });
            $('.selected-filters .panel-body').append( $this.data('select-filters-item') );
            $('#create-cohort-form .form-control-static').append( $this.data('create-cohort-form-item') );
            $('a.delete-x').on('click', function() {
                var search_id = $this.parent('span').attr('value');
                $('#' + search_id).prop('checked', false);
                $this.parent('span').remove();
                search_helper_obj.update_counts(base_api_url, 'metadata_counts', cohort_id, undefined, 'v2', api_token);
                search_helper_obj.update_parsets(base_api_url, 'metadata_platform_list', cohort_id);
                $('#create-cohort-form .form-control-static').find('span[value="' + search_id + '"]').remove();
                return false;
            });
        } else { // Checkbox unchecked
            $this.data('select-filters-item').remove();
            $this.data('create-cohort-form-item').remove();
        }
        search_helper_obj.update_counts(base_api_url, 'metadata_counts', cohort_id, undefined, 'v2', api_token);
        search_helper_obj.update_parsets(base_api_url, 'metadata_platform_list', cohort_id);
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
        search_helper_obj.update_counts(base_api_url, 'metadata_counts', cohort_id, undefined, 'v2', api_token);
    });

    $('#add-filter-btn').on('click', function() {
        $('#content-panel').removeClass('col-md-12').addClass('col-md-8');
        $('#filter-panel').show();
        $('.selected-filters').show();
        //$('.menu-bar a[data-target="#apply-filters-modal"]').show();
        $('#cancel-add-filter-btn').show();
        //$('.menu-bar .dropdown').hide();
        $('#default-cohort-menu').hide();
        $('#edit-cohort-menu').show();
        showHideMoreGraphButton();
    });

    $('#cancel-add-filter-btn').on('click', function() {
        $('#content-panel').removeClass('col-md-8').addClass('col-md-12');
        $('#filter-panel').hide();
        $('.selected-filters').hide();
        //$('.menu-bar a[data-target="#apply-filters-modal"]').hide();
        $('#default-cohort-menu').show();
        $('#edit-cohort-menu').hide();
        //$('.menu-bar .dropdown').show();
    });

    $('#create-cohort-form, #apply-filters-form').on('submit', function() {
        var form = $(this);

        $('.selected-filters .panel-body span').each(function() {
            var $this = $(this),
                value = {
                    'feature': { name: $this.data('feature-name'), id: $this.data('feature-id') },
                    'value'  : { name: $this.data('value-name')  , id: $this.data('value-id')   }
                };
            form.append($('<input>').attr({ type: 'hidden', name: 'filters', value: JSON.stringify(value)}));
        });

        if (cohort_id) {
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
        event.preventDefault();
        console.log(base_url + '/cohorts/save_cohort_comment/');
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
            },
            error: function() {
                console.log('Failed to save comment.')
                form.reset()
            }

        });

        return false;
    });

    search_helper_obj.update_counts(base_api_url, 'metadata_counts', cohort_id, undefined, 'v2', api_token);
    search_helper_obj.update_parsets(base_api_url, 'metadata_platform_list', cohort_id);

    $('#shared-with-btn').on('click', function(e){
        var target = $(this).data('target');

        $(target + ' a[data-target="#shared-pane"]').tab('show');
    })
});

