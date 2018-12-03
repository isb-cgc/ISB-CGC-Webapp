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
    baseUrl: STATIC_FILES_URL+'js/',
    paths: {
        jquery: 'libs/jquery-1.11.1.min',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        session_security: 'session_security',
        underscore: 'libs/underscore-min',
        base: 'base'
    },
    shim: {
        'bootstrap': ['jquery'],
        'session_security': ['jquery'],
        'assetscore': ['jquery']
    }
});

require([
    'jquery',
    'base',
    'jqueryui',
    'bootstrap',
    'session_security'
], function($,base) {

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

        $('#verify-gcp-id').val($('#verify-gcp-id').val().trim());

        if(!($('#verify-gcp-id').val().match(/^[a-z][a-z0-9]*$|^[a-z]([a-z0-9]*\-?(?=[a-z0-9]))*?[a-z0-9]+$/))) {
            $('#provided-gcp-id').text($('#verify-gcp-id').val());
            $('#invalid-gcp-id').show();
            return false;
        } else {
            $('#provided-gcp-id').val('');
            $('#invalid-gcp-id').hide();
        }

        var $this = $(this);
        var fields = $this.serialize();
        var submit_button = $this.find('input[type="submit"]');
        submit_button.prop('disabled', true);
        $.ajax({
            url: $this.attr('action'),
            data: fields,
            method: 'GET',
            success: function(data) {
                $('.user-list').empty();
                var gcp_id = data['gcp_id'];
                var roles = data['roles']
                for (var email in roles) {
                    var member = roles[email];
                    var user_item = $('<li>' + email + '</li>');
                    if (member['registered_user']) {
                        user_item.append('<i class="fa fa-check"></i>')
                        $('#register-gcp-form').append('<input type="hidden" name="register_users" value="' + email + '"/>');
                    }
                    $('.user-list').append(user_item);
                }
                $('#register-gcp-form').append('<input type="hidden" name="gcp_id" value="' + gcp_id + '"/>');
                $('#register-gcp-form').show();
                submit_button.prop('disabled', false);
                if(data['message']) {
                    $('#verify-info-text').text(data['message']);
                    $('.verify-info').show();
                } else {
                    $('.verify-info').hide();
                }
            },
            error: function (xhr) {
                var responseJSON = $.parseJSON(xhr.responseText);
                if(responseJSON.redirect) {
                    base.setReloadMsg(responseJSON.level || "error",responseJSON.message);
                    window.location = responseJSON.redirect;
                } else {
                    if(responseJSON.message) {
                        $('#verify-error-text').text(responseJSON.message);
                        $('#verify-error-base').hide();
                    } else {
                        $('#verify-error-text').hide();
                        $('#verify-error-base').show();
                    }
                    $('.verify-error').show();
                    $("html, body").animate({ scrollTop: 0 }, "slow");
                    submit_button.prop('disabled', false);
                }
            }
        });
        return false;
    });

    $('#register-gcp').on('submit', function(e) {
        $('#verify-gcp')[0].reset();
        $('.register-gcp-btn').attr("disabled","disabled");
    });

    $('form#register-bucket, form#register-bqdataset').on('submit', function(e) {
        $(this).find('input[type="submit"]').prop('disabled', true);
    });

    $('a.refresh-project').on('click',function(e){
        var this_modal = $($(this).data('target'));
        if(this_modal.data('opening')) {
            e.preventDefault();
            return false;
        }
        this_modal.data('opening',true);

        var project_gcp_id = $(this).data('project-gcp-id');
        var user_id = $(this).data('user-id');

        $.ajax({
            url: BASE_URL + '/accounts/users/'+user_id+'/verify_gcp/',
            data: "gcp-id="+project_gcp_id + "&is_refresh=true&detail=true",
            method: 'GET',
            success: function(data) {
                var roles = data['roles']
                for (var email in roles) {
                    var member = roles[email];
                    if (member['registered_user']) {
                        $('#refresh-project').append('<input type="hidden" name="register_users" value="' + email + '"/>');
                    }
                }
                this_modal.modal('show');
            },
            error: function (xhr) {
                var responseJSON = $.parseJSON(xhr.responseText);
                if(responseJSON.redirect) {
                    base.setReloadMsg(responseJSON.level || "error",responseJSON.message);
                    window.location = responseJSON.redirect;
                } else {
                    this_modal.modal('hide');
                    base.showJsMessage('error', responseJSON.message, true);
                }
            },
            complete: function() {
                this_modal.data('opening',false);
            }
        });
        // Don't let the modal open automatically; we're controlling that.
        e.preventDefault();
        return false;
    });

    $('#refresh-project-modal').on('hide.bs.modal',function(){
        $('#refresh-project input[name="register_users"]').remove();
    });

    $('div.instruction_button').on('click',function(){
        var is_instruction_vis = $(this).siblings('div.instructions').is(':visible')
        is_instruction_vis ? $(this).siblings('div.instructions').hide() : $(this).siblings('div.instructions').show();
        $(this).toggleClass('instructions_show', is_instruction_vis);
        $(this).toggleClass('instructions_hide', !is_instruction_vis);
    });

    $('.modal form').on('submit',function(){
        $(this).parents('.modal').find('input[type="submit"]').attr("disabled","disabled");
    });

});