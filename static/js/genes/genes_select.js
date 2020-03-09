require.config({
    baseUrl: STATIC_FILES_URL+'js/',
    paths: {
        jquery: 'libs/jquery-1.11.1.min',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        session_security: 'session_security/script',
        underscore: 'libs/underscore-min',
        base: 'base'
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
    'base',
], function($, jqueryui, bootstrap, session_security, _) {
    'use strict';

    $('#addToNewWorksheet').on('click', function (event) {
        //get the selected cohort
        var gene_lists = [];
        $('input[type="checkbox"]').each(function() {
            if ($(this).is(':checked') && $(this).val() != 'on') {
                gene_lists.push($(this).val());
            }
        });
        var workbook_id  = $('#workbook_id').val();
        var worksheet_id = $('#worksheet_id').val();

        if(gene_lists.length > 0){
            var csrftoken = $.getCookie('csrftoken');
            $.ajax({
                type        : 'POST',
                dataType    :'json',
                url         : BASE_URL + '/workbooks/create_with_genes',
                data        : JSON.stringify({gene_fav_list : gene_lists}),
                beforeSend  : function(xhr){xhr.setRequestHeader("X-CSRFToken", csrftoken);},
                success : function (data) {
                    if(!data.error) {
                        window.location = BASE_URL + '/workbooks/' + data.workbook_id + '/worksheets/' + data.worksheet_id + '/';
                    } else {
                        console.log('Failed to add gene_lists to workbook');
                    }
                },
                error: function () {
                    console.log('Failed to add gene_lists to workbook');
                }
            });
        }
    });

    // Clear all entered genes list on click
    $('#addToWorksheet').on('click', function (event) {
        //get the selected cohort
        var gene_lists = [];
        $('input[type="checkbox"]').each(function() {
            if ($(this).is(':checked') && $(this).val() != 'on') {
                gene_lists.push($(this).val());
            }
        });
        var workbook_id  = $('#workbook_id').val();
        var worksheet_id = $('#worksheet_id').val();

        if(gene_lists.length > 0){
            var csrftoken = $.getCookie('csrftoken');
            $.ajax({
                type        : 'POST',
                dataType    :'json',
                url         : BASE_URL + '/workbooks/' + workbook_id + '/worksheets/' + worksheet_id + "/genes/edit",
                data        : JSON.stringify({gene_fav_list : gene_lists}),
                beforeSend  : function(xhr){xhr.setRequestHeader("X-CSRFToken", csrftoken);},
                success : function (data) {
                    if(!data.error) {
                        window.location = BASE_URL + '/workbooks/' + workbook_id + '/worksheets/' + worksheet_id + '/';
                    } else {
                        console.log('Failed to add gene_lists to workbook');
                    }
                },
                error: function () {
                    console.log('Failed to add gene_lists to workbook');
                }
            });
        }
    });
});
