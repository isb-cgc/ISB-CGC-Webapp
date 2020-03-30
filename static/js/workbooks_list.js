require.config({
    baseUrl: STATIC_FILES_URL+'js/',
    paths: {
        jquery: 'libs/jquery-1.11.1.min',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        session_security: 'session_security/script',
        underscore: 'libs/underscore-min',
        base: 'base',
        text: 'libs/require-text'
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'session_security': ['jquery'],
        'underscore': {exports: '_'}
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

    // Resets forms in modals on cancel. Suppressed warning when leaving page with dirty forms
    $('.modal').on('hide.bs.modal', function () {
        var forms = $(this).find('form');
        if (forms.length)
            _.each(forms, function (form) {
                form.reset();
            });
    });

    /*
     * Ajax submitting forms
     */
    $('.ajax-form-modal').find('form').on('submit', function (e) {
        e.preventDefault();
        e.stopPropagation();

        var $this = $(this),
            fields = $this.serialize();

        $this.find('.btn').addClass('btn-disabled').attr('disabled', true);
        $.ajax({
            url: $this.attr('action'),
            data: fields,
            method: 'POST'
        }).then(function () {
            $this.closest('.modal').modal('hide');
            if ($this.data('redirect')) {
                window.location = $this.data('redirect');
            } else {
                window.location.reload();
            }
        }, function () {
            $this.find('.error-messages').append(
                $('<p>')
                    .addClass('alert alert-danger')
                    .text('There was an error deleting that study. Please reload and try again, or try again later.')
            );
        })
            .always(function () {
                $this.find('.btn').removeClass('btn-disabled').attr('disabled', false);
            });
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

    // change no of entries per page
    $('.panel-body').on('change', '.workbooks-per-page', function () {
        workbooks_per_page = parseInt($('#workbook-list').find('.workbooks-per-page :selected').val());
        goto_table_page(1);
    });

    function update_table_display()
    {
        var tab_selector = '#workbook-list';
        var total_workbooks = workbook_list.length;
        var total_pages = Math.ceil(total_workbooks / workbooks_per_page);

        //change another part at here
        if (total_workbooks <= 0) {
            $(tab_selector).find('.workbook-page-count').hide();
            $(tab_selector).find('.no-workbook-page-count').show();
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
            $(tab_selector).find('.workbook-page-count').show();
            $(tab_selector).find('.no-workbook-page-count').hide();
            $(tab_selector).find('.paginate_button_space').show();
            $(tab_selector).find('.dataTables_length').removeClass('disabled');
            $(tab_selector).find('.sortable_table th').removeClass('disabled');
            $(tab_selector).find('.dataTables_goto_page').removeClass('disabled');
            $(tab_selector).find('.dataTables_goto_page .goto-page-number').attr('max', total_pages);
            $(tab_selector).find('.total-workbook-count').html(total_workbooks);
            $(tab_selector).find('.paginate_button_space').html(html_page_button);
        }

        first_page_entry = ((page - 1) * workbooks_per_page) + 1;
        last_page_entry = Math.min(first_page_entry + workbooks_per_page - 1, workbook_list.length);

        if(workbook_list.length <= 0) {
            first_page_entry = 0;
            last_page_entry = 0;
        }
        else {
            for (i = 1; i <= workbook_list.length; ++i) {
                var workbook_index_id = "#workbook-index-" + i;
                if (i >= first_page_entry && i <= last_page_entry) {
                    $(workbook_index_id).show();
                } else {
                    $(workbook_index_id).hide();
                }
            }

            $(tab_selector).find('.showing').text(first_page_entry + " to " + last_page_entry);
        }

        $(tab_selector).find('.prev-page').removeClass('disabled');
        $(tab_selector).find('.next-page').removeClass('disabled');
        if (parseInt(page) == 1) {
            $(tab_selector).find('.prev-page').addClass('disabled');
        }
        if (parseInt(page) * workbooks_per_page >= total_workbooks) {
            $(tab_selector).find('.next-page').addClass('disabled');
        }
    };

    function goto_table_page(page_no){
        page=page_no;
        update_table_display();
    }

    $('.panel-body').on('click', '.goto-page-button', function () {
        var page_no_input = $(this).siblings('.goto-page-number').val();
        if (page_no_input == "")
            return;
        var page = parseInt(page_no_input);
        var max_page_no = parseInt($(this).siblings('.goto-page-number').attr('max'));
        if (page > 0 && page <= max_page_no) {
            goto_table_page(page);
            $(this).siblings('.goto-page-number').val("");
        } else {
            base.showJsMessage("warning",
                "Page number you have entered is invalid. Please enter a number between 1 and " + max_page_no, true);
            $('#placeholder').hide();
        }
    });

    $('.panel-body').on('click', '.paginate_button', function () {
        var this_tab = $(this).parents('.data-tab').data('file-type');
        var page_no;
        if ($(this).hasClass('next-page')) {
            page_no = parseInt(page) + 1;
        } else if ($(this).hasClass('prev-page')) {
            page_no = page_no == 1 ? 1 : page - 1;
        } else if ($(this).hasClass('numeric_button')) {
            if ($(this).hasClass('current'))
                return;
            page_no = $(this).text();
        } else {
            page_no = 1;
        }
        goto_table_page(page_no)
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
        for (var i in range) {
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