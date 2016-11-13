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
        tablesorter:'libs/jquery.tablesorter.min',
        base: 'base'
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'session_security': ['jquery'],
        'tablesorter': ['jquery'],
        'base': ['jquery'],
    }
});

require([
    'jquery',
    'jqueryui',
    'bootstrap',
    'session_security',
    'tablesorter',
    'base'
], function($) {

    // Resets forms in modals on cancel. Suppressed warning when leaving page with dirty forms
    $('.modal').on('hide.bs.modal', function() {
        var form = $(this).find('form');
        if(form.length){
            form[0].reset();
        }
    });

    var delete_x_callback = function () {
        var parent_form = $(this).parents('#delete-cohort-form');
        $('input[type="checkbox"][value="' + $(this).parent().attr('value') + '"]').prop('checked', false);
        $(this).parent('.cohort-label').remove();
        if (parent_form && !parent_form.find('.label').length) {
            parent_form.find('input[type="submit"]').prop('disabled', 'disabled')
        }
        return false;
    };

    var clear_objects = function() {
        $('#selected-ids').empty();
        $('#list-cohorts').empty();
        $('.selected-cohorts').empty();

        $('.viz-cohort-select').each(function() { $(this).empty(); });
        $('#cohort-apply-to-workbook input[name=cohorts]').remove();
    };

    var disable_buttons = function(tablename){
        $(tablename).parent().find('.page-action-group .btn').prop('disabled', 'disabled');
        $('#cohort-apply-to-workbook .btn').prop('disabled', 'disabled');
    };
    var enable_buttons = function(tablename){
        $(tablename).parent().find('.page-action-group .btn').removeAttr('disabled');
        $('#cohort-apply-to-workbook .btn').removeAttr('disabled');
        $('#delete-cohort-form input[type="submit"]').removeAttr('disabled')
    };
    var repopulate_cohort_selects = function() {
        $('#saved-cohorts-list tr:not(:first)').each(function() {
            var id = $(this).find('input').val();
            var name = $(this).find('.name-col a').html();
            var option = $('<option value="' + id + '">' + name + '</option>');
            $('.viz-cohort-select').each(function () {
                if ($(this).parent().find('.viz-cohort-select:first')[0] != this
                    && $(this).has('.none-value').length == 0) {
                    $(this).append($('<option class="none-value" value="">None</option>'));
                }
                option = option.clone();
                $(this).append(option);
            });
        });
    };

    // Initiate buttons states on load
    disable_buttons('#cohort-table');
    disable_buttons('#public-cohort-table');
    $('.complement-control').hide();

    $('.select-all').on('change', function() {
        var checked = $(this).is(':checked');
        var tablename = '#' + $(this).closest('table')[0].id;
        var formApply = $('#cohort-apply-to-workbook');
        if (checked) {
            enable_buttons(tablename);
            // Create tokens for Set Ops modal
            $(this).parents('table').find('tr:not(:first) input[type="checkbox"]').each(function() {
                var token = $('<span class="cohort-label label label-default space-right-5" value="'
                        + $(this).val() + '" name="selected-ids">'
                        + $(this).parents('tr').find('.name-col a').html()
                        + ' <a role="button" class="delete-x"><i class="fa fa-times"></a>'
                        + '</span>');
                $('.selected-cohorts').each(function() {
                    $(this).append(token.clone());
                });

                // Add all values to the form
                formApply.append($('<input>', {type: 'hidden', name: 'cohorts', value: $(this).val()}));
            });
        } else {
            disable_buttons(tablename);
            clear_objects();
            repopulate_cohort_selects();
        }

        // Sets all checkboxes to the state of the select-all
        $(this).parents('table').find('input[type=checkbox]').each(function() {
            $(this).prop('checked', checked);
        });
    });

    $('#saved-cohorts-list tr:not(:first) input[type="checkbox"]').on('change', function() {
        clear_objects();
        var tablename = '#' + $(this).closest('table')[0].id;
        // If no checkboxes are selected
        if ($('#saved-cohorts-list tr:not(:first) input[type="checkbox"]:checked').length == 0) {
            $('#saved-cohorts-list .select-all').prop('checked', false);
            repopulate_cohort_selects();

        } else {
            enable_buttons(tablename);
            var formApply = $('#cohort-apply-to-workbook');
            $('#saved-cohorts-list input[type="checkbox"], #public-cohorts-list input[type="checkbox"]').each(function() {
                if ($(this).is(':checked') && $(this).val() !== 'on') {

                    formApply.append($('<input>', {type: 'hidden', name: 'cohorts', value: $(this).val()}));
                    var option = $('<option value="' + $(this).val() + '">' + $(this).parents('tr').find('.name-col a').html() + '</option>');
                    var token_str = '<span class="cohort-label label label-default space-right-5" value="'
                        + $(this).val() + '" name="selected-ids">'
                        + $(this).parents('tr').find('.name-col a').html()
                        + ' <a href="" class="delete-x"><i class="fa fa-times"></a>'
                        + '</span>';
                    var cohort_token = $(token_str);
                    $('#selected-ids').append(cohort_token.clone());
                    $('.selected-cohorts').each(function() {
                        $(this).append(cohort_token.clone());
                    });
                    $('.delete-x').on('click', delete_x_callback);
                    $('.viz-cohort-select').each(function() {
                        if ($(this).parent().find('.viz-cohort-select:first')[0] != this
                            && $(this).has('.none-value').length == 0) {
                            $(this).append($('<option class="none-value" value="">None</option>'));
                        }
                        option = option.clone();
                        $(this).append(option);
                    });
                }
            });
        }
    });

    $('#public-cohorts-list tr:not(:first) input[type="checkbox"]').on('change', function() {
        clear_objects();
        var tablename = '#' + $(this).closest('table')[0].id;
        // If no checkboxes are selected
        if ($('#public-cohorts-list tr:not(:first) input[type="checkbox"]:checked').length == 0) {
            $('#public-cohorts-list .select-all').prop('checked', false);
            repopulate_cohort_selects();

        } else {
            enable_buttons(tablename);
            var formApply = $('#cohort-apply-to-workbook');
            $('#saved-cohorts-list input[type="checkbox"], #public-cohorts-list input[type="checkbox"]').each(function() {
                if ($(this).is(':checked') && $(this).val() !== 'on') {

                    formApply.append($('<input>', {type: 'hidden', name: 'cohorts', value: $(this).val()}));
                    var option = $('<option value="' + $(this).val() + '">' + $(this).parents('tr').find('.name-col a').html() + '</option>');
                    var token_str = '<span class="cohort-label label label-default space-right-5" value="'
                        + $(this).val() + '" name="selected-ids">'
                        + $(this).parents('tr').find('.name-col a').html()
                        + ' <a href="" class="delete-x"><i class="fa fa-times"></a>'
                        + '</span>';
                    var cohort_token = $(token_str);
                    $('#selected-ids').append(cohort_token.clone());
                    $('.selected-cohorts').each(function() {
                        $(this).append(cohort_token.clone());
                    });
                    $('.delete-x').on('click', delete_x_callback);
                    $('.viz-cohort-select').each(function() {
                        if ($(this).parent().find('.viz-cohort-select:first')[0] != this
                            && $(this).has('.none-value').length == 0) {
                            $(this).append($('<option class="none-value" value="">None</option>'));
                        }
                        option = option.clone();
                        $(this).append(option);
                    });
                }
            });
        }
    });

    $('#saved-cohorts-list .shared').on('click', function (e) {
        var modalName = $(this).data('target');
        var item = $(this).closest('tr').find('input[type="checkbox"]');

        $(this).closest('table').find('input[type="checkbox"]').attr('checked', false);
        item.click();

        $(modalName + ' a[data-target="#shared-with-pane"]').tab('show');
    });

    // onClick: Remove shared user
    var remove_shared_user = function() {
        var user_id = $(this).attr('data-user-id');
        var cohort_ids = $(this).attr('data-cohort-ids').split(",");
        var url = base_url + '/cohorts/unshare_cohort/';
        var csrftoken = $.getCookie('csrftoken');
        $.ajax({
            type: 'POST',
            url: url,
            dataType: 'json',
            data: {user_id: user_id, cohorts: JSON.stringify(cohort_ids)},
            beforeSend: function (xhr) {
                xhr.setRequestHeader("X-CSRFToken", csrftoken);
            },
            success: function () {
                window.location.reload(true);
            },
            error: function (e) {
                console.error('Failed to remove user: ' + JSON.parse(e.responseText).msg);
            }
        })
    };

    $('#share-cohorts-modal').on('show.bs.modal', function () {
        var users = [];
        var user_map = {};
        var that = this;
        $('#saved-cohorts-list tr:not(:first) input:checked').each(function(){
            var cohort = $(this).val();
            var tempt = shared_users[$(this).val()];
            if(tempt){
                JSON.parse(tempt).forEach(function(user){
                    if(!user_map[user.pk]){
                        user_map[user.pk] = user.fields;
                        user.fields.shared_cohorts = [cohort];
                        user.fields.id = user.pk;
                        users.push(user.fields);
                    } else {
                        user_map[user.pk].shared_cohorts.push(cohort);
                    }
                })
            }
        })

        var table = $(that).find('table');
        if(users.length){
            table.append('<thead><th>Name</th><th>Email</th><th></th></thead>')
            users.forEach(function(user){
                $(that).find('table').append(
                    '<tr><td>'+ user.first_name + ' ' + user.last_name + '</td>'
                    +'<td>'+ user.email +'</td>'
                    +'<td><a title="Remove '+user.first_name+' '+user.last_name+' from all shared Cohorts?" class="remove-shared-user" role="button" data-user-id="'+user.id+'" data-cohort-ids="'+user.shared_cohorts.join(",")+'"><i class="fa fa-times"></i></a></td></tr>')
            });
            $('.remove-shared-user').on('click', remove_shared_user);
        }else{
            table.append('<p class="center">Your List is Empty</p>')
        }
    }).on('hidden.bs.modal', function(){
        $(this).find('table').html('');
    });

    $('#set-op-cohort').on('submit', function() {
        var form = $(this);
        $('#selected-ids').children().each(function() {
            form.append('<input type="hidden" name="selected-ids" value="'+$(this).attr('value')+'" />')
        });
        $('#base-id').children().each(function() {
            form.append('<input type="hidden" name="base-id" value="'+$(this).attr('value')+'" />')
        });
        $('#subtract-ids').children().each(function() {
            form.append('<input type="hidden" name="subtract-ids" value="'+$(this).attr('value')+'" />')
        });
    });

    $('#share-cohort-form').on('submit', function() {
        var form = $(this);
        $(this).find('.selected-cohorts span').each(function() {
            form.append('<input type="hidden" name="cohort-ids" value="'+$(this).attr('value')+'" />')
        })
    });

    $('#delete-cohort-form').on('submit', function() {
        var form = $(this);
        $(this).find('.selected-cohorts span').each(function() {
            form.append('<input type="hidden" name="id" value="' + $(this).attr('value') + '" />')
        });
    });

    $('#operation').on('change', function() {
        if ($(this).val() == 'complement') {
            $('.set-control').hide();
            $('.complement-control').show();
        } else {
            $('.set-control').show();
            $('.complement-control').hide();
        }
    });

    $('.add-cohort').on('click', function() {
        $(this).siblings('.search-cohorts').show();
        return false;
    });

    $('.search-cohorts').autocomplete({
        source: cohort_list,
        select: function(event, ui) {
            var token_str = '<span class="cohort-label label label-default space-right-5" value="'
                        + ui.item.value + '" name="selected-ids">'
                        + ui.item.label
                        + ' <a href="" class="delete-x"><i class="fa fa-times"></a>'
                        + '</span>';
            var cohort_token = $(token_str);
            $(event.target).parents('.form-group').find('.form-control-static').append(cohort_token);
            $('.delete-x').on('click', delete_x_callback);
            $(this).val('');
            $(this).hide();
            return false;
        },
        open: function(event, ui) {
            $('.ui-autocomplete').css('width', $(this).parents('.form-group').width() + 'px')
        }
    }).hide();

    $.tablesorter.addParser({
        id: 'fullDate',
        is: function(s) {
            return false;
        },
        format: function(s) {
            var date = s.replace(/\./g,"");
            return new Date(date).getTime();
        },
        type: 'numeric'
    });

    $('#cohort-table').tablesorter({
        headers: {
            0: {sorter:false},
            7: {sorter: 'fullDate'}
        },
        sortList: [[7,1]]
    });

    $('#public-cohort-table').tablesorter({
        headers: {
            0: {sorter:false},
            4: {sorter: 'fullDate'}
        },
        sortList: [[4,1]]
    });

    $(".createWorkbookWithCohort").on("click", function(){
        //get the selected cohort
        var cohorts = [];
        $('#saved-cohorts-list input[type="checkbox"], #public-cohorts-list input[type="checkbox"]').each(function() {
            if ($(this).is(':checked') && $(this).val() != 'on') {
                cohorts.push($(this).val());
            }
        });

        if(cohorts.length > 0){
            var csrftoken = $.getCookie('csrftoken');
            $.ajax({
                type: 'POST',
                dataType :'json',
                url : base_url + '/workbooks/create_with_cohort_list',
                data: JSON.stringify({cohorts : cohorts}),
                beforeSend: function(xhr){xhr.setRequestHeader("X-CSRFToken", csrftoken);},
                success: function (data) {
                    if(!data.error) {
                        window.location = base_url + '/workbooks/' + data.workbook_id + '/worksheets/' + data.worksheet_id + '/';
                    } else {
                        console.log('Failed to create workbook with cohorts.');
                    }
                },
                error: function () {
                    console.log('Failed to create workbook with cohorts.');
                }
            });
        }
    });

});