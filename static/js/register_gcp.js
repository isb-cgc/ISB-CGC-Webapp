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
        underscore: 'libs/underscore-min'
    },
    shim: {
        'bootstrap': ['jquery'],
        'session_security': ['jquery'],
        'assetscore': ['jquery']
    }
});

require([
    'jquery',
    'jqueryui',
    'bootstrap',
    'session_security'
], function($) {

    // Resets forms in modals on cancel. Suppressed warning when leaving page with dirty forms
    $('.modal').on('hide.bs.modal', function() {
        var form = $(this).find('form')[0];
        if(form){
            form.reset();
        }
    });

    $('#verify-gcp').on('submit', function(e) {
        e.preventDefault();
        e.stopPropagation();

        var $this = $(this);
        var fields = $this.serialize();
        var submit_button = $this.find('input[type="submit"]');
        submit_button.prop('disabled', true);
        $.ajax({
            url: $this.attr('action'),
            data: fields,
            method: 'GET',
            success: function(data) {
                // console.log(data);
                $('.user-list').empty();
                var gcp_id = data['gcp_id'];
                var roles = data['roles']
                for (var key in roles) {
                    var list = roles[key];
                    for (var item in list) {
                        var user_item = $('<li>' + list[item]['email'] + '</li>');
                        if (list[item]['registered_user']) {
                            user_item.append('<i class="fa fa-check"></i>')
                            $('#register-gcp-form').append('<input type="hidden" name="register_users" value="' + list[item]['email'] + '"/>');
                        }
                        $('.user-list').append(user_item);
                    }
                }
                $('#register-gcp-form').append('<input type="hidden" name="gcp_id" value="' + gcp_id + '"/>');
                $('#register-gcp-form').show();
                submit_button.prop('disabled', false);
            },
            error: function(xhr, ajaxOptions, thrownError) {
                $('.verify-error').show();
                $("html, body").animate({ scrollTop: 0 }, "slow");
                submit_button.prop('disabled', false);
            }
        });
        return false;
    });

    $('#register-gcp').on('submit', function(e) {
        $('#verify-gcp')[0].reset();
    });
});