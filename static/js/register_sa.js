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
    'session_security'
], function($, jqueryui, bootstrap, session_security) {

    // Resets forms in modals on cancel. Suppressed warning when leaving page with dirty forms
    $('.modal').on('hide.bs.modal', function() {
        var form = $(this).find('form')[0];
        if(form){
            form.reset();
        }
    });

    $('input[name="select-datasets"]:radio').change(function() {
        if ($('input[name="select-datasets"]:checked').val() === 'yes') {
            $('#datasets-select-div').show();
        } else {
            $('#datasets-select-div').hide();
            $('#datasets-select-div select option:selected').removeAttr('selected');
        }
    });

    $('#verify-sa').on('submit', function(e) {
        e.preventDefault();
        e.stopPropagation();

        var $this = $(this);
        var fields = $this.serialize();
        var user_ver_div = $('.user-verification');
        var spinner = $this.parent('li').find('.load-spinner');
        spinner.show();

        $this.find('input[type="submit"]').prop('disabled', 'disabled');
        $.ajax({
            url: $this.attr('action'),
            data: fields,
            method: 'POST',
            success: function(data) {
                console.log(data);
                var tbody = user_ver_div.find('tbody');
                tbody.empty();
                spinner.hide();

                var register_form = $('form#register-sa');
                var user_input = register_form.find('input[name="user_sa"]');
                var dataset_input = register_form.find('input[name="datasets"]');
                if (user_input.length === 0) {
                    register_form.append('<input type="hidden" name="user_sa" value="' + data['user_sa'] + '"/>');
                } else {
                    user_input.val(data['user_sa']);
                }
                if (dataset_input.length === 0) {
                    register_form.append('<input type="hidden" name="datasets" value="' + data['datasets'] + '"/>');
                } else {
                    dataset_input.val(data['datasets']);
                }

                var roles = data['roles'];
                for (var role in roles) {
                    var memberlist = roles[role];
                    for (var i in memberlist) {
                        var tr = $('<tr></tr>');
                        tr.append('<td>' + memberlist[i]['email'] + '</td>');
                        if (memberlist[i]['registered_user']) {
                            tr.append('<td><i class="fa fa-check"></i></td>');
                        } else {
                            tr.append('<td><i class="fa fa-times"></i></td>');
                        }
                        if (memberlist[i]['nih_registered']) {
                            tr.append('<td><i class="fa fa-check"></i></td>');
                        } else {
                            tr.append('<td><i class="fa fa-times"></i></td>');
                        }
                        for(var j=0;j<memberlist[i]['datasets'].length;j++){
                            var td = $('<td></td>');
                            var dataset = memberlist[i]['datasets'][j];
                            if (dataset['valid']) {
                                td.append('<i class="fa fa-check"></i> ');
                            } else {
                                td.append('<i class="fa fa-times"></i> ');
                            }
                            td.append(dataset['name']+'<br />')
                        }
                        tbody.append(tr);
                    }
                }

                user_ver_div.show();
                $this.find('input[type="submit"]').prop('disabled', '');

                $('.register-sa-div').hide();
                $('.cannot-register').hide();

                if (data['user_dataset_verified']) {
                    $('.register-sa-div').show();
                } else {
                    $('.cannot-register').show();
                }
            },
            error: function(xhr, ajaxOptions, thrownError) {
                var response = $.parseJSON(xhr.responseText);
                spinner.hide();
                $('.verify-sa-btn').prop('disabled', '');
                $('#invalid-sa-error').append('<div class="alert alert-error alert-dismissible">' +
                    '<button type="button" class="close" data-dismiss="alert"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>'
                        + response['message'] + '</div>'
                );
            }
        });
        return false;
    });

    $('#register-sa').on('submit', function(e) {
        $('#verify-sa')[0].reset();
    });

    $('.retry-btn').on('click', function(e) {
        var user_ver_div = $('.user-verification');
        var table_body = user_ver_div.find('tbody');

        $('.cannot-register').hide();
        user_ver_div.hide();
        table_body.empty();
        $('#verify-sa').submit();
    });

});