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
        jquery: 'libs/jquery-1.11.1.min',
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

    $('#gene-list-table').tablesorter({
        headers: {
            0: {sorter:false},
            3: {sorter: 'fullDate'}
        },
        sortList: [[3,1]]
    });

    $('#var-list-table').tablesorter({
        headers: {
            0: {sorter:false},
            4: {sorter: 'fullDate'}
        },
        sortList: [[4,1]]
    });

    $('#workbook-table').tablesorter({
        headers: {
            0: {sorter:false},
            5: {sorter: 'fullDate'}
        },
        sortList: [[5,1]]
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
            data: {'opt-in-radio': opt_in_selection},
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
    $('#submit-opt-in-btn').on('click', function() {
        var opt_in_radio_value = $('input[name="opt-in-radio"]:checked').val();
        send_opt_in_update(opt_in_radio_value);
        // location.reload(true);
    });

    $('#cancel-opt-in-btn, #close-opt-in-btn').on('click', function() {
        send_opt_in_update('dismiss');
    });

    $('#will-email-message').collapse({toggle: false});
    $('[name="opt-in-radio"]').on('change', function() {
        if ($(this).val() === "opt-in-email") {
            $('#will-email-message').collapse('show');
        } else {
            $('#will-email-message').collapse('hide');
        }
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
define(['jquery', 'utils'], function($, utils) {

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

