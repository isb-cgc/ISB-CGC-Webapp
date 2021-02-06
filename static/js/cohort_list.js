/**
 *
 * Copyright 2018, Institute for Systems Biology
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

// require.config({
//     baseUrl: STATIC_FILES_URL+'js/',
//     paths: {
//         jquery: 'libs/jquery-1.11.1.min',
//         bootstrap: 'libs/bootstrap.min',
//         jqueryui: 'libs/jquery-ui.min',
//         session_security: 'session_security/script',
//         underscore: 'libs/underscore-min',
//         tablesorter:'libs/jquery.tablesorter.min',
//         base: 'base'
//     },
//     shim: {
//         'bootstrap': ['jquery'],
//         'jqueryui': ['jquery'],
//         'session_security': ['jquery'],
//         'tablesorter': ['jquery'],
//         'base': ['jquery'],
//     }
// });

require([
    'jquery',
    'base',
    'jqueryui',
    'bootstrap',
    'session_security',
    'tablesorter'
], function($,base) {

    // Resets forms in modals on cancel. Suppressed warning when leaving page with dirty forms
    $('.modal').on('hide.bs.modal', function() {
        var form = $(this).find('form');
        if(form.length){
            form[0].reset();
            $('#base-id').empty();
            $('#subtract-ids').empty();
        }
    });

    var delete_x_callback = function () {
        var parent_form = $(this).parents('form');
        $(this).parents('.form-control-static').siblings('.cohort-search-div').show();
        $(this).parents('.complement-control').length <= 0 && $('input[type="checkbox"][value="' + $(this).parent().attr('value') + '"]').trigger('click');
        $(this).parents('.complement-control').length <= 0 && $('#base-ids').empty() && $('#subtract-ids').empty();
        $(this).parent('.cohort-label').remove();
        console.debug(parent_form.find('.label').length);
        if (parent_form && parent_form.find('.label').length <= 1) {
            parent_form.find('[type="submit"]').prop('disabled', 'disabled')
        }
        return false;
    };

    var toggle_buttons = function() {
        if ($('tr:not(:first) input[type="checkbox"]:checked').length == 0) {
           $('.page-action-group .btn').prop('disabled', 'disabled');
           $('.page-action-group .btn').attr('title', 'Select one or more cohorts.');
           $('.page-action-group .btn.set-ops').attr('title', 'Select two or more cohorts.');
        } else {
            if($('tr:not(:first) input[type="checkbox"]:checked').length >= 2) {
               $('.page-action-group .btn').removeAttr('title');
               $('.page-action-group .btn:not(.owner-only)').removeAttr('disabled');
            } else {
               $('.page-action-group .btn:not(.set-ops)').removeAttr('title');
               $('.page-action-group .btn:not(.owner-only,.set-ops)').removeAttr('disabled');
               $('.page-action-group .btn.set-ops').prop('disabled', 'disabled');
               $('.page-action-group .btn.set-ops').attr('title', 'Select two or more cohorts.');
            }

            var canDelOrShare = true;
            $('tr:not(:first) input[type="checkbox"]:checked').each(function () {
                if ($.trim($(this).parents('td').siblings('td.owner-col').text()) !== 'You') {
                    canDelOrShare = false;
                }
            });
            canDelOrShare && $('.owner-only').removeAttr('disabled') &&$('.page-action-group .btn:not(.set-ops)').removeAttr('title');
            !canDelOrShare && $('.owner-only').prop('disabled', 'disabled') && $('.page-action-group .btn.owner-only').attr('title', "You don't have permission to share or delete some of the selected cohorts.");
        }


        $('.cohort-table tr:not(:first) input[type="checkbox"]:checked').length == 0 && $('#cohort-apply-to-workbook .btn').prop('disabled', 'disabled');
        $('.cohort-table tr:not(:first) input[type="checkbox"]:checked').length > 0 && $('#cohort-apply-to-workbook .btn').removeAttr('disabled');
    };

    $('.select-all').on('change', function() {
        var checked = $(this).is(':checked');
        var formApply = $('#cohort-apply-to-workbook');

        formApply.find('input[name=\'cohorts\']').remove();
        $('.selected-cohorts').empty();
        $('#selected-ids').empty();

        if (checked) {
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
                $('#selected-ids').append(token.clone());

                // Add all values to the form
                formApply.append($('<input>', {type: 'hidden', name: 'cohorts', value: $(this).val()}));
            });
        }

        // Sets all checkboxes to the state of the select-all
        $(this).parents('table').find('input[type=checkbox]').each(function() {
            $(this).prop('checked', checked);
        });

        toggle_buttons();
    });

    var checkbox_change_callback = function() {
        var tablename = '#' + $(this).closest('table')[0].id;

        var checkbox_length = $(tablename+' tr:not(:first) input[type="checkbox"]').length;
        var checked_length = $(tablename+' tr:not(:first) input[type="checkbox"]:checked').length;
        $(tablename+' .select-all').prop('checked', checkbox_length == checked_length);

        toggle_buttons();

        // Box was checked - add token and hidden input
        if ($(this).is(':checked') && $(this).val() !== 'on') {
            $('#cohort-apply-to-workbook').append($('<input>', {type: 'hidden', name: 'cohorts', value: $(this).val()}));
            var cohort_token = $('<span class="cohort-label label label-default space-right-5" value="'
                + $(this).val() + '" name="selected-ids">'
                + $(this).parents('tr').find('.name-col a').html()
                + ' <a href="" class="delete-x"><i class="fa fa-times"></a>'
                + '</span>');
            $('#selected-ids').append(cohort_token.clone());
            if(!tablename.match(/public/)) {
                $('.selected-cohorts').each(function() {
                    $(this).append(cohort_token.clone());
                });
            }
        // Box was unchecked - remove token
        } else {
            $('#cohort-apply-to-workbook input[value="'+$(this).val()+'"], #selected-ids span[value="'+$(this).val()+'"], .selected-cohorts span[value="'+$(this).val()+'"]').remove();
        }
    };

    $('#saved-cohorts-list tr:not(:first) input[type="checkbox"], #public-cohorts-list tr:not(:first) input[type="checkbox"]').on('change', checkbox_change_callback);

    $('#cohorts-list .shared').on('click', function (e) {
        var modalName = $(this).data('target');
        var item = $(this).closest('tr').find('input[type="checkbox"]');

        $(this).closest('table').find('input[type="checkbox"]').attr('checked', false);
        item.click();

        $(modalName + ' a[data-target="#shared-with-pane"]').tab('show');
    });

    // Remove shared user
    var remove_shared_user = function() {
        var user_id = $(this).attr('data-user-id');
        var cohort_ids = $(this).attr('data-cohort-ids').split(/\s*,\s*/);
        var url = BASE_URL + '/cohorts/unshare_cohort/';
        var csrftoken = $.getCookie('csrftoken');
        $.ajax({
            type: 'POST',
            url: url,
            dataType: 'json',
            data: {user_id: user_id, cohorts: JSON.stringify(cohort_ids)},
            beforeSend: function (xhr) {
                xhr.setRequestHeader("X-CSRFToken", csrftoken);
            },
            success: function (data) {
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

        $('#cohorts-list tr:not(:first) input:checked').each(function() {
            var cohort = $(this).val();
            var tempt = shared_users[$(this).val()];
            if (tempt) {
                JSON.parse(tempt).forEach(function (user) {
                    if (!user_map[user.pk]) {
                        user_map[user.pk] = user.fields;
                        user.fields.shared_cohorts = [cohort];
                        user.fields.id = user.pk;
                        users.push(user.fields);
                    } else {
                        user_map[user.pk].shared_cohorts.push(cohort);
                    }
                })
            }
        });

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
            table.append('<p class="center">Not currently shared with any users.</p>')
        }
    }).on('hidden.bs.modal', function(){
        $(this).find('table').html('');
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
            base.showJsMessage('danger',
                "The following email addresses appear to be invalid: "+invalid_emails.join("; "),
                true,'#share-cohort-js-messages');
            return false;
        } else {
            $('#share-cohort-js-messages').empty();
        }

        $(this).find('.selected-cohorts span').each(function() {
            $this.append('<input type="hidden" name="cohort-ids" value="'+$(this).attr('value')+'" />')
        });

        var url = BASE_URL + '/cohorts/share_cohort/';

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
                        base.showJsMessage('danger',data.result.msg,true,'#share-cohort-js-messages');
                    }
                } else if(data.status && data.status == 'success') {
                    $this.closest('.modal').modal('hide');
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
                    if($this.data('redirect')) {
                        window.location = $this.data('redirect');
                    } else {
                        window.location.reload();
                    }
                }
            },
            error: function (err) {
                $this.closest('.modal').modal('hide');
                base.showJsMessage('error',err,true);
            },
        }).always(function () {
            $this.find('.btn-primary').removeClass('btn-disabled').removeAttr('disabled');
        });
        // We don't want this form submission to automatically trigger a reload
        return false;
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
            $('#base-id').find('span').remove();
            $('#subtract-ids').find('span').remove();
            var largest = null;
            var smaller = [];
            $('tr:not(:first) input[type="checkbox"]:checked').each(function(){
                var cohort = {
                    'value': $(this).parent('td').siblings('.id-col').text().trim(),
                    'label': $(this).parent('td').siblings('.name-col').text().trim(),
                    'size': parseInt($(this).parent('td').siblings('.sample-col').text().trim())
                };
                if(!largest) {
                    largest = cohort;
                } else {
                    if(cohort['size'] > largest['size']) {
                        smaller.push(largest);
                        largest = cohort;
                    } else {
                        smaller.push(cohort);
                    }
                }
            });
            if($('#base-id').find('span').length <= 0) {
                var token_str = '<span class="cohort-label label label-default space-right-5" value="'
                    + largest.value + '" name="selected-ids">'
                    + largest.label
                    + ' <a href="" class="delete-x"><i class="fa fa-times"></a>'
                    + '</span>';
                var cohort_token = $(token_str);
                $('#base-id').append(cohort_token);
            }
            if($('#subtract-ids').find('span').length <= 0) {
                for (var i = 0; i < smaller.length; i++) {
                    if ($('#subtract-ids').find('span[value="' + smaller[i].value + '"]').length <= 0) {
                        var cohort = smaller[i];
                        var token_str = '<span class="cohort-label label label-default space-right-5" value="'
                            + cohort.value + '" name="selected-ids">'
                            + cohort.label
                            + ' <a href="" class="delete-x"><i class="fa fa-times"></a>'
                            + '</span>';
                        var cohort_token = $(token_str);
                        $('#subtract-ids').append(cohort_token);
                    }
                }
            }
            $('.cohort-search-div').hide();
            $('.complement-control').show();
        } else {
            $('.set-control').show();
            $('.complement-control').hide();
        }
    });

    $('#set-ops-modal').on('show.bs.modal', function(){
        $('#operation').trigger('change');
        $(this).find('button[type="submit"]').removeAttr('disabled');

        $('.cohort-search-div').hide();

        var sel_cohorts = [];
        $('tr:not(:first) input[type="checkbox"]:checked').each(function(){
            sel_cohorts.push({'value': $(this).parent('td').siblings('.id-col').text().trim(), 'label': $(this).parent('td').siblings('.name-col').text().trim()});
        });
        $('.search-cohorts').autocomplete({
            source: sel_cohorts,
            select: function(event, ui) {
                // Don't allow cohort tokens to be added multiple times
                if($('.complement-control .form-control-static span[value="'+ui.item.value+'"]').length <= 0
                    && ($(event.target).parents('.cohort-search-div').siblings('#base-id').length <= 0 || $('#base-id').find('span').length <= 0)) {
                    var token_str = '<span class="cohort-label label label-default space-right-5" value="'
                                + ui.item.value + '" name="selected-ids">'
                                + ui.item.label
                                + ' <a href="" class="delete-x"><i class="fa fa-times"></a>'
                                + '</span>';
                    var cohort_token = $(token_str);
                    $(event.target).parents('.form-group').find('.form-control-static').append(cohort_token);
                    $(this).val('');
                    $(this).hide();
                }
                $(this).parents('.cohort-search-div').siblings('#base-id').length > 0 && $('#base-id').find('span').length > 0 && $('#base-id').siblings('.cohort-search-div').hide();
                $(this).parents('.cohort-search-div').siblings('#subtract-ids').length > 0 && $('#subtract-ids').find('span').length >= (sel_cohorts.length-1) && $('#subtract-ids').siblings('.cohort-search-div').hide();
                return false;
            },
            open: function(event, ui) {
                $('.ui-autocomplete').css('width', $(this).parents('.form-group').width() + 'px')
            }
        }).hide();
    });

    $('.add-cohort').on('click', function() {
        $(this).siblings('.search-cohorts').show();
        return false;
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
                url : BASE_URL + '/workbooks/create_with_cohort_list',
                data: JSON.stringify({cohorts : cohorts}),
                beforeSend: function(xhr){xhr.setRequestHeader("X-CSRFToken", csrftoken);},
                success: function (data) {
                    if(!data.error) {
                        window.location = BASE_URL + '/workbooks/' + data.workbook_id + '/worksheets/' + data.worksheet_id + '/';
                    } else {
                        base.setReloadMsg('error','Failed to create a workbook with cohort(s): '+ cohorts.join(", "));
                    }
                },
                error: function () {
                    base.setReloadMsg('error','Failed to create a workbook with cohort(s): '+ cohorts.join(", "));
                }
            }).always(function () {
                $this.find('button[type="submit"]').removeClass('btn-disabled').removeAttr('disabled');
            });
        }
    });

    $('.selected-cohorts, #selected-ids, #base-id, #subtract-ids').on('click', '.delete-x', delete_x_callback);

    // Initiate buttons states on load
    toggle_buttons();

    $('.complement-control').hide();

    // Prevent multiple submissions of any form
    $('form').on('submit',function(){
        $(this).find('button[type="submit"]').attr('disabled','disabled');
    });

    // If this is a Data Source/Cohorts load for a worksheet, we need to add the pre-checked cohorts,
    // if any, to the various form entities
    $('input.cohort:checked').each(function(){
        $('#cohort-apply-to-workbook').append($('<input>', {type: 'hidden', name: 'cohorts', value: $(this).val()}));
    });

});