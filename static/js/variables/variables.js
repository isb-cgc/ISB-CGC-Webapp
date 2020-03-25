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
        session_security: 'session_security/script',
        underscore: 'libs/underscore-min',
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
    'base',
    'select2'
], function($, jqueryui, bootstrap, session_security, d3, d3tip, vizhelpers, base) {

    // Resets forms in modals on cancel so we don't get an onbeforeunload if we started filling one out and
    // changed  our mind
    $('.modal').on('hide.bs.modal', function() {
        $(this).find('form')[0].reset();
    });

    function set_pill_deletes(){
        $('a.delete-x').off('click');
        $('a.delete-x').on('click', function() {
            var code = $(this).parent('span').data('code');
            $('.variable-toggle-checkbox[data-code="' + code + '"]').prop('checked', false);
            $(this).parent('span').remove();
            $('#create-cohort-form .form-control-static').find('span[data-code="' + code + '"]').remove();
            return false;
        });
    }
    set_pill_deletes();

    vizhelpers.get_datatype_search_interfaces($(".clinical-accordion"), "CLIN");

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
                if (options[i].hasOwnProperty('type')) {
                    selectbox.append('<option value="'+options[i]['internal_feature_id']+'" var_type="'+ options[i]['type'] + '">'+options[i]['label']+'</option>')
                }
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

        $('input[type="checkbox"][data-code="'+code+'"]').each(function() {
            $(this).prop('checked', true);
        });
        return token;
    }

    /*
        Removes a ui pill representing a user selected variable
    */
    function remove_variable_pill(code){
        $(".selected-variable[data-code='" + code + "']").remove();
        $('#create-cohort-form .form-control-static [data-code="' + code + '"]').remove();
        $('input[type="checkbox"][data-code="'+code+'"]').each(function() {
            $(this).prop('checked', false);
        });
    }

    /*
        Adds or removes a variable pill when users click on a checkbox representing a variable
     */
    $('.data-tab-content').on('change', 'input[type="checkbox"]', function(event){
        var $this      = $(this),
            name       = $this.data('text-label'),
            code       = $this.data('code'),
            feature_id = $this.data('feature-id'),
            var_type   = $this.attr('var_type');

        $('input[type="checkbox"][data-code="'+code+'"]').each(function() {
            $(this).prop('checked', $this.is(':checked'));
        })

        if ($this.is(':checked') && $('.selected-filters span[data-code="' + code + '"]').length == 0) { // Checkbox checked and not already in list
            add_variable_pill(name, code, feature_id, var_type);
        } else {
            remove_variable_pill(code);
        }
    });

    $('.search-term-field').on('change', function(event){
        var selectedOption = $(this).parents('.form-group').find('.select2-selection__rendered').children().first();
        var name       = selectedOption.text();
        var code       = selectedOption.val();
        var var_type   = selectedOption.attr('var_type');

        if ($('.selected-filters span[data-code="' + code + '"]').length == 0) { // Check to see if selected already
            add_variable_pill(name, code, "", var_type);
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
        var name = $.trim($("#variable_list_name_input").val());

        var unallowed = name.match(base.blacklist);

        if(unallowed) {
            $('.unallowed-chars').text(unallowed.join(", "));
            $('#unallowed-chars-alert').show();
            event.preventDefault();
            return false;
        } else {
            $('#unallowed-chars-alert').hide();
        }

        var variable_list = get_variable_list();
        if(name=="" || !variable_list.length){
            $.createMessage('Please check that your variable list name is not empty, and that you have selected at least one variable.', 'warning');
        } else {
            $(this).attr('disabled', 'disabled');
            var csrftoken = $.getCookie('csrftoken');
            $.ajax({
                type: 'POST',
                url : BASE_URL + '/variables/save',
                contentType: "application/json",
                data: JSON.stringify({name : name, variables : variable_list}),
                beforeSend: function(xhr){xhr.setRequestHeader("X-CSRFToken", csrftoken);},
                success: function (data) {
                    window.location = BASE_URL + '/variables/';
                },
                error: function () {
                    $.createMessage('There was an error in creating your variable list.', 'error');
                }

            });
        }
    });

    $('form.new-workbook input[type="submit"]').on('click',function(e){
        var form = $(this).parents('.new-workbook');
        var name = form.find('.new-workbook-name').val();
        var unallowed_chars_alert = $(this).parents('.new-workbook-modal').find('.unallowed-chars-wb-alert');
        unallowed_chars_alert.hide();

        // Do not allow white-space only names
        if(name.match(/^\s*$/)) {
            form.find('.new-workbook-name').prop('value','');
            e.preventDefault();
            return false;
        }

        var unallowed = name.match(base.blacklist);

        if(unallowed) {
            unallowed_chars_alert.find('.unallowed-chars-wb').text(unallowed.join(", "));
            unallowed_chars_alert.show();
            event.preventDefault();
            return false;
        }
    });

    // Resets forms on cancel. Suppressed warning when leaving page with dirty forms
    $('.cancel-edit').on('click', function() {
        $('#unallowed-chars-alert').hide();
        var form = $('.create-gene-list')[0];
        if(form){
            form.reset();
        }
    });

    // Edits an existing favorite_list then redirects to the favorite list, or other place
    $("#edit_favorite_list").on('click', function(event){
        var name = $.trim($("#variable_list_name_input").val());

        var unallowed = name.match(base.blacklist);

        if(unallowed) {
            $('.unallowed-chars').text(unallowed.join(", "));
            $('#unallowed-chars-alert').show();
            event.preventDefault();
            return false;
        } else {
            $('#unallowed-chars-alert').hide();
        }

        var variable_list = get_variable_list();
        var variable_id = this.getAttribute("variable_id");
        if(name && variable_list.length>0){
            var csrftoken = $.getCookie('csrftoken');
            $.ajax({
                type : 'POST',
                url  : BASE_URL + '/variables/' + variable_id + '/update',
                contentType: "application/json",
                data : JSON.stringify({name : name, variables : variable_list}),
                beforeSend: function(xhr){xhr.setRequestHeader("X-CSRFToken", csrftoken);},
                success: function (data) {
                    window.location = BASE_URL + '/variables/';
                },
                error: function () {
                    $.createMessage('There was an error in creating your variable list.', 'error');
                }

            });
        } else {
            $.createMessage('Please check that your variable list name is not empty, and that you have selected at least one variable.', 'warning')
        }
    });

    /*
        Add a variable list to an existing worksheet
     */
    $("#apply_to_worksheet").on('click', function(event){
        var name = $.trim($("#variable_list_name_input").val());

        var unallowed = name.match(base.blacklist);

        if(unallowed) {
            $('.unallowed-chars').text(unallowed.join(", "));
            $('#unallowed-chars-alert').show();
            event.preventDefault();
            return false;
        } else {
            $('#unallowed-chars-alert').hide();
        }

        var workbook_id  = this.getAttribute("workbook_id");
        var worksheet_id = this.getAttribute("worksheet_id");
        var variable_list = get_variable_list();
        if(name && variable_list.length>0){
            var csrftoken = $.getCookie('csrftoken');
            $.ajax({
                type : 'POST',
                url  : BASE_URL + '/workbooks/' + workbook_id + '/worksheets/' + worksheet_id + '/variables/edit',
                contentType: "application/json",
                data : JSON.stringify({name : name, variables : variable_list}),
                beforeSend: function(xhr){xhr.setRequestHeader("X-CSRFToken", csrftoken);},
                success: function (data) {
                    window.location = BASE_URL + '/workbooks/' + workbook_id + '/worksheets/' + worksheet_id + '/';
                },
                error: function () {
                    $.createMessage('There was an error in creating your variable list.', 'error');
                }

            });
        } else {
            $.createMessage('Please check that your variable list name is not empty, and that you have selected at least one variable.', 'warning')
        }
    });

    $('#select_then_create_new_workbook').on('click', function(event) {
        var name = $.trim($("#variable_list_name_input").val());
        var variable_list = get_variable_list();
        if(name=="" || !variable_list.length){
            $.createMessage('Please check that your variable list name is not empty, and that you have selected at least one variable.', 'warning')
        } else {
            $(this).attr('disabled', 'disabled');
            var csrftoken = $.getCookie('csrftoken');
            $.ajax({
                type: 'POST',
                url : BASE_URL + '/variables/save',
                contentType: "application/json",
                data: JSON.stringify({name : name, variables : variable_list}),
                beforeSend: function(xhr){xhr.setRequestHeader("X-CSRFToken", csrftoken);},
                success: function (data) {
                    data = $.parseJSON(data);
                    var form = $('#create-workbook');
                    form.attr('action', BASE_URL+'/workbooks/create_with_variables');
                    form.append('<input name="variable_list_id" value="'+data['model']['id']+'">');
                    form.trigger('submit');
                },
                error: function () {
                    $.createMessage('There was an error in creating your variable list.', 'error');
                }

            });
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

    // Checks for previously-selected variables (i.e. editing an extent list) and checks them off
    function check_for_selections() {
        if ($('.selected-filters span').length > 0) {
            var variable_list = get_variable_list();
            for (var i = 0; i < variable_list.length; i++ ) {
                $('input[type="checkbox"][data-code="'+variable_list[i]['code']+'"]').each(function() {
                    $(this).prop('checked', true);
                })
            }
        }
    };

    $('.user-vars-tab').on('click',function(){
        $.ajax({
            type: 'GET',
            url: BASE_URL + '/variables/user_vars/',
            success: function(user_vars) {
                $('#0-data').empty();
                $('#0-data').append(user_vars);
                // Re-run the checkbox settings to account for user vars now
                check_for_selections();
            },
            error: function() {
                base.showJsMessage("error","There was an error while retrieving your user variables - please contact the administrator.",true);
                $('.spinner').hide();
            }
        });
    });

    check_for_selections();

});
