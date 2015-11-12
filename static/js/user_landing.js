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
        $(this).find('form')[0].reset();
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
    };

    var clear_viz_objects = function() {
        $('.selected-viz').empty();
    };

    var repopulate_cohort_selects = function() {
        $('#cohorts-list tr:not(:first)').each(function() {
            var id = $(this).find('input').val();
            var name = $(this).find('.name-col a').html();
            var option = $('<option value="' + id + '">' + name + '</option>');
            $('.viz-cohort-select').each(function() {
                if ($(this).parent().find('.viz-cohort-select:first')[0] != this
                    && $(this).has('.none-value').length == 0) {
                    $(this).append($('<option class="none-value" value="">None</option>'));
                }
                option = option.clone();
                $(this).append(option);
            });
//            var token = $('<span class="cohort-label label label-default space-right-5" value="'
//                        + id + '" name="selected-ids">'
//                        + name
//                        + ' <a role="button" class="delete-x"><i class="fa fa-times"></a>'
//                        + '</span>');
//            $('#selected-ids').append(token.clone());
//            $('.selected-cohorts').each(function() {
//                var clone = token.clone();
//                $(this).append(clone)
//            });
//            $('.delete-x').on('click', delete_x_callback)
        });
    };

    $('.select-all').on('change', function() {
        var checked = $(this).is(':checked');
        if (checked) {
            $('#cohort-sets').removeAttr('disabled');
            $('#share-cohorts-btn').removeAttr('disabled');
            $('#delete-cohorts').removeAttr('disabled');
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
            $('#cohort-sets').prop('disabled', 'disabled');
            $('#share-cohorts-btn').prop('disabled', 'disabled');
            $('#delete-cohorts').prop('disabled', 'disabled');
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

        // If no checkboxes are selected
        if ($('#cohorts-list tr:not(:first) input[type="checkbox"]:checked').length == 0) {
            $('#cohort-sets').prop('disabled', 'disabled');
            $('#share-cohorts-btn').prop('disabled', 'disabled');
            $('#delete-cohorts').prop('disabled', 'disabled');
            $('#cohorts-list .select-all').prop('checked', false);

            repopulate_cohort_selects();

        } else {
            $('#cohort-sets').removeAttr('disabled');
            $('#share-cohorts-btn').removeAttr('disabled');
            $('#delete-cohorts').removeAttr('disabled');
            $('#cohorts-list input[type="checkbox"]').each(function() {
                if ($(this).is(':checked') && $(this).val() != 'on') {

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

    $('#vizualizations-list input[type="checkbox"]').on('change', function() {
        clear_viz_objects();
        if ($('#vizualizations-list tr:not(:first) input[type="checkbox"]:checked').length == 0) {
            $('#delete-viz-btn').prop('disabled', 'disabled');
            $('#share-viz-btn').prop('disabled', 'disabled');
            $('#vizualizations-list .select-all').prop('checked', false);
        } else {
            $('#delete-viz-btn').removeAttr('disabled');
            $('#share-viz-btn').removeAttr('disabled');

            $('#vizualizations-list input[type="checkbox"]').each(function() {
                if ($(this).is(':checked') && $(this).val() != 'on') {
                    var token_str = '<span class="cohort-label label label-default space-right-5" value="'
                        + $(this).val() + '" name="viz-ids">'
                        + $(this).parents('tr').find('.name-col a').html()
                        + ' <a role="button" class="delete-x"><i class="fa fa-times"></a>'
                        + '</span>';
                    var cohort_token = $(token_str);
                    $('.selected-viz').each(function() {
                        $(this).append(cohort_token.clone());
                    });
                    $('.delete-x').on('click', delete_x_callback);
                }
            })

        }
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
        }
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
            4: {sorter:'customDate'}
        },
        sortList: [[4,1]]
    });
    $('#viz-table').tablesorter({
        headers: {
            0: {sorter:false},
            4: {sorter: 'customDate'}
        },
        sortList: [[4,1]]
    });

    $('#search-submit').on('submit', function(event) {
        event.preventDefault();
        var data = $(this).find('input[type="text"]').val();
        $.ajax({
            type: 'get',
            url: base_api_url + '/search_cohorts_viz/?q=' + data,
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
                            + '</tr>'
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

    $('.complement-control').hide();
    $('#cohort-sets').prop('disabled', 'disabled');
    $('#share-cohorts-btn').prop('disabled', 'disabled');
    $('#delete-cohorts').prop('disabled', 'disabled');
    $('#delete-viz-btn').prop('disabled', 'disabled');
    $('#share-viz-btn').prop('disabled', 'disabled');
});