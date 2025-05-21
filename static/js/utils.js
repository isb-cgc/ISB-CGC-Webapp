/**
 *
 * Copyright 2020-2025, Institute for Systems Biology
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
        jquery: 'libs/jquery-3.7.1.min',
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

    // Simple method for displaying an alert-<type> message at a given selector or DOM element location.
    //
    // type: One of the accepted alert types (danger, error, info, warning)
    // text: Content of the message
    // withEmpty: Truthy boolean for indicating if the element represented by rootSelector should first be emptied
    // rootSelector: text selector or DOM element which will be the parent of the alert; defaults to #js-messages
    //  (the DIV present on all pages which shows document-level JS messages)
    function _showJsMessage(type,text,withEmpty,rootSelector, add_classes) {
        rootSelector = rootSelector || '#js-messages';
        withEmpty && $(rootSelector).empty();
        var msg = "";
        if (text instanceof Array) {
            for (var i = 0; i < text.length; i++) {
                msg += text[i] + '<br />';
            }
        } else {
            msg = text;
        }
        let uuid = crypto.randomUUID();
        if(add_classes) {
            uuid = `${uuid} ${add_classes}`;
        }
        $(rootSelector).append(
            $('<div>')
                .addClass(`alert alert-${type} alert-dismissible ${uuid}`)
                .html(msg)
                .prepend(
                    '<button type="button" class="close" data-dismiss="alert"><span aria-hidden="true">'
                    + '&times;</span><span class="sr-only">Close</span></button>'
                )
        );
        return uuid;
    };

    const MAX_ELAPSED = 240000;
    function _checkManifestReady(file_name, check_start) {
        if(!check_start) {
            check_start = Date.now();
        }
        let check_now = Date.now();
        let elapsed_millis = check_now-check_start;
        if((elapsed_millis) > MAX_ELAPSED) {
            _showJsMessage("error",
                "There was an error generating your manifest. Please contact the administrator."
                , true);
            sessionStorage.removeItem("user-manifest");
            return;
        }
        $.ajax({
            url: CHECK_MANIFEST_URL + file_name,
            method: 'GET',
            success: function (data) {
                if(data.manifest_ready) {
                    let fetch_manifest_url = FETCH_MANIFEST_URL + file_name;
                    let export_manifest = $('#export-manifest');
                    _showJsMessage("warning",
                        "Your manifest is ready for download! " +
                        '<a class="btn btn-special manifest-download-link" href="'+fetch_manifest_url+'" role="button">Download Manifest</a>'
                        , true, null,'manifest-download-box');
                    export_manifest.removeAttr('data-pending-manifest');
                    if(!export_manifest.attr('data-no-filters')) {
                        export_manifest.removeAttr('disabled');
                        export_manifest.attr('title','Export these search results as a manifest for downloading.');
                    } else {
                        export_manifest.attr("title","Select a filter to enable this feature.");
                    }
                } else {
                    setTimeout(_checkManifestReady, 15000, file_name, check_start);
                }
            },
            error: function (xhr) {
                var responseJSON = $.parseJSON(xhr.responseText);
                // If we received a redirect, honor that
                if(responseJSON.redirect) {
                    base.setReloadMsg(responseJSON.level || "error",responseJSON.message);
                    window.location = responseJSON.redirect;
                } else {
                    _showJsMessage(responseJSON.level || "error",responseJSON.message,true);
                }
            }
        });
    };

    function _checkForManifest() {
        let pending_manifest_request = sessionStorage.getItem("user-manifest");
        let export_manifest = $('#export-manifest');
        if(pending_manifest_request) {
            export_manifest.attr('disabled','disabled');
            export_manifest.attr('data-pending-manifest', 'true');
            export_manifest.attr('title','A manifest is currently being built.');
            _showJsMessage("info",
                "Your manifest is being prepared. Once it is ready, this space will make it available for download. <i class=\"fa-solid fa-arrows-rotate fa-spin\"></i>"
                ,true);
            _checkManifestReady(pending_manifest_request);
        }
    };

    return {
        showJsMessage: _showJsMessage,
        // Block re-requests of requests which can't be handled via AJAX (eg. file downloads)
        // Uses cookie polling
        // Request provides a parameter with a key of expectedCookie and a value of downloadToken
        // Handling view on server side must set a cookie of key expectedCookie to the downloadToken value
        // in its response
        blockResubmit: function(callback,downloadToken,expectedCookie) {
            downloadTimer = window.setInterval( function() {
                var token = _getCookie(expectedCookie);
                if((token === downloadToken) || (attempts === 0)) {
                    unblockSubmit(callback,expectedCookie);
                }
                attempts--;
            }, 1000 );
        },
        setCookie: _setCookie,
        getCookie: _getCookie,
        removeCookie: _removeCookie,
        checkManifestReady: _checkManifestReady,
        checkForManifest: _checkForManifest
    };
});
