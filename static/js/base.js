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
        'jquery': ['//cdnjs.cloudflare.com/ajax/libs/jquery/3.5.1/jquery.min', 'libs/jquery-3.5.1.min.js'],
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        session_security: 'session_security/script',
        underscore: 'libs/underscore-min',
        assetscore: 'libs/assets.core',
        assetsresponsive: 'libs/assets.responsive',
        tablesorter:'libs/jquery.tablesorter.min'
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'session_security': ['jquery'],
        'assetscore': ['jquery', 'bootstrap', 'jqueryui'],
        'assetsresponsive': ['jquery', 'bootstrap', 'jqueryui'],
        'tablesorter': ['jquery'],
        'underscore': {exports: '_'}
    }
});

// Set up common JS UI actions which span most views
require([
    'jquery',
    'jqueryui',
    'bootstrap',
    'session_security',
    'underscore',
    'utils',
    'assetscore',
    'assetsresponsive',
    'tablesorter'
], function($, jqueryui, bootstrap, session_security, _, utils) {
    'use strict';

    A11y.Core();

    // Menu toggle

    $('#subnav').on('hide.bs.collapse', function () {
        $('#body').removeClass('menu-open');
    });
    $('#subnav').on('show.bs.collapse', function(){
        $('#body').addClass('menu-open');
    });

    $('.btn').click(function(event){
       var $ripple = $('<span class="btn__ripple"></span>');
        $ripple.appendTo(this).css({
           top: (event.offsetY - 12) + 'px',
           left: (event.offsetX - 12) + 'px'
        }).on('animationend webkitAnimationEnd oanimationend MSAnimationEnd', function(e){
            $(this).remove();
        });
        //return false;
    });
    // Radio button controls bootstrap collapse
    toggleRadio('upload');
    function toggleRadio(groupname){
        var radioButton =  $('.radio input[name=' + groupname + ']');
        radioButton.on('change', function(event){
            var collapseTarget = ($(this).data('target')) ? $(this).data('target') : $(this).href;
            var collpaseHide = $(radioButton.not(this)[0]).data('target');
            if($(this).is(':checked')){
                $(collapseTarget).collapse('show');
                $(collpaseHide).collapse('hide');
            }else{
                $(collapseTarget).collapse('hide');
            }
        })
    };

    $.getCookie = utils.getCookie;
    $.setCookie = utils.setCookie;
    $.removeCookie = utils.removeCookie;

    function csrfSafeMethod(method) {
        // these HTTP methods do not require CSRF protection
        return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
    };

    $.ajaxSetup({
        beforeSend: function(xhr, settings) {
            var csrftoken = $.getCookie('csrftoken');
            if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
                xhr.setRequestHeader("X-CSRFToken", csrftoken);
            }
        }
    });

    $.createMessage = function(message, messageType) {
        var message_obj = $('<div class="row">' +
                            '<div class="col-lg-12">' +
                            '<div class="alert alert-'+messageType+' alert-dismissible">' +
                            '<button type="button" class="close" data-dismiss="alert"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>'
                            + message + '</div></div></div>');
        message_obj.prependTo('main > .container');
    };

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

    $('#gene-list-table')
        .on('sortEnd', function()
        {
            update_table_display();
        })
        .tablesorter({
        headers: {
            0: {sorter:false},
            3: {sorter: 'fullDate'}
        },
        sortList: [[3,1]]
    });

    $('#var-list-table')
        .on('sortEnd', function()
        {
            update_table_display();
        })
        .tablesorter({
        headers: {
            0: {sorter:false},
            4: {sorter: 'fullDate'}
        },
        sortList: [[4,1]]
    });

    $('#workbook-table')
        .on('sortEnd', function()
        {
            update_table_display();
        })
        .tablesorter({
        headers: {
            0: {sorter:false},
            5: {sorter: 'fullDate'}
        },
        sortList: [[5,1]]
    });

    $('#cohort-table')
        .on('sortEnd', function()
        {
            update_table_display();
        })
        .tablesorter({
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

    $("#share-share_users").on("keypress", function(e) {
        // Suppress enter key to change line in share text boxes
        if ((e.keyCode == 10 || e.keyCode == 13)) {
            e.preventDefault()
        }
    });

    // ------ pagination -------

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
        items_per_page = parseInt($('.items-per-page :selected').val());
        goto_table_page(1);
    });

    function update_table_display()
    {
        var total_items = $('.page-item').length;
        if (total_items === 0)
            return;

        var total_pages = Math.ceil(total_items / items_per_page);

        //change another part at here
        if (total_items <= 0) {
            $('.item-page-count').hide();
            $('.no-item-page-count').show();
            $('.paginate_button_space').hide();
            $('.dataTables_length').addClass('disabled');
            $('.dataTables_goto_page').addClass('disabled');
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
            $('.item-page-count').show();
            $('.no-item-page-count').hide();
            $('.paginate_button_space').show();
            $('.dataTables_length').removeClass('disabled');
            $('.dataTables_goto_page').removeClass('disabled');
            $('.dataTables_goto_page .goto-page-number').attr('max', total_pages);
            $('.total-item-count').html(total_items);
            $('.paginate_button_space').html(html_page_button);
        }

        first_page_entry = ((page - 1) * items_per_page) + 1;
        last_page_entry = Math.min(first_page_entry + items_per_page - 1, total_items);

        if (total_items <= 0) {
            first_page_entry = 0;
            last_page_entry = 0;
        }
        else {
            $('.page-item').each(function(index)
            {
                index = index + 1;
                if (index >= first_page_entry && index <= last_page_entry) {
                    $(this).show();
                } else {
                    $(this).hide();
                }
            });

            $('.showing-page').text(first_page_entry + " to " + last_page_entry);
        }

        $('.prev-page').removeClass('disabled');
        $('.next-page').removeClass('disabled');
        if (parseInt(page) == 1) {
            $('.prev-page').addClass('disabled');
        }
        if (parseInt(page) * items_per_page >= total_items) {
            $('.next-page').addClass('disabled');
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
            utils.showJsMessage("warning",
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

    // Returns a list of page numbers to show pagination buttons
    // c is current page, m is total pages
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

    // ------ end pagination -------

    $(document).ready(function(){
        if(sessionStorage.getItem("reloadMsg")) {
            var msg = JSON.parse(sessionStorage.getItem("reloadMsg"));
            utils.showJsMessage(msg.type,msg.text,true);
        }
        sessionStorage.removeItem("reloadMsg");
    });

    function send_opt_in_update(opt_in_selection) {
        // Ajax call to update the backend of the user's selection
        var redirect_url = '';
        $.ajax({
            type: 'POST',
            url: BASE_URL + '/opt_in/update/',
            dataType  :'json',
            data: {'opt-in-selection': opt_in_selection},
            success: function(data) {
                redirect_url = data['redirect-url'];
                if (redirect_url)
                {
                    location.assign(redirect_url);
                }
            },
            error: function(e) {
                throw new Error( e );
            },
            complete: function () {
                if (!redirect_url || redirect_url === ''){
                    location.reload(true);
                }

            }
        });
    }

    // Code to handle opt-in dialog interaction
    $('#opt-in-yes-btn').on('click', function() {
        send_opt_in_update("yes");
    });

    $('#opt-in-no-btn').on('click', function() {
        send_opt_in_update("no");
    });

    $('#opt-in-ask-later-btn').on('click', function() {
        send_opt_in_update('ask_later');
    });

    // Per https://stackoverflow.com/questions/13550477/twitter-bootstrap-alert-message-close-and-open-again
    // Set up our own data-hide type to 'hide' our alerts instead of popping them off the DOM entirely
    $("[data-hide]").on("click", function(){
        $(this).closest("." + $(this).attr("data-hide")).hide();
    });

    if(user_is_auth) {
        var sessionSecurity = new yourlabs.SessionSecurity({
            pingUrl: pingUrl,
            warnAfter: warnAfter,
            expireAfter: expireAfter,
            confirmFormDiscard: confirmFormDiscard,
            returnToUrl: BASE_URL
        });
    }
});

// Return an object for consts/methods used by most views
define('base',['jquery', 'utils'], function($, utils) {

    return {
        blacklist: /<script>|<\/script>|!\[\]|!!\[\]|\[\]\[\".*\"\]|<iframe>|<\/iframe>/ig,
        barcode_file_whitelist: /[^A-Za-z0-9\-,\t_\."'\s\(\) \/;:]/g,
        // From http://www.regular-expressions.info/email.html
        email: /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
        showJsMessage: utils.showJsMessage,
        // Simple method for standardizing storage of a message into sessionStorage so it can be retrieved and reloaded
        // at document load time
        setReloadMsg: function(type,text) {
            sessionStorage.setItem("reloadMsg",JSON.stringify({type: type, text: text}));
        },
        setCookie: function(name,val,expires_in,path) {
            utils.setCookie(name,val,expires_in,path);
        },
        removeCookie: function(name, path) {
            utils.removeCookie(name, path);
        },
        gdcSchema: {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "project": {
                        "type": "object",
                        "properties": {
                            "project_id": {"type":"string"}
                        },
                        "required": ["project_id"]
                    },
                    "demographic": {
                        "type": "object",
                        "properties": {
                            "gender": {"enum": [
                                "female",
                                "male",
                                "unknown",
                                "unspecified",
                                "not reported"
                            ]},
                            "ethnicity": {"enum": [
                                "hispanic or latino",
                                "not hispanic or latino",
                                "Unknown",
                                "not reported",
                                "not allowed to collect"
                            ]},
                            "race": {"enum": [
                                "white",
                                "american indian or alaska native",
                                "black or african american",
                                "asian",
                                "native hawaiian or other pacific islander",
                                "other",
                                "Unknown",
                                "not reported",
                                "not allowed to collect"
                            ]}
                        }
                    },
                    "submitter_id": {"type":"string"}
                },
                "required": ["project","submitter_id"]
            }
        },
        blockResubmit: utils.blockResubmit
    };
});

