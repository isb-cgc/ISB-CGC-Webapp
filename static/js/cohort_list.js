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

require.config({
    baseUrl: STATIC_FILES_URL+'js/',
    paths: {
        jquery: 'libs/jquery-1.11.1.min',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        session_security: 'session_security/script',
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
    }

    $('.select-all').on('change', function() {
        var checked = $(this).is(':checked');
        var formApply = $('#cohort-apply-to-workbook');
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
        } else {
            formApply.empty();
            $('.selected-cohorts').empty();
            $('#selected-ids').empty();
        }

        // Sets all checkboxes to the state of the select-all
        $(this).parents('table').find('input[type=checkbox]').each(function() {
            $(this).prop('checked', checked);
        });

        toggle_buttons();
    });

    var checkbox_change_callback = function() {
        var tablename = '#' + $(this).closest('table')[0].id;
        // If no checkboxes are selected
        if ($(tablename+' tr:not(:first) input[type="checkbox"]:checked').length == 0) {
            $(tablename+' .select-all').prop('checked', false);
        }

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

    if (document.readyState == 'complete') {
        update_table_display();
    } else {
        document.onreadystatechange = function () {
            if (document.readyState === "complete") {
                update_table_display();
            }
        }
    }

    function update_table_display()
    {
        var tab_selector = '#saved-cohorts-list';
        var total_cohorts = cohort_list.length;
        var total_pages = Math.ceil(total_cohorts / cohorts_per_page);
        if (total_cohorts <= 0) {
            $(tab_selector).find('.cohort-page-count').hide();
            $(tab_selector).find('.no-cohort-page-count').show();
            $(tab_selector).find('.paginate_button_space').hide();
            $(tab_selector).find('.dataTables_length').addClass('disabled');
            $(tab_selector).find('.sortable_table th').addClass('disabled');
            $(tab_selector).find('.dataTables_goto_page').addClass('disabled');
        }
        else {
            var page_list = pagination(page, total_pages);
            var html_page_button = "";
            for(var i in page_list){
                if(page_list[i] === "..."){
                    html_page_button += "<span class='\ellipsis\'>...</span>"
                }
                else{
                    html_page_button += "<a class=\'dataTables_button paginate_button numeric_button"+ (page_list[i] == page ? " current\'":"\'") +">" + page_list[i] + "</a>";
                }
            }
            $(tab_selector).find('.cohort-page-count').show();
            $(tab_selector).find('.no-cohort-page-count').hide();
            $(tab_selector).find('.paginate_button_space').show();
            $(tab_selector).find('.dataTables_length').removeClass('disabled');
            $(tab_selector).find('.sortable_table th').removeClass('disabled');
            $(tab_selector).find('.dataTables_goto_page').removeClass('disabled');
            $(tab_selector).find('.dataTables_goto_page .goto-page-number').attr('max', total_pages);
            $(tab_selector).find('.total-cohort-count').html(total_cohorts);
            $(tab_selector).find('.paginate_button_space').html(html_page_button);
        }

        $(tab_selector).find('.cohort-table tbody').empty();

        if(cohort_list.length <= 0) {
            $(tab_selector).find('.cohort-table tbody').append(
                '<tr>' +
                '<td colspan="9"><i>No saved nohort.</i></td><td></td>'
            );
        }
        else {
            var cohorts_for_page = [];
            var first_page_entry = ((page - 1) * cohorts_per_page) + 1;
            var last_page_entry = first_page_entry + cohorts_per_page - 1;
            for (i = 0; i < cohort_list.length; ++i)
            {
                if (i >= first_page_entry && i <= last_page_entry)
                {
                    cohorts_for_page.push(cohort_list[i]);
                }
            }

            $(tab_selector).find('.showing').text(first_page_entry + " to " + last_page_entry);
            for (var i = 0; i < cohorts_for_page.length; i++) {

                var cohort = cohorts_for_page[i];
                var row = '<tr>';

                // if (cohort.owner.is_superuser)
                {
                    row += '<td class="checkbox-col">'
                    row += '<input {% if cohort.id in previously_selected_cohort_ids %}checked{% endif %} type="checkbox" name="id" value="{{ cohort.id }}" title="{{ cohort.name }} Checkbox" aria-label="cohort-checkbox"/>';
                    row += '</td>'
                    row += '<td class="name-col"><a href="{% url \'cohort_details\' cohort.id %}">{{ cohort.name }}</a></td>'
                    row += '<td>{{ cohort.case_size }}</td>';
                    row += '<td class="sample-col"> {{ cohort.sample_size }} </td>';
                    row += '<td class="date-col">{{ cohort.last_date_saved|date:\'M d, Y, g:i a\' }}</td>';
                    row += '</tr>';
                }

                $(tab_selector).find('.cohort-table tbody').append(row);

                // Remember any previous checks
               // var thisCheck = $(tab_selector).find('.filelist-panel input[value="'+val+'"]');
               // selIgvFiles[thisCheck.attr('data-type')] && selIgvFiles[thisCheck.attr('data-type')][thisCheck.attr('value')] && thisCheck.attr('checked', true);
            }
        }
        // var columns_display = tab_columns_display[active_tab];
        // var column_toggle_html = "";
        // for (var i in columns_display) {
        //     column_toggle_html += "<a class=\'column_toggle_button " + (columns_display[i][1] ? '' : 'column_hide') + "\'>" + columns_display[i][0] + "</a>";
        //     if (columns_display[i][1]) {
        //         $(tab_selector).find('table.file-list-table th:nth-child(' + (parseInt(i) + 1) + '), table.file-list-table td:nth-child(' + (parseInt(i) + 1) + ')').removeClass('hide');
        //     }
        //     else
        //         $(tab_selector).find('table.file-list-table th:nth-child(' + (parseInt(i) + 1) + '), table.file-list-table td:nth-child(' + (parseInt(i) + 1) + ')').addClass('hide');
        // }
        // $(tab_selector).find('.column-toggle').html(column_toggle_html);

        // If we're at the max, disable all checkboxes which are not currently checked
        // selIgvFiles.count() >= SEL_IGV_FILE_MAX && $(tab_selector).find('.filelist-panel input.igv.accessible[type="checkbox"]:not(:checked)').attr('disabled',true);

        // Update the Launch buttons
        // $('#igv-viewer input[type="submit"]').prop('disabled', (selIgvFiles.count() <= 0));

        // $('#selected-files-igv').tokenfield('setTokens',selIgvFiles.toTokens());

        $(tab_selector).find('.prev-page').removeClass('disabled');
        $(tab_selector).find('.next-page').removeClass('disabled');
        if (parseInt(page) == 1) {
            $(tab_selector).find('.prev-page').addClass('disabled');
        }
        if (parseInt(page) * cohorts_per_page >= total_cohorts) {
            $(tab_selector).find('.next-page').addClass('disabled');
        }
    };

    function goto_table_page(page_no){
        page=page_no;
        update_table_display();
    }

    $('.tab-content').on('click', '.goto-page-button', function () {
        var this_tab = $(this).parents('.data-tab').data('file-type');
        var page_no_input = $(this).siblings('.goto-page-number').val();
        if (page_no_input == "")
            return;
        var page = parseInt(page_no_input);
        var max_page_no = parseInt($(this).siblings('.goto-page-number').attr('max'));
        if (page > 0 && page <= max_page_no) {
            goto_table_page(this_tab, page);
            $(this).siblings('.goto-page-number').val("");
        }
        else {
            base.showJsMessage("warning",
                "Page number you have entered is invalid. Please enter a number between 1 and "+max_page_no, true);
            $('#placeholder').hide();
        }
    });

    $('.tab-content').on('click', '.paginate_button', function () {
        var this_tab = $(this).parents('.data-tab').data('file-type');
        var page_no;
        if($(this).hasClass('next-page')){
            page_no = parseInt(page)+1;
        }
        else if($(this).hasClass('prev-page')){
            page_no = page_no == 1 ? 1 : page-1;
        }
        else if($(this).hasClass('numeric_button')){
            if($(this).hasClass('current'))
                return;
            page_no = $(this).text();
        }
        else{
            page_no = 1;
        }
        goto_table_page(this_tab, page_no)
    });

    function pagination(c, m) {
        var current = parseInt(c),
            last = m,
            delta = 2,
            left = current - delta,
            right = current + delta + 1,
            range = [],
            rangeWithDots = [],
            l;
        for (var i = 1; i <= last; i++) {
            if (i == 1 || i == last || i >= left && i < right) {
                range.push(i);
            }
        }
        for(var i in range){
            if (l) {
                if (range[i] - l === 2) {
                    rangeWithDots.push(l + 1);
                } else if (range[i] - l !== 1) {
                    rangeWithDots.push('...');
                }
            }
            rangeWithDots.push(range[i]);
            l = range[i];
        }
        return rangeWithDots;
    }
});