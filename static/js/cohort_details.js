/**
 *
 * Copyright 2017, Institute for Systems Biology
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
    baseUrl: STATIC_FILES_URL+'js/',
    paths: {
        jquery: 'libs/jquery-1.11.1.min',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        session_security: 'session_security',
        underscore: 'libs/underscore-min',
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
        tokenfield: 'libs/bootstrap-tokenfield.min',
        bq_export: 'export_to_bq',
        gcs_export: 'export_to_gcs'
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'session_security': ['jquery'],
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
        },
        'base': ['jquery', 'jqueryui', 'session_security', 'bootstrap', 'underscore']
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
    'underscore',
    'base',
    'typeahead',
    'tokenfield',
    'vis_helpers',
    'tree_graph',
    'stack_bar_chart',
    'bq_export',
    'gcs_export'
], function ($, jqueryui, bootstrap, session_security, d3, d3tip, search_helpers, Bloodhound, _, base) {

    var UPDATE_PENDING = false;

    var savingComment = false;
    var savingChanges = false;
    var mode = (cohort_id ? 'VIEWING' : 'EDITING');
    var SUBSEQUENT_DELAY = 600;
    var update_displays_thread = null;

    var original_title = $('#edit-cohort-name').val();

    //create bloodhound typeahead engine for gene suggestions
    var gene_suggestions = new Bloodhound({
        datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        prefetch : BASE_URL + '/genes/suggest/a.json',
        remote: {
            url: BASE_URL + '/genes/suggest/%QUERY.json',
            wildcard: '%QUERY'
        }
    });
    gene_suggestions.initialize();

    function createTokenizer(geneListField, geneFavs, program_selector, activeProgram) {

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
            $('#p-'+activeProgram+'-paste-in-genes-tokenfield').attr('placeholder',"");
            $('#p-'+activeProgram+'-paste-in-genes-tokenfield').attr('disabled','disabled');

            check_for_filter_build(geneListField);

        }).on('tokenfield:removedtoken', function(event) {
            $('#p-'+activeProgram+'-paste-in-genes-tokenfield').attr('placeholder',"Enter a gene's name");
            $('#p-'+activeProgram+'-paste-in-genes-tokenfield').removeAttr('disabled');
            if ($('div.token.invalid.error').length < 1) {
                $('.helper-text__invalid').hide();
            }

            $(program_selector+' .build-mol-filter').attr("disabled","disabled");

        }).on('tokenfield:edittoken',function(e){
            e.preventDefault();
            return false;
        });
    }

    function validate_genes(list, cb){
        if(list.length > 0){
            var csrftoken = get_cookie('csrftoken');
            $.ajax({
                type        : 'POST',
                dataType    :'json',
                url         : BASE_URL + '/genes/is_valid/',
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

    var UPDATE_QUEUE = [];

    function enqueueUpdate(withoutCheckChanges,for_panel_load, alternate_prog_id){
        UPDATE_QUEUE.push(function(){
            update_displays(withoutCheckChanges,for_panel_load, alternate_prog_id);
        });
    };

    function dequeueUpdate(withoutCheckChanges,for_panel_load, alternate_prog_id){
        if(UPDATE_QUEUE.length > 0) {
            UPDATE_QUEUE.shift()();
        }
    };

    var update_displays = function(withoutCheckChanges,for_panel_load, alternate_prog_id) {
        // If a user has clicked more filters while an update was going out, queue up a future update and return
        if(UPDATE_PENDING) {
            // Because our updates don't pull the filter set until they run, one will suffice for all changes made
            // while the current update was running; don't queue more than that
            if(UPDATE_QUEUE.length <= 0) {
                enqueueUpdate(withoutCheckChanges, for_panel_load, alternate_prog_id);
            }
            return;
        }

        var prog_id = (alternate_prog_id === null || alternate_prog_id === undefined) ? $('ul.nav-tabs-data li.active a').data('program-id') : alternate_prog_id;
        (update_displays_thread !== null) && clearTimeout(update_displays_thread);

        update_displays_thread = setTimeout(function(){
            UPDATE_PENDING = true;
            search_helper_obj.update_counts_parsets(BASE_URL, 'metadata_counts_platform_list', cohort_id, 'v2', prog_id, for_panel_load).then(
                function(){
                    !withoutCheckChanges && check_for_changes();
                    UPDATE_PENDING = false;
                    dequeueUpdate();
                }
            );
        },SUBSEQUENT_DELAY);
    };

    var check_for_filter_build = function(element) {
        if((element.parents('.list').find('.mutation-category-selector').val() === 'nonsilent'
            || element.parents('.list').find('.mutation-category-selector').val() === 'any'
            || (element.parents('.list').find('.mutation-category-selector').val() === 'indv-selex'
            && element.parents('.list').find('.spec-molecular-attrs input').find(':checked').length > 0))
            && element.parents('.list').find('.sel-gene .token-label').length > 0) {

            element.parents('.list').find('.build-mol-filter').removeAttr('disabled');
        }
    };

    // Loads a molecular filter into the builder for editing
    $('.tab-content').on('click', '.mol-filter', function(){


    });

    $('.tab-content').on('change', '.mutation-build', function(e){
        $(this).siblings().find('.bq-table-display').text($(this).find(':selected').data('bq-table'));
        $(this).siblings().find('.bq-table-display').attr('title',$(this).find(':selected').data('bq-table'));
    });

    // Clears the current filter build (note this does NOT clear the filter
    // from the Selected Filters, it's just to undue any pending settings)
    $('.tab-content').on('click', '.clear-mol-filter', function(){
        $(this).siblings('.build-mol-filter').attr('disabled','disabled');
        $(this).parents('.list').find('.mutation-build').val('HG19');
        $(this).parents('.list').find('.sel-gene a.close').click();
        $(this).parents('.list').find('.mutation-category-selector').val("label");
        $(this).parents('.list').find('.spec-molecular-attrs input').prop("checked",false);
        $(this).parents('.list').find('.spec-molecular-attrs ul').hide();
    });

    $('.tab-content').on('change', '.mutation-category-selector', function(){
        if($(this).find(':selected').val() == 'indv-selex') {
            $(this).parents('.list').find('.spec-molecular-attrs ul').show();
        } else {
            $(this).parents('.list').find('.spec-molecular-attrs ul').hide();
        }
        check_for_filter_build($(this));
    });

    $('.tab-content').on('click', '.build-mol-filter', function(){
        // If this was actually a mutation-build change, use the mutation-category handler code
        if($this.hasClass('mutation-build')) {
            // Do nothing if a gene and/or category hasn't been selected
            if($('#'+activeDataTab+' .paste-in-genes').tokenfield('getTokens').length <= 0 ||
                $this.parents('.gene-mutation-status').find('select.mutation-category-selector :selected').val() == 'label') {
                return;
            }
            $this = $this.parents('.gene-mutation-status').find('select.mutation-category-selector');
        }



        if(createFormFilterSet.length <= 0) {
            $('#selected-filters').append('<p id="'+activeDataTab+'-filters"></p>');
            createFormFilterSet = $('p#'+activeDataTab+'-filters')
            createFormFilterSet.append('<h5>'+(prog.data('prog-displ-name'))+'</h5>');
        } else {
            createFormFilterSet.show();
        }

        var tokenProgDisplName = prog.data('prog-displ-name'),
            tokenProgId = prog.data('prog-id');

        if($this.prop('id').indexOf('mutation-category') > 0) {
            var build = $('#p-' + tokenProgId + '-mutation-build :selected').val();

            // Remove prior filters
            $('a.mol-cat-filter-x').trigger('click', {forNewVal: true});
            $('a.mol-spec-filter-x').trigger('click');

            value = $this.find('option:selected');

            if (value.val() !== 'indv-selex') { // Categorized sets

                // If we've previously been in a user-selected set,
                // disable that selection set and remove all of its
                // filter tokens
                $('#' + activeDataTab + ' .spec-molecular-attrs .search-checkbox-list').addClass('disabled');
                $('#' + activeDataTab + ' .spec-mol-attr-heading-note').show();

                // Generate the new filter token
                var gene = $('#' + activeDataTab + ' .paste-in-genes').tokenfield('getTokens')[0];

                var tokenValDisplName = value.data('value-displ-name'),
                    tokenFeatDisplName = feature.data('feature-displ-name');

                var feature_id = 'MUT:' + build + ':' + gene.value + ':' + feature.data('feature-id');

                var token = $('<span>').data({
                    'feature-id': feature_id,
                    'feature-name': feature.data('feature-name'),
                    'prog-id': tokenProgId,
                    'prog-name': tokenProgDisplName,
                    'build': build,
                    'value-id': value.data('value-id'),
                    'value-name': value.data('value-name')
                }).attr('data-feature-id', feature_id).attr('data-value-id', value.data('value-id')).addClass(activeDataTab + '-token');

                token.append(
                    $('<a>').addClass('delete-x filter-label label label-default mol-cat-filter-x')
                        .text(gene.label + ' [' + build + ', ' + tokenFeatDisplName + ': ' + tokenValDisplName + ']')
                        .append('<i class="fa fa-times">')
                        .attr("title", gene.label + ' [' + build + ', ' + tokenFeatDisplName + ': ' + tokenValDisplName + ']')
                );

                $this.data({
                    'select-filters-item': token.clone(true),
                    'create-cohort-form-item': token.clone(true)
                });

                // Check the corresponding checkboxes in the specific set
                $('#' + activeDataTab + ' .mutation-checkbox').each(function () {
                    $(this).prop('checked', ($(this).data('category') == value.val()));
                });

                $(selFilterPanel + ' .panel-body').append($this.data('select-filters-item'));
                createFormFilterSet.append($this.data('create-cohort-form-item'));
            } else {        // indv-selex
                // Enable the checkbox set
                $('#' + activeDataTab + ' .spec-molecular-attrs .search-checkbox-list').removeClass('disabled');
                $('#' + activeDataTab + ' .spec-mol-attr-heading-note').hide();

                // Any checked boxes from a category won't be in the filter set - add them now
                $('#' + activeDataTab + ' .mutation-checkbox').each(function () {
                    if ($(this).is(':checked')) {
                        $(this).triggerHandler('change');
                    }
                });
            }

            var gene = $('#' + activeDataTab + ' .paste-in-genes').tokenfield('getTokens')[0];
            var build = $('#p-' + tokenProgId + '-mutation-build :selected').val();
            feature_id = 'MUT:' + build + ':' + gene.value + ':' + feature.data('feature-id');

            if ($('.inversion-checkbox').is(':checked')) {
                feature_id += ':NOT';
            }

            token = $('<span>').data({
                'feature-id': feature_id,
                'feature-type': 'molecular',
                'feature-name': feature.data('feature-name'),
                'value-id': value_id,
                'value-name': value.data('value-name'),
                'class': '',
                'build': build,
                'prog-id': tokenProgId,
                'prog-name': tokenProgDisplName
            }).attr('data-feature-id', feature_id).attr('data-value-id', value_id).addClass(activeDataTab + '-token');

            tokenFeatDisplName = gene.label + ' [' + build + ', ' + feature.data('feature-displ-name');
            tokenValDisplName += ']'
        }
    });


    var filter_change_callback = function(e,data) {

        var activeDataTab = $('.data-tab.active').attr('id');
        var selFilterPanel = '.'+activeDataTab+ '-selected-filters';
        var createFormFilterSet = $('p#'+activeDataTab+'-filters');

        var $this = $(this);

        var token = null;

        var feature = $this.closest('.cohort-feature-select-block'),
            prog = $this.closest('.filter-panel'),
            value = $this;

        // If a specific mutation checkbox was checked, check to see if we need to switch
        // into indv-selex mode
        if(feature.data('feature-type') == 'molecular' && $('#'+activeDataTab+' .mutation-category-selector').val() !== 'indv-selex') {
            $('a.mol-cat-filter-x').trigger('click');
            $('#'+activeDataTab+' .mutation-category-selector').val('indv-selex');
            // Any checked boxes from a category won't be in the filter set - add them now
            $('#'+activeDataTab+' .mutation-checkbox').each(function(){
                if(value.data('value-id') !== $(this).data('value-id') && $(this).is(':checked')) {
                    $(this).triggerHandler('change');
                }
            });
        }

        if ($this.is(':checked')) { // Checkbox checked
            var tokenValDisplName = (value.data('value-displ-name') && value.data('value-displ-name').length > 0) ?
                    value.data('value-displ-name') : (value.data('value-name') == 'None' ? 'NA' : value.data('value-name')),
                tokenFeatDisplName = (feature.data('feature-displ-name') && feature.data('feature-displ-name').length > 0) ?
                 feature.data('feature-displ-name') : feature.data('feature-name');

            var tokenUserProgId = null;

            if(tokenProgId <= 0){
                tokenUserProgId = value.data('user-program-id');
            }

            var feature_id = feature.data('feature-id'), value_id =  value.data('value-id');

            if (feature.data('feature-type') == 'datatype') { // Datatype filter

                var token = $('<span>').data({
                    'feature-id': 'data_type',
                    'feature-name': 'data_type',
                    'value-id': value_id,
                    'value-name': value.data('value-name'),
                    'prog-id': tokenProgId,
                    'prog-name': tokenProgDisplName,
                }).attr('data-feature-id',feature_id).attr('data-value-id',value_id).addClass(activeDataTab+'-token');

            } else if (feature.data('feature-type') == 'donor') { // Case filter
                token = $('<span>').data({
                    'feature-id': feature_id,
                    'feature-name': feature.data('feature-name'),
                    'value-id': value_id,
                    'value-name': value.data('value-name'),
                    'prog-id': tokenProgId,
                    'prog-name': tokenProgDisplName
                }).attr('data-feature-id',feature_id).attr('data-value-id',value_id).addClass(activeDataTab+'-token');

            } else if (feature.data('feature-type') == 'user-data') { // User data filter
                token = $('<span>').data({
                    'feature-id': feature_id,
                    'feature-name': feature.data('feature-name'),
                    'value-id': value_id,
                    'value-name': value.data('value-name'),
                    'prog-id': tokenProgId,
                    'prog-name': tokenProgDisplName,
                    'user-program-id': tokenUserProgId,
                }).attr('data-feature-id',feature_id).attr('data-value-id',value_id).addClass(activeDataTab+'-token');
            }

            // Don't re-add the token and filter if it already exists
            if($(selFilterPanel+' .panel-body span[data-feature-id="'+feature_id+'"][data-value-id="'+value_id+'"]').length <= 0) {
                token.append(
                    $('<a>').addClass('delete-x filter-label label label-default')
                        .text(tokenFeatDisplName + ': ' + tokenValDisplName)
                        .append('<i class="fa fa-times">')
                        .attr("title",tokenFeatDisplName + ': ' + tokenValDisplName)
                );

                if (feature.data('feature-type') == 'molecular') {
                    token.find('a.delete-x').addClass('mol-spec-filter-x');
                }

                $this.data({
                    'select-filters-item': token.clone(true),
                    'create-cohort-form-item': token.clone(true)
                });


                $(selFilterPanel+' .panel-body').append($this.data('select-filters-item'));
                createFormFilterSet.append($this.data('create-cohort-form-item'));

            }
        } else { // Checkbox unchecked
            // Remove create cohort form pill if it exists
            if($this.data('create-cohort-form-item')) {
                createFormFilterSet.find('span').each(function () {
                    if ($(this).data('feature-id') == $this.data('create-cohort-form-item').data('feature-id') &&
                        $(this).data('value-name') == $this.data('create-cohort-form-item').data('value-name')) {
                        $(this).remove();
                    }
                });
                $this.data('select-filters-item').remove();
                $this.data('create-cohort-form-item').remove();
            }
        }

        if(!data || !data.without_update) {
            update_displays();
        }

        if(!cohort_id && $('.selected-filters .panel-body span').length > 0) {
            $('#at-least-one-filter-alert-modal').hide();
            $('#at-least-one-filter-alert').hide();
            $('#create-cohort-modal input[type="submit"]').removeAttr('disabled');
        }
    };

    $('.clear-filters').on('click', function() {
        var activeDataTab = $('.data-tab.active').attr('id');
        var filterType = $(this).attr('id').split('-clear-filters')[0];
        $(this).parents('.selected-filters').find('.panel-body').empty();
        $(this).parents('.data-tab').find('.filter-panel input:checked').each(function() {
            $(this).prop('checked', false);
        });
        if(filterType === 'isb-cgc-data') {
            $('#paste-in-genes').siblings('div.token').find('a.close').trigger('click');
        }

        $('p#'+activeDataTab+'-filters span.'+filterType+'-token').remove();
        update_displays();
    });

    $('button[data-target="#apply-edits-modal"]').on('click',function(e){
        // Clear previous 'bad name' alerts
        $('#unallowed-chars-alert').hide();
    });


    $('button[data-target="#create-cohort-modal"]').on('click',function(e){

        // Clear previous alerts
        $('#unallowed-chars-alert').hide();
        $('#at-least-one-filter-alert').hide();

        // There must be at least one filter for one program if this is a
        // new cohort
        if(!cohort_id && $('.selected-filters .panel-body span').length <= 0) {
            $('#at-least-one-filter-alert').show();
            e.preventDefault();
            return false;
        }

        var activeDataTab = $('.data-tab.active').attr('id');
        var progCount = 0;
        $('.selected-filters .panel-body').each(function(){
            if($(this).find('span').length > 0) {
                progCount++;
            }
        });
        (progCount > 1) ? $('#multi-prog-cohort-create-warn').show() : $('#multi-prog-cohort-create-warn').hide();
    });

    var set_mode = function(from_click) {

        switch(mode){
            case 'EDITING':
                $('.data-tab-content-panel:not(.spinner-panel)').removeClass('col-md-12').addClass('col-md-9');
                $('.filter-panel').show();
                $('.selected-filters').show();
                cohort_id && $('.page-header').hide();
                $('input[name="cohort-name"]').show();
                $('#default-cohort-menu').hide();
                $('#edit-cohort-menu').show();
                if(from_click) {
                    //showHideMoreGraphButton();
                    $('#multi-categorical').prop('scrollLeft',150);
                }
                break;

            case 'VIEWING':
                $('.data-tab-content-panel').removeClass('col-md-9').addClass('col-md-12');
                $('.filter-panel').hide();
                $('.selected-filters').hide();
                $('.page-header').show();
                $('input[name="cohort-name"]').hide();
                $('#default-cohort-menu').show();
                $('#edit-cohort-menu').hide();
                break;
        }
    };

    // cohort_details: show and hide the filter panel for editing an extant cohort
    $('#edit-cohort-btn').on('click', function() {
        mode = "EDITING";
        $('#cohort-mode').val('EDIT');
        set_mode(true);
    });

    $('#cancel-edit-cohort-btn').on('click', function() {
        mode = "VIEWING";
        $('#edit-cohort-name').val() !== original_title && $('#edit-cohort-name').val(original_title);
        $('#cohort-mode').val('VIEW');
        $('.selected-filters .delete-x').trigger('click');
        set_mode(true);
    });

    $('#create-cohort-form, #apply-edits-form').on('submit', function(e) {

        $('#unallowed-chars-alert').hide();

        if(savingChanges) {
            e.preventDefault();
            return false;
        }

        if(!cohort_id || (original_title !== $('#edit-cohort-name').val())) {
            var name = $('#create-cohort-name').val() || $('#edit-cohort-name').val();

            var unallowed = name.match(base.blacklist);

            if(unallowed) {
                $('.unallowed-chars').text(unallowed.join(", "));
                $('#unallowed-chars-alert').show();
                e.preventDefault();
                return false;
            }
        }

        var form = $(this);

        $(this).find('input[type="submit"]').attr("disabled","disabled");
        savingChanges = true;

        if($('.selected-filters .panel-body span').length > 0) {
            form.append('<input type="hidden" name="apply-filters" value="true" />');
        }

        if(cohort_id && original_title !== $('#edit-cohort-name').val()) {
            form.append('<input type="hidden" name="apply-name" value="true" />');
        }

        $('.selected-filters .panel-body span').each(function() {
            var $this = $(this);
            var value = {
                'feature': { name: $this.data('feature-name'), id: $this.data('feature-id') },
                'value'  : { name: $this.data('value-name')  , id: $this.data('value-id')   },
                'program': { name: $this.data('prog-name')   , id: $this.data('prog-id')    }
            };
            if($this.data('user-program-id')) {
                value['user_program'] = $this.data('user-program-id');
            }
            form.append($('<input>').attr({ type: 'hidden', name: 'filters', value: JSON.stringify(value)}));
        });

        if(cohort_id) {
            $('#apply-edit-cohort-name').prop('value', $('#edit-cohort-name').val());
            form.append('<input type="hidden" name="source" value="' + cohort_id + '" />');
        }

        $('#saving-cohort').css('display','inline-block');
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
        event.preventDefault();
        $('#unallowed-chars-alert-comment').hide();

        if(savingComment) {
            return false;
        }

        var unallowed_chars = $('#comment-content').val().match(base.blacklist);

        if(unallowed_chars) {
            $('#unallowed-chars-comment').text(unallowed_chars.join(", "));
            $('#unallowed-chars-alert-comment').show();
            return false;
        }

        $('.save-comment-btn').prop('disabled', true);
        savingComment = true;
        event.preventDefault();
        var form = this;
        $.ajax({
            type: 'POST',
            url: BASE_URL + '/cohorts/save_cohort_comment/',
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
    var save_changes_btn_modal = $('#apply-edits-form input[type="submit"]');
    var save_changes_btn = $('button[data-target="#apply-filters-modal"]');
    var check_for_changes = function() {
        if ($('#edit-cohort-name').val() !== original_title || $('.selected-filters span').length > 0) {
            save_changes_btn.prop('disabled', false)
            save_changes_btn_modal.prop('disabled',false);
        } else {
            save_changes_btn.prop('disabled', true)
            save_changes_btn_modal.prop('disabled',true);
        }
    };

    // Generic form submission used by default
    $('.ajax-form-modal').find('form').on('submit', function (e) {
        $this.find('.btn').addClass('btn-disabled').attr('disabled', true);
    });

    $('#create-cohort-modal form').on('submit', function() {
        save_changes_btn.prop('disabled', 'disabled');
        save_changes_btn_modal.prop('disabled', 'disabled');
    });

    $('a[data-target="#share-cohort-modal"]').on('click',function(){
        $('#share-cohort-modal a[data-target="#shared-pane"]').tab('show');
    });

    $('button[data-target="#share-cohort-modal"]').on('click',function(){
        $('#share-cohort-modal a[data-target="#share-cohort-pane"]').tab('show');
    });

    // Share with user click
    $('#share-cohort-form').on('submit', function(e){
        e.preventDefault();
        e.stopPropagation();

        var invalid_emails = [];

        var $this=$(this);

        var escaped_email_input = $("<div>").text($('#share-share_users').val()).html();
        var emails = escaped_email_input.split(/\s*,\s*/);
        for(var i=0; i < emails.length; i++) {
            if(!emails[i].match(base.email)) {
                invalid_emails.push(emails[i]);
            }
        }
        if(invalid_emails.length > 0) {
            var msg = "The following email addresses appear to be invalid: "+(invalid_emails.join("; "));
            base.showJsMessage('danger',
                msg,
                true,'#share-cohort-js-messages');
            return false;
        } else {
            $('#share-cohort-js-messages').empty();
        }

        var cohort_id = $(this).data('cohort-id');

        var url = base_url + '/cohorts/share_cohort/' + cohort_id + "/";

        $(this).find('.btn-primary').addClass('btn-disabled').attr('disabled', true);

        var csrftoken = $.getCookie('csrftoken');
        $.ajax({
            type        :'POST',
            url         : url,
            dataType    :'json',
            data        : $(this).serialize(),
            beforeSend  : function(xhr){xhr.setRequestHeader("X-CSRFToken", csrftoken);},
            success : function (data) {
                if(data.status && data.status == 'error') {
                    if(data.result && data.result.msg) {
                        base.showJsMessage('error',data.result.msg,true,'#share-cohort-js-messages');
                    }
                } else if(data.status && data.status == 'success') {
                    if(data.result) {
                        var msgs = [];
                        if(data.result.msg) {
                            msgs.push(data.result.msg);
                        }
                        if(data.result.note) {
                            msgs.push(data.result.note)
                        }
                        base.setReloadMsg('info',msgs);
                    }
                    $this.closest('.modal').modal('hide');
                    if($this.data('redirect')) {
                        window.location = $this.data('redirect');
                    } else {
                        window.location.reload();
                    }
                }
            },
            error: function (xhr) {
                $this.closest('.modal').modal('hide');
                base.showJsMessage('error',xhr.responseJSON.message,true);
            },
        }).always(function () {
            $this.find('.btn-primary').removeClass('btn-disabled').attr('disabled', false);
        });
        // We don't want this form submission to automatically trigger a reload
        return false;
    });

    // Any time the share workbook modal is closed, clear out the messages and re-enable the buttons
    $('#share-cohort-modal button.btn-cancel,#share-cohort-modal button.close').on('click',function(){
        $('#share-cohort-js-messages').empty();
        $(this).parents('#share-cohort-modal').find('.btn-primary').removeClass('btn-disabled').attr('disabled', false);
    });

    // Remove shared user
    $('.remove-shared-user').on('click', function() {
        var user_id = $(this).attr('data-user-id');
        var url = base_url + '/cohorts/unshare_cohort/' + cohort_id + '/';
        var csrftoken = $.getCookie('csrftoken');
        var button = $(this);
        $.ajax({
            type        :'POST',
            url         : url,
            dataType    :'json',
            data        : {user_id: user_id},
            beforeSend  : function(xhr){xhr.setRequestHeader("X-CSRFToken", csrftoken);},
            success : function (data) {
                button.parents('tr').remove();
                // If that was the last user this cohort was shared with, update the table's display
                if(button.parents('tbody tr').length <= 0) {
                    $('#shared-pane .modal-body table').empty();
                    $('#shared-pane .modal-body table').append('<p class="center">This cohort is not currently shared with any users.</p>')
                }
                var count = parseInt($($('.share-count')[0]).html());
                $('.share-count').each(function() {
                   $(this).html(count-1);
                });
            },
            error: function (xhr) {
                var responseJSON = $.parseJSON(xhr.responseText);
                base.showJsMessage(responseJSON.level || 'error',responseJSON.msg || responseJSON.message,true);
            }
        })
    });

    // Disable the comment button if there's no content in the comment
    $('.save-comment-btn').prop('disabled', true);
    $('#comment-content').keyup(function() {
        $(this).siblings('.save-comment-btn').prop('disabled', this.value == '' ? true : false)
    });

    save_changes_btn.prop('disabled', true);
    save_changes_btn_modal.prop('disabled', true);

    $('#edit-cohort-name').keyup(function() {
        check_for_changes();
    });

    // Disable Duplicate Cohort button once clicked
    $('.clone-cohort-btn').on('click', function() {
        $(this).addClass('disabled');
    });

    $('li.applied-filter').each(function(index,elem){
        $(this).html($(this).text().replace(/\[/g,"<span>").replace(/\]/g,"</span>"));
    });


    var bind_widgets = function(program_data_selector,activeDataTab) {

        $(program_data_selector + ' .search-checkbox-list input[type="checkbox"]').on('change', filter_change_callback);

        $(program_data_selector + ' .clear-filters').on('click', function() {
            var filterType = $(this).attr('id').split('-clear-filters')[0];
            $(this).parents('.selected-filters').find('.panel-body').empty();
            $(this).parents('.data-tab').find('.filter-panel input:checked').each(function() {
                $(this).prop('checked', false);
            });
            if(filterType === 'isb-cgc-data') {
                $('#paste-in-genes').siblings('div.token').find('a.close').trigger('click');
            }

            $('#create-cohort-form .form-control-static span.'+filterType+'-token').remove();

            update_displays();
        });

        // Show more/less links on categories with >6 fiilters
        $(program_data_selector + ' .show-more').on('click', function() {
            $(this).parent().siblings('li.extra-values').show();
            $(this).parent().siblings('.less-checks').show();
            $(this).parent().hide();
        });
        $(program_data_selector + ' .show-less').on('click', function() {
            $(this).parent().siblings('li.extra-values').hide();
            $(this).parent().siblings('.more-checks').show();
            $(this).parent().hide();
        });

        // Click events for 'Check All/Uncheck All' in filter categories
        $(program_data_selector + ' .check-all').on('click',function(){
            $(this).parent().parent().siblings('.checkbox').find('input').prop('checked',true);
            $(this).parent().parent().siblings('.checkbox').find('input').each(function(){
                $(this).triggerHandler('change');
            });
        });
        $(program_data_selector + ' .uncheck-all').on('click',function(){
            $(this).parent().parent().siblings('.checkbox').find('input').prop('checked',false);
            $(this).parent().parent().siblings('.checkbox').find('input').each(function(){
                $(this).triggerHandler('change');
            });
        });

        $('.more-filters button').on('click', function() {
            $('.more-filters').hide();
            $('.less-filters').show();
            var max_height = 0;
            $('.prog-filter-set').each(function(){
                var this_div = $(this);
                if(this_div.outerHeight() > max_height) {
                    max_height = this_div.outerHeight();
                }
            });

            $('.curr-filter-panel').animate({
                height: (max_height+15)+'px'
            }, 800);
        });
        $('.less-filters button').on('click', function() {
            $('.less-filters').hide();
            $('.more-filters').show();
            $('.curr-filter-panel').animate({
                height: '95px'
            }, 800);
        });

        $('.more-details button').on('click', function() {
            $('.more-details').hide();
            $('.less-details').show();

            var max_height = 0;
            $('.creation-prog-filter-set').each(function(){
                var this_div = $(this);
                if(this_div.outerHeight() > max_height) {
                    max_height = this_div.outerHeight();
                }
            });
            $('.details-panel').animate({
                height: ($('.cohort-info').outerHeight() + max_height+$('ul.rev-history').outerHeight()+15)+'px'
            }, 800);
        });
        $('.less-details button').on('click', function() {
            $('.less-details').hide();
            $('.more-details').show();
            $('.details-panel').animate({
                height: '110px'
            }, 800);
        });


        $(program_data_selector + ' .more-graphs button').on('click', function() {
            $('.more-graphs').hide();
            $('.less-graphs').show();
            $('.clinical-trees .panel-body').animate({
                height: '430px'
            }, 800);
        });
        $(program_data_selector + ' .less-graphs button').on('click', function() {
            $('.less-graphs').hide();
            $('.more-graphs').show();
            $('.clinical-trees .panel-body').animate({
                height: '210px'
            }, 800);
        });
        
        var firstSelect = true;
        $(program_data_selector + ' a.molecular-filters').on('click',function(e){
            firstSelect && $(program_data_selector + ' a.collapse-gene-mutation-status').trigger('click');
            $(program_data_selector + ' .molecular-filter-alert').show();
            firstSelect = false;
        });

        createTokenizer($(program_data_selector+' .paste-in-genes'), [], program_data_selector, activeDataTab);

    };

    // Event handlers for the 'x' of the case and data type filter tokens
    $('.tab-content, #selected-filters').on('click', 'a.mol-cat-filter-x', function (e,data) {
        var activeDataTab = $(this).parents('span').data('prog-id')+'-data';
        var selFilterPanel = '.'+activeDataTab+ '-selected-filters';
        var createFormFilterSet = $('p#'+activeDataTab+'-filters');

        // When the 'Selected Filters' token is removed, remove this filter from other
        // locations in which it's stored
        var mut_cat = $('#'+activeDataTab+' .mutation-category-selector');
        (!data || !data.forNewVal) &&  mut_cat.val('label');
        $(this).parent('span').remove();

        $(selFilterPanel+' .panel-body').find('span[data-feature-id="'+$(this).parent('span').data('feature-id')+'"]').remove();
        createFormFilterSet.find('span[data-feature-id="'+$(this).parent('span').data('feature-id')+'"]').remove();

        if(!cohort_id && $('.selected-filters .panel-body span').length <= 0) {
            $('#at-least-one-filter-alert-modal').show();
            $('#create-cohort-modal input[type="submit"]').attr('disabled','disabled');
        }

        // If this has emptied out a program's filter set, hide the modal's subsection for that program
        // if a new value isn't replacing it
        if(createFormFilterSet.find('span').length <= 0 && (!data || !data.forNewVal)) {
            createFormFilterSet.hide();
        }

        // If we're down to 1 program in the filter set, the multiprogram warning is no longer needed
        var progCount = 0;
        $('.selected-filters .panel-body').each(function(){
            if($(this).find('span').length > 0) {
                progCount++;
            }
        });
        (progCount > 1) ? $('#multi-prog-cohort-create-warn').show() : $('#multi-prog-cohort-create-warn').hide();

        (!data || !data.without_update) && update_displays(true,false,$(this).parent('span').data('prog-id'));
        return false;
    });

    // Handler for the 'x' of the mutation filter tokens
    $('.tab-content, #selected-filters').on('click', 'a.delete-x', function(e,data) {
        var activeDataTab = $(this).parents('span').data('prog-id')+'-data';
        var selFilterPanel = '.'+activeDataTab+ '-selected-filters';
        var createFormFilterSet = $('p#'+activeDataTab+'-filters');

        var checked_box = $('div[data-feature-id="' + $(this).parent('span').data('feature-id')
            + '"] input[type="checkbox"][data-value-name="' + $(this).parent('span').data('value-name') + '"]');

        if($(this).parent('span').data('feature-type') == 'molecular') {
            checked_box = $('div[data-feature-id="' + $(this).parent('span').data('feature-id').split(":")[3]
                + '"] input[type="checkbox"][data-value-name="' + $(this).parent('span').data('value-name') + '"]');
        }
        checked_box.prop('checked', false);
        var span_data = $(this).parent('span').data();

        // Remove the filter tokens from their respective containers
        createFormFilterSet.find('span[data-feature-id="'+span_data['feature-id']+'"][data-value-id="'+span_data['value-id']+'"]').remove();
        $(selFilterPanel+' .panel-body span[data-feature-id="'+span_data['feature-id']+'"][data-value-id="'+span_data['value-id']+'"]').remove();

        if(!cohort_id && $('.selected-filters .panel-body span').length <= 0) {
            $('#at-least-one-filter-alert-modal').show();
            $('#create-cohort-modal input[type="submit"]').attr('disabled','disabled');
        }

        // If this has emptied out a program's filter set, hide the modal's subsection for that program
        if(createFormFilterSet.find('span').length <= 0) {
            createFormFilterSet.hide();
        }

        // If we're down to 1 program in the filter set, the multiprogram warning is no longer needed
        var progCount = 0;
        $('.selected-filters .panel-body').each(function(){
            if($(this).find('span').length > 0) {
                progCount++;
            }
        });
        (progCount > 1) ? $('#multi-prog-cohort-create-warn').show() : $('#multi-prog-cohort-create-warn').hide();

        (!data || !data.without_update) && update_displays(true,false,span_data['prog-id']);
        return false;
    });

    //
    // Fix for Issue #1950. While user is waiting for cohort data request, we prevent them from clicking on
    // another tab and starting another request.
    //

    var reject_load = false;

    var filter_panel_load = function(cohort) {
        if (reject_load) {
            return;
        }
        var active_program_id = $('ul.nav-tabs-data li.active a').data('program-id');
        var program_data_selector ='#'+active_program_id+'-data';
        if ($(program_data_selector).length == 0) {
            reject_load = true;
            $('.tab-pane.data-tab').each(function() { $(this).removeClass('active'); });
            $('#placeholder').addClass('active');
            $('#placeholder').show();
            var data_tab_content_div = $('div.data-tab-content');
            var get_panel_url = BASE_URL + '/cohorts/' + (cohort ? cohort+'/' : '') + 'filter_panel/' + active_program_id +'/';

            $.ajax({
                type        :'GET',
                url         : get_panel_url,
                success : function (data) {
                    data_tab_content_div.append(data);

                    bind_widgets(program_data_selector, active_program_id);
                    update_displays(null,true);

                    set_mode();

                    $('.tab-pane.data-tab').each(function() { $(this).removeClass('active'); });
                    $(program_data_selector).addClass('active');
                    $('#placeholder').hide();
                },
                error: function () {
                    console.log('Failed to load program panel');
                },
                complete: function(xhr, status) {
                   reject_load = false;
                }
            })
        }
    };

    // Check to see if we need 'Show More' buttons for details and filter panels (we may not)
    var max_height = 0;
    $('.prog-filter-set').each(function(){
        var this_div = $(this);
        if(this_div.outerHeight() > max_height) {
            max_height = this_div.outerHeight();
        }
    });
    $('.prog-filter-set').each(function(){
        if($(this).outerHeight() < max_height) {
            $(this).css('height', '100%');
        }
    });
    if(max_height < $('.curr-filter-panel').innerHeight()){
        $('.curr-filter-panel').css('height','105px');
        $('.more-filters').hide();
    }

    // Detect tab change. This fires when the tab is shown. But
    // we need to stop the tab from responding to clicks for Issue
    // #1950 fix, so we introduce the next function...

    $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
        filter_panel_load(cohort_id);
    });

    // Clicking on the tab will have no effect if another tab
    // is loading....

    $('a[data-toggle="tab"]').on('click', function (e) {
        if (reject_load) {
            e.preventDefault();
            e.stopPropagation();
        }
    });

    filter_panel_load(cohort_id);
    
});

