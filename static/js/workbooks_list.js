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
], function($, jqueryui, bootstrap, session_security, _, base) {
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
    $('.panel-body').on('change', '.items-per-page', function () {
        items_per_page = parseInt($('#workbook-list').find('.items-per-page :selected').val());
        goto_table_page(1);
    });

    function update_table_display()
    {
        var tab_selector = '#workbook-list';
        var total_items = workbook_list.length;
        var total_pages = Math.ceil(total_items / items_per_page);

        //change another part at here
        if (total_items <= 0) {
            $(tab_selector).find('.item-page-count').hide();
            $(tab_selector).find('.no-item-page-count').show();
            $(tab_selector).find('.paginate_button_space').hide();
            $(tab_selector).find('.dataTables_length').addClass('disabled');
            $(tab_selector).find('.sortable_table th').addClass('disabled');
            $(tab_selector).find('.dataTables_goto_page').addClass('disabled');
        }
        else {
            var page_list = base.pagination(page, total_pages);
            var html_page_button = "";
            for(var i in page_list){
                if(page_list[i] === "..."){
                    html_page_button += "<span class='\ellipsis\'>...</span>"
                }
                else{
                    html_page_button += "<a class=\'dataTables_button paginate_button numeric_button"+ (page_list[i] == page ? " current\'":"\'") +">" + page_list[i] + "</a>";
                }
            }
            $(tab_selector).find('.item-page-count').show();
            $(tab_selector).find('.no-item-page-count').hide();
            $(tab_selector).find('.paginate_button_space').show();
            $(tab_selector).find('.dataTables_length').removeClass('disabled');
            $(tab_selector).find('.sortable_table th').removeClass('disabled');
            $(tab_selector).find('.dataTables_goto_page').removeClass('disabled');
            $(tab_selector).find('.dataTables_goto_page .goto-page-number').attr('max', total_pages);
            $(tab_selector).find('.total-item-count').html(total_items);
            $(tab_selector).find('.paginate_button_space').html(html_page_button);
        }

        first_page_entry = ((page - 1) * items_per_page) + 1;
        last_page_entry = Math.min(first_page_entry + items_per_page - 1, total_items);

        if(total_items <= 0) {
            first_page_entry = 0;
            last_page_entry = 0;
        }
        else {
            for (i = 1; i <= total_items; ++i) {
                var item_index_id = "#item-index-" + i;
                if (i >= first_page_entry && i <= last_page_entry) {
                    $(item_index_id).show();
                } else {
                    $(item_index_id).hide();
                }
            }

            $(tab_selector).find('.showing').text(first_page_entry + " to " + last_page_entry);
        }

        $(tab_selector).find('.prev-page').removeClass('disabled');
        $(tab_selector).find('.next-page').removeClass('disabled');
        if (parseInt(page) == 1) {
            $(tab_selector).find('.prev-page').addClass('disabled');
        }
        if (parseInt(page) * items_per_page >= total_items) {
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
});