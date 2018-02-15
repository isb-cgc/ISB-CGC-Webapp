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
    }
});

require([
    'jquery',
    'jqueryui',
    'bootstrap',
    'session_security',
    'base'
], function($, jqueryui, bootstrap, session_security, base) {

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
        var $self = $(this);
        var user_id = $(this).data('user-id');
        var project_name = $(this).data('project-name');
        var project_id = $(this).data('project-id');

        $.ajax({
            url: BASE_URL + '/accounts/users/'+user_id+'/verify_gcp/',
            data: "gcp-id="+project_name + "&is_refresh=true",
            method: 'GET',
            success: function(data) {
                var roles = data['roles']
                for (var key in roles) {
                    var list = roles[key];
                    for (var item in list) {
                        if (list[item]['registered_user']) {
                            $('#refresh-project-'+project_id).append('<input type="hidden" name="register_users" value="' + list[item]['email'] + '"/>');
                        }
                    }
                }
            },
            error: function(err) {
                $($self.data('target')).modal('hide');
                base.showJsMessage('error',err.message,true);
            }
        });
    });

});