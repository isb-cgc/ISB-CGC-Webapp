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
        jquery: 'libs/jquery-3.7.1.min',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        underscore: 'libs/underscore-min',
        base: 'base'
    },
    shim: {
        'bootstrap': ['jquery']
    }
});

require([
    'jquery',
    'jqueryui',
    'bootstrap',
    'base'
], function($, jqueryui, bootstrap, base) {

    $('.show-service-accounts').on('click', function () {
        var $this = $(this);
        var target = $this.data('target');
        if ($('.' + target).is(':visible')) {
            $this.find('i').removeClass('fa-caret-down');
            $this.find('i').addClass('fa-caret-right');
            $('.' +target).slideUp();
        } else {
            $this.find('i').removeClass('fa-caret-right');
            $this.find('i').addClass('fa-caret-down');
            $('.' +target).show('slow');
        }
    });

    $('.btn-group button').on('click', function() {
        $(this).toggleClass('active');
        $('input[name="credits"]').prop('value', $(this).val());
        $(this).siblings().each(function() {
            $(this).removeClass('active');
        })

    });

    $('[id^="refresh-project-modal-"]').on('hide.bs.modal',function(){
        $('form[id^="refresh-project-"] input[name="register_users"]').remove();
    });

    $('a.refresh-project').on('click',function(e){
        var this_modal = $($(this).data('target'));
        if(this_modal.data('opening')) {
            e.preventDefault();
            return false;
        }
        this_modal.data('opening',true);

        var project_id = $(this).data('project-id');
        var user_id = $(this).data('user-id');
        var project_gcp_id = $(this).data('project-gcp-id');

        $.ajax({
            url: BASE_URL + '/accounts/users/'+user_id+'/verify_gcp/',
            data: "gcp-id="+project_gcp_id + "&is_refresh=true",
            method: 'GET',
            success: function(data) {
                var roles = data['roles']
                for (var email in roles) {
                    if (roles[email]['registered_user']) {
                        $('#refresh-project-'+project_id).append('<input type="hidden" name="register_users" value="' + email + '"/>');
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

    $('.modal form').on('submit',function(){
        $(this).find('input[type="submit"]').attr("disabled","disabled");
    });

});