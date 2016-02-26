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
        tablesorter:'libs/jquery.tablesorter.min',
        base: 'base'
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'session_security': ['jquery'],
        'assetscore': ['jquery', 'bootstrap', 'jqueryui'],
        'assetsresponsive': ['jquery', 'bootstrap', 'jqueryui'],
        'tablesorter': ['jquery'],
        'base': ['jquery'],
    }
});

require([
    'jquery',
    'jqueryui',
    'bootstrap',
    'session_security',
    'assetscore',
    'assetsresponsive',
    'tablesorter',
    'base'
], function($) {
    A11y.Core();

    // Resets forms in modals on cancel. Suppressed warning when leaving page with dirty forms
    $('.modal').on('hide.bs.modal', function() {
        var form = $(this).find('form');
        if(form.length){
            form[0].reset();
        }
    });

    var delete_x_callback = function () {
        $(this).parent('.cohort-label').remove();
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
    };
    var repopulate_cohort_selects = function() {
        $('#cohorts-list tr:not(:first)').each(function() {
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
        if (checked) {
            enable_buttons(tablename);
            var ids = [];
            $('#cohorts-list tr:not(:first) input[type="checkbox"]').each(function() {
                var token = $('<span class="cohort-label label label-default space-right-5" value="'
                        + $(this).val() + '" name="selected-ids">'
                        + $(this).parents('tr').find('.name-col a').html()
                        + ' <a role="button" class="delete-x"><i class="fa fa-times"></a>'
                        + '</span>');
                $('.selected-cohorts').each(function() {
                    $(this).append(token.clone());
                });
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

    $('#cohorts-list tr:not(:first) input[type="checkbox"]').on('change', function() {
        var ids = [];
        clear_objects();
        var tablename = '#' + $(this).closest('table')[0].id;
        // If no checkboxes are selected
        if ($('#cohorts-list tr:not(:first) input[type="checkbox"]:checked').length == 0) {
            $('#cohorts-list .select-all').prop('checked', false);
            //disable_buttons(tablename);
            repopulate_cohort_selects();

        } else {
            enable_buttons(tablename);
            var formApply = $('#cohort-apply-to-workbook');
            $('#cohorts-list input[type="checkbox"]').each(function() {
                if ($(this).is(':checked') && $(this).val() != 'on') {

                    formApply.append($('<input>', {type: 'hidden', name: 'cohorts', value: $(this).val()}));
                    ids.push($(this).val());
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

    $('#cohorts-list .shared').on('click', function (e) {
        var modalName = $(this).data('target');
        var item = $(this).closest('tr').find('input[type="checkbox"]');

        $(this).closest('table').find('input[type="checkbox"]').attr('checked', false);
        item.click();

        $(modalName + ' a[data-target="#shared-with-pane"]').tab('show');
    });
    $('#share-cohorts-modal').on('show.bs.modal', function () {
        var users = [];
        var userId = [];
        var that = this;
        $('#cohorts-list tr:not(:first) input:checked').each(function(){
            var tempt = shared_users[$(this).val()];
            if(tempt){
                JSON.parse(tempt).forEach(function(user){
                    if($.inArray(user.pk, userId) < 0){
                        users.push(user.fields);
                        userId.push(user.pk);
                    }
                })
            }
        })
        console.log(users);
        var table = $(that).find('table');
        if(users.length){
            table.append('<thead><th>Name</th><th>Email</th></thead>')
            users.forEach(function(user){
                $(that).find('table').append('<tr><td>'+ user.first_name + ' ' + user.last_name + '</td><td>'+ user.email +'</td></tr>')
            })
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

    $('#delete-viz-form').on('submit', function() {
        var form = $(this);
        $(this).find('.selected-viz span').each(function() {
            form.append('<input type="hidden" name="id" value="' + $(this).attr('value') + '" />')
        })
    });

    $('#share-viz-form').on('submit', function() {
        var form = $(this);
        $(this).find('.selected-viz span').each(function() {
            form.append('<input type="hidden" name="viz-ids" value="'+$(this).attr('value')+'" />')
        })
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
            $(event.target).parents('.col-md-10').find('.form-control-static').append(cohort_token);
            $('.delete-x').on('click', delete_x_callback);
            $(this).val('');
            $(this).hide();
            return false;
        },
        appendTo: '.cohort-search-div'
    }).hide();

    $.tablesorter.addParser({
        id: 'customDate',
        is: function(s) {
            //return false;
            //use the above line if you don't want table sorter to auto detected this parser
            //21/04/2010 03:54 is the used date/time format
            return /\d{1,2}\/\d{1,2}\/\d{1,4} \d{1,2}:\d{1,2}/.test(s);
        },
        format: function(s) {
            s = s.replace(/\-/g," ");
            s = s.replace(/:/g," ");
            s = s.replace(/\./g," ");
            s = s.replace(/\//g," ");
            s = s.split(" ");
            var ampm = s[5];
            if (ampm == 'p') {
                s[3] = (parseInt(s[3]) + 12).toString();
            }
            return $.tablesorter.formatFloat(new Date(s[2], s[0], s[1]-1, s[3], s[4]).getTime());
        },
        type: 'numeric'
    });

    $('#cohort-table').tablesorter({
        headers: {
            0: {sorter:false},
            6: {sorter:'customDate'}
        },
        sortList: [[6,1]]
    });
    $('#public-cohort-table, #viz-table, #seqpeek-table').tablesorter({
        headers: {
            0: {sorter:false},
            4: {sorter:'customDate'}
        },
        sortList: [[4,1]]
    });

    $('#search-submit').on('submit', function(event) {
        event.preventDefault();
        var data = $(this).find('input[type="text"]').val();
        $.ajax({
            type: 'get',
            url: base_url + '/search_cohorts_viz/?q=' + data,
            success: function(data) {
                data = JSON.parse(data);

                $('#search-cohort-table tbody').empty();
                $('#search-viz-table tbody').empty();
                $('#results-list .no-results').hide();
                $('#results-list .search-term').html(data['q']);
                var no_cohorts = false;
                var no_viz = false;
                if (data.hasOwnProperty('cohorts') && data['cohorts'].length) {
                    var cohorts = data['cohorts'];
                    $('#search-cohort-table').show();
                    for (var i = 0; i < cohorts.length; i++) {
                        var item = '<tr>'
                            + '<td class="checkbox-col"><i class="fa fa-users"></i></td>'
                            + '<td class="name-col"><a href="/cohorts/' + cohorts[i]['id'] + '/">' + cohorts[i]['name'] + '</a></td>'
                            + '<td class="sample-col">' + cohorts[i]['samples'] + '</td>'
                            + '<td class="owner-col">' + cohorts[i]['owner'] + '</td>'
                            + '<td class="date-col">' + cohorts[i]['last_date_saved'] + '</td>'
                            + '</tr>';
                        $('#search-cohort-table tbody').append(item);
                    }
                } else {
                    $('#search-cohort-table').hide();
                    no_cohorts = true;
                }

                if (data.hasOwnProperty('visualizations') && data['visualizations'].length) {
                    var visualizations = data['visualizations'];
                    $('#search-viz-table').show();
                    for (var i = 0; i < visualizations.length; i++) {
                        var item = '<tr>'
                            + '<td class="checkbox-col"><i class="fa fa-area-chart"></i></td>'
                            + '<td class="name-col"><a href="/visualizations/genericplot/' + visualizations[i]['id'] + '">' + visualizations[i]['name'] + '</a></td>'
                            + '<td class="sample-col">' + visualizations[i]['plots'] + '</td>'
                            + '<td class="owner-col">' + visualizations[i]['owner'] + '</td>'
                            + '<td class="date-col">' + visualizations[i]['last_date_saved'] + '</td>'
                            + '</tr>';
                        $('#search-viz-table tbody').append(item);
                    }
                } else {
                    $('#search-viz-table').hide();
                    no_viz = true;
                }

                if (no_cohorts && no_viz) {
                    $('#results-list .no-results').html('Sorry, there are no search results for ' + data['q'] + '.').show();
                }

                $('#user-landing-tabs .nav-tabs li.active').toggleClass('active');
                $('#user-landing-tabs div.tab-pane.active').toggleClass('active');
                $('#results-list').toggleClass('active')
            },
            error: function() {
                console.log('failed to save')
            }

        });
        $(this)[0].reset();
        return false;
    });

    $(".createWorkbookWithCohort").on("click", function(){
        //get the selected cohort
        var cohorts = [];
        $('#cohorts-list input[type="checkbox"]').each(function() {
            if ($(this).is(':checked') && $(this).val() != 'on') {
                cohorts.push($(this).val());
            }
        });

        if(cohorts.length > 0){
            var csrftoken = get_cookie('csrftoken');
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
    })

    //TODO this should be moved to a shared library
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