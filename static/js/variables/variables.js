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
        select2: 'libs/select2.min'
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
    'visualizations/createScatterPlot',
    'visualizations/createCubbyPlot',
    'visualizations/createViolinPlot',
    'visualizations/createHistogram',
    'visualizations/createBarGraph',
    'select2',
    'assetscore',
    'assetsresponsive'
], function($, jqueryui, bootstrap, session_security, d3, d3tip, vizhelpers, scatter_plot, cubby_plot, violin_plot, histogram, bar_graph) {
    A11y.Core();

    // Resets forms in modals on cancel. Suppressed warning when leaving page with dirty forms
    $('.modal').on('hide.bs.modal', function() {
        $(this).find('form')[0].reset();
    });

    // Field Editing
    $('.x-edit-field, .y-edit-field, .color-edit-field').on('click', function() { vizhelpers.show_field_search_panel(this); });
    $('.feature-search').on('change', function() { vizhelpers.field_search_change_callback(this); });
    $('.select-field').on('click', function() { vizhelpers.select_field_callback(this); });
    $('.datatype-selector').on('click', function() {
        vizhelpers.get_datatype_search_interfaces(this, this.getAttribute("data-field"));
    });
    //$('.field-options').on('change', function() { vizhelpers.field_option_change_callback(this); });
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
                selectbox.append('<option value="'+options[i]['internal_feature_id']+'">'+options[i]['label']+'</option>')
            }
        });
    })

    /*
        Creates a ui pill representing a user selected variable
     */
    var add_variable_pill = function(variable_name, project_id, study_id, project_name, study_name) {
        var token_str = '<span class="selected-variable" variable="' + variable_name + '" project="' + project_id + '" study="' + study_id + '" name="viz-ids">'
            + ' <a href="" class="delete-x filter-label label label-default">'
            + project_name + ' : ' + study_name + ' : ' + variable_name
            + ' <i class="fa fa-times"></a>'
            + '</span>';

        var token = $(token_str);
        $('.selected-filters .panel-body').append(token.clone());
        $('#create-cohort-form .form-control-static').append(token.clone());
        $('a.delete-x').on('click', function() {
            var search_id = $(this).parent('span').attr('value');
            $('#' + search_id).prop('checked', false);
            $(this).parent('span').remove();
            $('#create-cohort-form .form-control-static').find('span[value="' + search_id + '"]').remove();
            return false;
        });
        //search_helper_obj.update_counts(base_api_url, 'metadata_counts', cohort_id);
        //search_helper_obj.update_parsets(base_api_url, 'metadata_platform_list', cohort_id);
    };

    /*
        Removes a ui pill representing a user selected variable
    */
    remove_variable_pill = function(variable_name, project, study){
        $(".selected-variable[variable='" + variable_name + "'][project='" + project + "'][study='" + study + "']").remove();
        $('#create-cohort-form .form-control-static [variable="' + variable_name + '"] [project="' + project + '"] [study="' + study + '"]').remove();
    }

    /*
        Adds or removes a variable pill when users click on a checkbox representing a variable
     */
    $('input[type="checkbox"]').on('change', function(event){
        var id = $(this).prop('id');
        var variable_name   = $(this).attr('variable_name');
        var project         = $(this).attr('project');
        var study           = $(this).attr('study');
        var project_name    = $(this).attr('project_name');
        var study_name      = $(this).attr('study_name');
        if ($(this).is(':checked')) { // Checkbox checked
            add_variable_pill(variable_name, project, study, project_name, study_name);
        } else {
            remove_variable_pill(variable_name, project, study);
        }
    });

    /*
        Adds a variable pill when users select a variable from from dropdowns in the TCGA tab
     */
    $('.search-term-field').on('change', function(event){
        var project         = $(this).attr('project');
        var study           = $(this).attr('study');
        var project_name    = $(this).attr('project_name');
        var study_name      = $(this).attr('study_name');
        var variable_name   = $(this).find(":selected").text();
        add_variable_pill(variable_name, project, study, project_name, study_name);
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
        search_helper_obj.update_counts(base_api_url, 'metadata_counts', cohort_id);
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
        convenience function for gathering selected variables from the ui pill list
     */
    function get_variable_list(){
        var variable_list = [];
        $(".selected-variable").each(function (index) {
            var variable_name = this.getAttribute('variable');
            var project_id = this.getAttribute('project');
            var study_id = this.getAttribute('study');
            variable_list.push({name: variable_name, project_id: project_id, study_id: study_id});
        });

        return variable_list;
    }

    /*
        Creates a favorite_list then redirects to the favorite list
     */
    $("#create_favorite_list").on('click', function(event){
        var name = $("#variable_list_name_input").val();
        if(name==""){
            //TODO Create fail ui indicator
        } else {
            var variable_list = get_variable_list();
            var csrftoken = get_cookie('csrftoken');
            $.ajax({
                type: 'POST',
                url : base_api_url + '/variables/save',
                data: JSON.stringify({name : name, variables : variable_list}),
                beforeSend: function(xhr){xhr.setRequestHeader("X-CSRFToken", csrftoken);},
                success: function (data) {
                    window.location = base_api_url + '/variables/';
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
        console.log("on-edit-click");
    });

    /*
        Add a variable list to an existing worksheet
     */
    $("#apply_to_worksheet").on('click', function(event){
        var workbook_id  = this.getAttribute("workbook_id");
        var worksheet_id = this.getAttribute("worksheet_id");
        var variable_list = get_variable_list();
        if(variable_list.length>0){
            var csrftoken = get_cookie('csrftoken');
            $.ajax({
                type : 'POST',
                url  : base_api_url + '/workbooks/' + workbook_id + '/worksheets/' + worksheet_id + '/variables/edit',
                data : JSON.stringify({variables : variable_list}),
                beforeSend: function(xhr){xhr.setRequestHeader("X-CSRFToken", csrftoken);},
                success: function (data) {
                    window.location = base_api_url + '/workbooks/' + workbook_id + '/worksheets/' + worksheet_id + '/';
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
