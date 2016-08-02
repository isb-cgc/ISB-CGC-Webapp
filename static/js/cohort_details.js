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
        base: 'base',
        bloodhound: 'libs/bloodhound',
        typeahead : 'libs/typeahead',
        tokenfield: 'libs/bootstrap-tokenfield.min'
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'session_security': ['jquery'],
        'assetscore': ['jquery', 'bootstrap', 'jqueryui'],
        'assetsresponsive': ['jquery', 'bootstrap', 'jqueryui'],
        'tokenfield': ['jquery', 'jqueryui'],
        'typeahead':{
            deps: ['jquery'],
            init: function ($) {
                return require.s.contexts._.registry['typeahead.js'].factory( $ );
            }
        },
        'bloodhound': {
           deps: ['jquery'],
           exports: 'Bloodhound'
        }
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
    'bloodhound',
    'typeahead',
    'underscore',
    'tokenfield',
    'vis_helpers',
    'tree_graph',
    'stack_bar_chart',
    'assetscore',
    'assetsresponsive',
    'base'
], function ($, jqueryui, bootstrap, session_security, d3, d3tip, search_helpers, Bloodhound, typeahead, _) {

    var savingComment = false;
    var savingChanges = false;
    var SUBSEQUENT_DELAY = 600;
    var update_displays_thread = null;

    var geneListField = $('#paste-in-genes');
    var geneFavs = [];

    //create bloodhound typeahead engine for gene suggestions
    var gene_suggestions = new Bloodhound({
        datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        prefetch : base_url + '/genes/suggest/a.json',
        remote: {
            url: base_url + '/genes/suggest/%QUERY.json',
            wildcard: '%QUERY'
        }
    });
    gene_suggestions.initialize();
    function createTokenizer() {
        // be aware bootstrap tokenfield requires 'value' as the datem attribute field : https://github.com/sliptree/bootstrap-tokenfield/issues/189
        geneListField.tokenfield({
            typeahead : [
                {
                    hint: false
                }, {
                    source: gene_suggestions.ttAdapter(),
                    display: 'value'
                }
            ],
            delimiter : " ",
            minLength: 2-1,         // Bug #289 in bootstrap-tokenfield, submitted, remove -1 if it gets fixed and we update
            limit: 1,
            tokens: geneFavs
        }).on('tokenfield:createtoken', function (event) {
            // All gene names must in uppercase
            event.attrs.value = event.attrs.value.toUpperCase();
            event.attrs.label = event.attrs.label.toUpperCase();
        }).on('tokenfield:createdtoken', function (event) {
            // Check whether user entered a valid gene name
            validate_genes([event.attrs.value], function validCallback(result){
                if(!result[event.attrs.value]){
                    $(event.relatedTarget).addClass('invalid error');
                    $('.helper-text__invalid').show();
                }
                if ($('div.token.invalid.error').length < 1) {
                    $('.helper-text__invalid').hide();
                }
            });
            $('#paste-in-genes-tokenfield').attr('placeholder',"");
            $('#paste-in-genes-tokenfield').attr('disabled','disabled');
            $('#mutation-category').parent().parent().removeClass('disabled');

        }).on('tokenfield:removedtoken', function(event) {
            $('#paste-in-genes-tokenfield').attr('placeholder',"Enter a gene's name");
            $('#paste-in-genes-tokenfield').removeAttr('disabled');
            if ($('div.token.invalid.error').length < 1) {
                $('.helper-text__invalid').hide();
            }

            $('#spec-molecular-attrs').parent().addClass('disabled');
            $('#mutation-category').parent().parent().addClass('disabled');
            $('#mutation-category').val('label');

        }).on('tokenfield:edittoken',function(e){
            e.preventDefault();
            return false;
        });
    }
    createTokenizer();

    function validate_genes(list, cb){
        if(list.length > 0){
            var csrftoken = get_cookie('csrftoken');
            $.ajax({
                type        : 'POST',
                dataType    :'json',
                url         : base_url + '/genes/is_valid/',
                data        : JSON.stringify({'genes-list' : list}),
                beforeSend  : function(xhr){xhr.setRequestHeader("X-CSRFToken", csrftoken);},
                success : function (data) {
                    if(!data.error) {
                        cb(data.results);
                    }
                },
                error: function () {
                    console.log('Failed to check for valid genes');
                }
            });
        }
    }

    //Used for getting the CORS token for submitting data
    function get_cookie(name) {
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
    }

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

    var filter_change_callback = function() {
        var $this = $(this);

        var token = null;

        var feature = $this.closest('.cohort-feature-select-block'),
            value = $this;

        // Mutation category dropdown
        if($this.prop('id') == 'mutation-category') {
            // Remove prior filters
            $('a.mol-cat-filter-x').trigger('click',{forNewVal: true});
            $('a.mol-spec-filter-x').trigger('click');

            // Remove any previous iterations of this filter by triggering the
            // 'Selected Filters' token 'X' button
            value = $this.find('option:selected');

            if(value.val() !== 'user-specified') { // Categorized sets

                // If we've previously been in a user-selected set,
                // disable that selection set and remove all of its
                // filter tokens
                $('#spec-molecular-attrs').parent().addClass('disabled');

                // Generate the new filter token
                var gene = geneListField.tokenfield('getTokens')[0];

                var tokenValDisplName = value.data('value-displ-name'),
                    tokenFeatDisplName = feature.data('feature-displ-name');

                var token = $('<span>').data({
                    'feature-id': 'MUT:'+gene.value + ':' + feature.data('feature-id'),
                    'feature-name': feature.data('feature-name'),
                    'value-id': value.data('value-id'),
                    'value-name': value.data('value-name')
                });

                token.append(
                    $('<a>').addClass('delete-x filter-label label label-default mol-cat-filter-x')
                        .text(gene.label + ' [' + tokenFeatDisplName + ': ' + tokenValDisplName + ']')
                        .append('<i class="fa fa-times">')
                );

                $this.data({
                    'select-filters-item': token.clone(true),
                    'create-cohort-form-item': token.clone(true)
                });

                // Check the corresponding checkboxes in the specific set
                $('.mutation-checkbox').each(function(){
                    $(this).prop('checked',($(this).data('category') == value.val()));
                });

                $('.selected-filters .panel-body').append($this.data('select-filters-item'));
                $('#create-cohort-form .form-control-static').append($this.data('create-cohort-form-item'));

                $('a.mol-cat-filter-x').on('click', function (e,data) {
                    // When the 'Selected Filters' token is removed, remove this filter from other
                    // locations in which it's stored
                    var mut_cat = $('#mutation-category');
                    (!data || !data.forNewVal) &&  mut_cat.val('label');
                    $(this).parent('span').remove();

                    $('#create-cohort-form .form-control-static span').each(function () {
                        if ($(this).data('feature-id') == 'MUT:category') {
                            $(this).remove();
                        }
                    });

                    update_displays(true);
                    return false;
                });
            } else {        // User-specified
                // Enable the checkbox set
                $('#spec-molecular-attrs').parent().removeClass('disabled');

                // Any checked boxes from a category won't be in the filter set - add them now
                $('.mutation-checkbox').each(function(){
                    if ($(this).is(':checked')) {
                        $(this).triggerHandler('change');
                    }
                });
            }
        } else {

            // Checkboxes
            if ($this.is(':checked')) { // Checkbox checked

                var tokenValDisplName = (value.data('value-displ-name') && value.data('value-displ-name').length > 0) ?
                        value.data('value-displ-name') : (value.data('value-name') == 'None' ? 'NA' : value.data('value-name')),
                    tokenFeatDisplName = /*(feature.data('feature-displ-name') && feature.data('feature-displ-name').length > 0) ?
                     feature.data('feature-displ-name') :*/ feature.data('feature-name');


                if (feature.data('feature-type') == 'datatype') { // Datatype feature
                    var feature_value = value.data('value-name').split('-');

                    tokenFeatDisplName = 'SAMP:' + feature_value[0];
                    tokenValDisplName = feature_value[1];

                    switch(feature_value[1]) {
                        case 'True':
                            feature_value[1] = 1;
                            break;
                        case 'False':
                            feature_value[1] = 0;
                            break;
                        case 'None':
                            feature_value[1] = 'None';
                            break;
                    }

                    var token = $('<span>').data({
                        'feature-id': 'SAMP:' + feature_value[0],
                        'feature-name': feature_value[0],
                        'value-id': value.data('value-id'),
                        'value-name': feature_value[1]
                    });

                } else if (feature.data('feature-type') == 'donor') { // Donor feature
                    token = $('<span>').data({
                        'feature-id': feature.data('feature-id'),
                        'feature-name': feature.data('feature-name'),
                        'value-id': value.data('value-id'),
                        'value-name': value.data('value-name')
                    });
                } else { // Molecular feature
                    var gene = geneListField.tokenfield('getTokens')[0];
                    token = $('<span>').data({
                        'feature-id': 'MUT:'+gene.value + ':' + feature.data('feature-id'),
                        'feature-type': 'molecular',
                        'feature-name': feature.data('feature-name'),
                        'value-id': value.data('value-id'),
                        'value-name': value.data('value-name')
                    });

                    tokenFeatDisplName = gene.label + ' [' + feature.data('feature-displ-name');
                    tokenValDisplName += ']'
                }

                token.append(
                    $('<a>').addClass('delete-x filter-label label label-default')
                        .text(tokenFeatDisplName + ': ' + tokenValDisplName)
                        .append('<i class="fa fa-times">')
                );

                if (feature.data('feature-type') == 'molecular') {
                    token.find('a.delete-x').addClass('mol-spec-filter-x');
                }

                $this.data({
                    'select-filters-item': token.clone(true),
                    'create-cohort-form-item': token.clone(true)
                });

                $('.selected-filters .panel-body').append($this.data('select-filters-item'));
                $('#create-cohort-form .form-control-static').append($this.data('create-cohort-form-item'));

                $('a.delete-x').on('click', function () {
                    var checked_box = $('div[data-feature-id="' + $(this).parent('span').data('feature-id')
                        + '"] input[type="checkbox"][data-value-name="' + $(this).parent('span').data('value-name') + '"]');

                    if($(this).parent('span').data('feature-type') == 'molecular') {
                        checked_box = $('div[data-feature-id="' + $(this).parent('span').data('feature-id').split(":")[2]
                            + '"] input[type="checkbox"][data-value-name="' + $(this).parent('span').data('value-name') + '"]');
                    }
                    checked_box.prop('checked', false);
                    var span_data = $(this).parent('span').data();
                    $(this).parent('span').remove();

                    // Remove create cohort form pill
                    $('#create-cohort-form .form-control-static span').each(function () {
                        if ($(this).data('feature-id') == span_data['feature-id'] && $(this).data('value-name') == span_data['value-name']) {
                            $(this).remove();
                        }
                    });

                    update_displays(true);
                    return false;
                });
            } else { // Checkbox unchecked
                // Remove create cohort form pill
                $('#create-cohort-form .form-control-static span').each(function () {
                    if ($(this).data('feature-id') == $this.data('create-cohort-form-item').data('feature-id') &&
                        $(this).data('value-name') == $this.data('create-cohort-form-item').data('value-name')) {
                        $(this).remove();
                    }
                });
                $this.data('select-filters-item').remove();
                $this.data('create-cohort-form-item').remove();

            }
        }
        update_displays();
    };

    $('.search-checkbox-list input[type="checkbox"]').on('change', filter_change_callback);

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
                checkbox_item.on('change', filter_change_callback);
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
        $('#paste-in-genes').siblings('div.token').find('a.close').trigger('click');
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
        $(this).parent().siblings('li.extra-values').show();
        $('.less-checks').show();
        $('.more-checks').hide();
    });

    $('.show-less').on('click', function() {
        $(this).parent().siblings('li.extra-values').hide();
        $('.more-checks').show();
        $('.less-checks').hide();
    });

    $('.check-all').on('click',function(){
        $(this).parent().parent().siblings('.checkbox').find('input').prop('checked',true);
        $(this).parent().parent().siblings('.checkbox').find('input').triggerHandler('change');
    });

    $('.uncheck-all').on('click',function(){
        $(this).parent().parent().siblings('.checkbox').find('input').prop('checked',false);
        $(this).parent().parent().siblings('.checkbox').find('input').triggerHandler('change');
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

    // onSubmit: Add Comment
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
        $('a[href="#collapse-Project"]').trigger('click');
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
    
    // onClick: Shared With button 
    $('#shared-with-btn').on('click', function(e){
        var target = $(this).data('target');
        $(target + ' a[data-target="#shared-pane"]').tab('show');
    });

    $('#create-cohort-modal form').on('submit', function() {
        save_changes_btn.prop('disabled', 'disabled');
        save_changes_btn_modal.prop('disabled', 'disabled');
    });

    // onClick: Remove shared user
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

    // Disable the comment button if there's no content in the comment
    $('.save-comment-btn').prop('disabled', true);
    $('#comment-content').keyup(function() {
        $(this).siblings('.save-comment-btn').prop('disabled', this.value == '' ? true : false)
    })

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

    var firstSelect = true;
    $('a[href="#molecular-filters"]').on('click',function(e){
        firstSelect && $('a[href="#collapse-gene-mutation-status"]').trigger('click');
        firstSelect && $('#mutation-category').parent().parent().addClass('disabled');
        firstSelect && $('#spec-molecular-attrs').parent().addClass('disabled');
        $('#molecular-filter-alert').show();
        firstSelect = false;
    });

    var mapped_molecular_categories = {};
    molecular_attr.categories.map(function(cat){
        mapped_molecular_categories[cat.value] = cat;
    });


    $('#mutation-category').on('change',filter_change_callback);
});

