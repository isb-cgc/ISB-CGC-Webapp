require.config({
    baseUrl: STATIC_FILES_URL+'js/',
    paths: {
        jquery: 'libs/jquery-1.11.1.min',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        session_security: 'session_security/script',
        underscore: 'libs/underscore-min',
        base: 'base',
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'session_security': ['jquery'],
        'underscore': {exports: '_'},
    }
});

require([
    'jquery',
    'jqueryui',
    'bootstrap',
    'session_security',
    'underscore',
    'base'
], function($, jqueryui, bootstrap, session_security, _) {
    'use strict';
    var warning = false;
    $('input[type="checkbox"]').on('click', function() {
         if ($('input[type="checkbox"]:checked').length > 1 && !warning) {
             $.createMessage('Only one variable list can be used to create workbook.', 'warning');
             warning = true;
         }
    });
    $('#addToNewWorksheet').on('click', function (event) {
        //get the selected cohort
        var variable_lists = [];
        $('input[type="checkbox"]').each(function() {
            if ($(this).is(':checked') && $(this).val() != 'on') {
                variable_lists.push($(this).val());
            }
        });
        var workbook_id  = $('#workbook_id').val();
        var worksheet_id = $('#worksheet_id').val();

        if(variable_lists.length > 0){
            var csrftoken = $.getCookie('csrftoken');
            $.ajax({
                type        : 'POST',
                url         : BASE_URL + '/workbooks/create_with_variables',
                data        : {json_data: JSON.stringify({variable_list_id: variable_lists})},
                beforeSend  : function(xhr){xhr.setRequestHeader("X-CSRFToken", csrftoken);},
                success : function (data) {
                    if(!data.error) {
                        window.location = BASE_URL + '/workbooks/' + data.workbook_id + '/worksheets/' + data.worksheet_id + '/';
                    } else {
                        console.log('Failed to add variables to workbook');
                    }
                },
                error: function () {
                    console.log('Failed to add variables to workbook');
                }
            });
        }
    });

    // Clear all entered genes list on click
    $('#addToWorksheet').on('click', function (event) {
        //get the selected cohort
        var variable_lists = [];
        $('input[type="checkbox"]').each(function() {
            if ($(this).is(':checked') && $(this).val() != 'on') {
                variable_lists.push({ id : $(this).val()});
            }
        });
        var workbook_id  = $('#workbook_id').val();
        var worksheet_id = $('#worksheet_id').val();

        if(variable_lists.length > 0){
            var csrftoken = $.getCookie('csrftoken');
            $.ajax({
                type        : 'POST',
                dataType    :'json',
                url         : BASE_URL + '/workbooks/' + workbook_id + '/worksheets/' + worksheet_id + "/variables/edit",
                data        : JSON.stringify({var_favorites : variable_lists}),
                beforeSend  : function(xhr){xhr.setRequestHeader("X-CSRFToken", csrftoken);},
                success : function (data) {
                    if(!data.error) {
                        window.location = BASE_URL + '/workbooks/' + workbook_id + '/worksheets/' + worksheet_id + '/';
                    } else {
                        console.log('Failed to add variable list to workbook');
                    }
                },
                error: function () {
                    console.log('Failed to add variable list to workbook');
                }
            });
        }
    });
});