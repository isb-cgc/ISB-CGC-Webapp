/**
 *
 * Copyright 2020, Institute for Systems Biology
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

// Common utilities which are pulled into base.js (and used there)

require.config({
    baseUrl: STATIC_FILES_URL+'js/',
    paths: {
        jquery: 'libs/jquery-3.5.1',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        underscore: 'libs/underscore-min',
        assetscore: 'libs/assets.core',
        assetsresponsive: 'libs/assets.responsive',
        tablesorter:'libs/jquery.tablesorter.min'
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'assetscore': ['jquery', 'bootstrap', 'jqueryui'],
        'assetsresponsive': ['jquery', 'bootstrap', 'jqueryui'],
        'tablesorter': ['jquery'],
        'underscore': {exports: '_'}
    }
});

// Return an object for consts/methods used by most views
define(['jquery'], function($) {

    // Download block poll with cookie via StackOverflow:
    // https://stackoverflow.com/questions/1106377/detect-when-browser-receives-file-download
    var downloadTimer;
    var attempts = 30;

    // Adapted from https://docs.djangoproject.com/en/1.9/ref/csrf/
    function _getCookie(name) {
        var cookieValue = null;
        if (document.cookie && document.cookie != '') {
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
                var cookie = $.trim(cookies[i]);
                // Does this cookie string begin with the name we want?
                if (cookie.substring(0, name.length + 1) == (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    };

    function _removeCookie(name, path) {
        path = path || "/";
        var now = new Date();
        var time = now.getTime();
        var expireTime = time-(300*1000);
        now.setTime(expireTime);
        document.cookie=encodeURIComponent(name)+"=; expires="+new Date(0).toUTCString()+"; path="+path+";";
    };

    function _setCookie(name,val,path,expires_in) {
        var now = new Date();
        var time = now.getTime();
        expires_in = expires_in || (300*1000);
        path = path || '/';
        var expireTime = time+expires_in;
        now.setTime(expireTime);
        document.cookie=encodeURIComponent(name)+"="+val+"; expires="+now.toUTCString()+"; path="+path+";";
    };

    // Set the cookie to expire Forever Ago so it dies immediately
    // Optional path parameter for path-specific cookies
    function _expireCookie(name,path) {
        path = path || "/";
        document.cookie = encodeURIComponent(name) + "=deleted; Path="+path+"; expires=" + new Date(0).toUTCString();
    };

    // Clear and reset the cookie-poll and fire the provided callback
    // Callback can be used on a given page to unblock any DOM-based impediments
    function unblockSubmit(callback,cookieName) {
        window.clearInterval(downloadTimer);
        _expireCookie(cookieName);
        attempts = 30;
        callback();
    };

    return {
        // Simple method for displaying an alert-<type> message at a given selector or DOM element location.
        //
        // type: One of the accepted alert types (danger, error, info, warning)
        // text: Content of the message
        // withEmpty: Truthy boolean for indicating if the element represented by rootSelector should first be emptied
        // rootSelector: text selector or DOM element which will be the parent of the alert; defaults to #js-messages
        //  (the DIV present on all pages which shows document-level JS messages)
        showJsMessage: function(type,text,withEmpty,rootSelector) {
            rootSelector = rootSelector || '#js-messages';
            withEmpty && $(rootSelector).empty();
            var msg = "";
            if(text instanceof Array){
                for(var i=0; i<text.length; i++) {
                    msg += text[i] + '<br />';
                }
            } else {
                msg = text;
            }
            let uuid = crypto.randomUUID();
            $(rootSelector).append(
                $('<div>')
                    .addClass('alert alert-'+type +' alert-dismissible '+uuid)
                    .html(msg)
                    .prepend(
                        '<button type="button" class="close" data-dismiss="alert"><span aria-hidden="true">'
                        +'&times;</span><span class="sr-only">Close</span></button>'
                    )
            );
            return uuid;
        },
        // Block re-requests of requests which can't be handled via AJAX (eg. file downloads)
        // Uses cookie polling
        // Request provides a parameter with a key of expectedCookie and a value of downloadToken
        // Handling view on server side must set a cookie of key expectedCookie to the downloadToken value
        // in its response
        blockResubmit: function(callback,downloadToken,expectedCookie) {
            downloadTimer = window.setInterval( function() {
                var token = _getCookie(expectedCookie);
                if((token == downloadToken) || (attempts == 0)) {
                    unblockSubmit(callback,expectedCookie);
                }
                attempts--;
            }, 1000 );
        },
        setCookie: _setCookie,
        getCookie: _getCookie,
        removeCookie: _removeCookie
    };
});