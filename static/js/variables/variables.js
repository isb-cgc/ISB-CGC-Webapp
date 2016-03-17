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
        science: 'libs/science.min',
        stats: 'libs/science.stats.min',
        vizhelpers: 'helpers/vis_helpers',
        select2: 'libs/select2.min',
        base: 'base'
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'session_security': ['jquery'],
        'assetscore': ['jquery', 'bootstrap', 'jqueryui'],
        'assetsresponsive': ['jquery', 'bootstrap', 'jqueryui'],
        'select2': ['jquery']
    }
});

require([
    'jquery',
    'jqueryui',
    'bootstrap',
    'session_security',
    'd3',
    'd3tip',
    'vizhelpers',
    'select2',
    'assetscore',
    'assetsresponsive',
    'base'
], function($, jqueryui, bootstrap, session_security, d3, d3tip, vizhelpers) {

    A11y.Core();

    // Resets forms in modals on cancel. Suppressed warning when leaving page with dirty forms
    $('.modal').on('hide.bs.modal', function() {
        $(this).find('form')[0].reset();
    });

    function set_pill_deletes(){
        $('a.delete-x').off('click');
        $('a.delete-x').on('click', function() {
            var code = $(this).parent('span').data('code');
            $('.variable-toggle-checkbox[value="' + code + '"]').prop('checked', false);
            $(this).parent('span').remove();
            $('#create-cohort-form .form-control-static').find('span[data-code="' + code + '"]').remove();
            return false;
        });
    }
    set_pill_deletes();

    //removal of pills
    $('a.delete-x').on('click', function() {
        var search_id = $(this).parent('span').attr('value');
        $('#' + search_id).prop('checked', false);
        $(this).parent('span').remove();
        $('#create-cohort-form .form-control-static').find('span[value="' + search_id + '"]').remove();
        return false;
    });

    // set up the search bars for Clinical and MiRNA tabs
    vizhelpers.get_datatype_search_interfaces($("#mirna-accordion"), "MIRN");
    vizhelpers.get_datatype_search_interfaces($("#clinical-accordion"), "CLIN");

    // Field Editing
    $('.x-edit-field, .y-edit-field, .color-edit-field').on('click', function() { vizhelpers.show_field_search_panel(this); });
    $('.feature-search').on('change', function() { vizhelpers.field_search_change_callback(this); });
    $('.select-field').on('click', function() { vizhelpers.select_field_callback(this); });
    $('.close-field-search').on('click', function() { vizhelpers.close_field_search_callback(this); });
    $('.field-options').on('change', function(event) {
        var self            = $(this);
        var parent          = self.parent();
        var datatype        = parent[0].getAttribute('data-field');
        var filterElements  = parent.find('select');
        var filters         = [];

        $.each(filterElements, function(i, ele){
            var value = $(ele).find(":selected").text();
            if(value !== "" && value !== "Please select an option" ){
                filters.push({'filter' : ele.getAttribute('data-field'), 'value' : value});
            }
        });

        vizhelpers.get_variable_field_options(datatype, filters, function(options){
            var selectbox = parent.parent('.search-field').find('.feature-search .search-term-field');
            selectbox.empty();
            selectbox.append('<option value="" disabled selected>Please select an option</option>');
            for (var i = 0; i < options.length; i++) {
                selectbox.append('<option value="'+options[i]['internal_feature_id']+'" var_type="'+ options[i]['type'] + '">'+options[i]['label']+'</option>')
            }
        });
    })

    /*
        Creates a ui pill representing a user selected variable
     */
    function add_variable_pill(name, code, feature_id, var_type) {
        var token = $('<span>');
        token.addClass('selected-variable')
            .attr('data-name', name)
            .attr('data-code', code)
            .attr('data-type', var_type)
            .attr('data-feature-id', feature_id)
            .append(
                $('<a>').addClass('delete-x filter-label label label-default')
                    .text(name).append(' <i class="fa fa-times"></a>')
            );

        token.data('selected-clone', token.clone(true))
            .data('create-cohort-clone', token.clone(true));

        $('.selected-filters .panel-body').append(token.data('selected-clone'));
        $('#create-cohort-form .form-control-static').append(token.data('create-cohort-clone'));

        set_pill_deletes();
        return token;
    }

    /*
        Removes a ui pill representing a user selected variable
    */
    function remove_variable_pill(code){
        $(".selected-variable[data-code='" + code + "']").remove();
        $('#create-cohort-form .form-control-static [data-code="' + code + '"]').remove();
    }

    /*
        Adds or removes a variable pill when users click on a checkbox representing a variable
     */
    $('input[type="checkbox"]').on('change', function(event){
        var $this      = $(this),
            name       = $this.data('text-label'),
            code       = $this.val(),
            feature_id = $this.data('feature-id');
        if ($this.is(':checked') && $('.selected-filters span[data-code="' + code + '"]').length == 0) { // Checkbox checked and not already in list
            add_variable_pill(name, code, feature_id, var_type);
        } else {
            remove_variable_pill(code);
        }
    });

    /*
        Adds a variable pill when users select a variable from from dropdowns in the TCGA tab
     */
    $('.search-term-field').on('change', function(event){
        //find the options specified to be created in the vis_helper.js line 265 select2_formatting function.
        var selectedOption = $(this).parent().find(".select2-selection__rendered").children().first();
        var name       = selectedOption.text();
        var code       = selectedOption.val();
        var var_type   = selectedOption.attr('var_type');

        if ($('.selected-filters span[data-code="' + code + '"]').length == 0) { // Check to see if selected already
            add_variable_pill(name, code, "", var_type);
        }
    });

    /*
        Adds a filter box when a variable needs an autocomplete
     */
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

    /*
        Convenience function for gathering selected variables from the ui pill list
     */
    function get_variable_list(){
        var variable_list = [];
        $(".selected-variable").each(function (index) {
            var variable_name   = this.getAttribute('data-name');
            var code            = this.getAttribute('data-code');
            var feature_id      = this.getAttribute('data-feature-id');
            var type            = this.getAttribute('data-type');
            variable_list.push({name: variable_name, code : code, feature_id: feature_id, type : type});
        });

        return variable_list;
    }

    /*
        Creates a favorite_list then redirects to the favorite list
     */
    $("#create_favorite_list").on('click', function(event){
        $(this).attr('disabled', 'disabled');
        var name = $.trim($("#variable_list_name_input").val());
        var variable_list = get_variable_list();
        if(name=="" || !variable_list.length){
            //TODO Create fail ui indicator
        } else {
            var csrftoken = get_cookie('csrftoken');
            $.ajax({
                type: 'POST',
                url : base_url + '/variables/save',
                data: JSON.stringify({name : name, variables : variable_list}),
                beforeSend: function(xhr){xhr.setRequestHeader("X-CSRFToken", csrftoken);},
                success: function (data) {
                    window.location = base_url + '/variables/';
                },
                error: function () {
                    //TODO Create fail ui indicator
                    console.log('Failed to save variable_list.');
                }

            });
        }
    });

    /*
        Edits an existing favorite_list then redirects to the favorite list, or other place
     */
    $("#edit_favorite_list").on('click', function(event){
        var name = $.trim($("#variable_list_name_input").val());
        var variable_list = get_variable_list();
        var variable_id = this.getAttribute("variable_id");
        if(name && variable_list.length>0){
            var csrftoken = get_cookie('csrftoken');
            $.ajax({
                type : 'POST',
                url  : base_url + '/variables/' + variable_id + '/update',
                data : JSON.stringify({name : name, variables : variable_list}),
                beforeSend: function(xhr){xhr.setRequestHeader("X-CSRFToken", csrftoken);},
                success: function (data) {
                    window.location = base_url + '/variables/';
                },
                error: function () {
                    //TODO Create fail ui indicator
                    console.log('Failed to save variable_list.');
                }

            });
        } else {
            //TODO Create fail ui indicator that they need to select one or more variables
        }
    });

    /*
        Add a variable list to an existing worksheet
     */
    $("#apply_to_worksheet").on('click', function(event){
        var name = $.trim($("#variable_list_name_input").val());
        var workbook_id  = this.getAttribute("workbook_id");
        var worksheet_id = this.getAttribute("worksheet_id");
        var variable_list = get_variable_list();
        if(name && variable_list.length>0){
            var csrftoken = get_cookie('csrftoken');
            $.ajax({
                type : 'POST',
                url  : base_url + '/workbooks/' + workbook_id + '/worksheets/' + worksheet_id + '/variables/edit',
                data : JSON.stringify({name : name, variables : variable_list}),
                beforeSend: function(xhr){xhr.setRequestHeader("X-CSRFToken", csrftoken);},
                success: function (data) {
                    window.location = base_url + '/workbooks/' + workbook_id + '/worksheets/' + worksheet_id + '/';
                },
                error: function () {
                    //TODO Create fail ui indicator
                    console.log('Failed to save variable_list.');
                }

            });
        } else {
            //TODO Create fail ui indicator that they need to select one or more variables
        }
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

    /*
        Used for getting the CORS token for submitting data
     */
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

});
