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

// require.config({
//     baseUrl: STATIC_FILES_URL+'js/',
//     paths: {
//         jquery: 'libs/jquery-1.11.1.min',
//         bootstrap: 'libs/bootstrap.min',
//         jqueryui: 'libs/jquery-ui.min',
//         session_security: 'session_security/script',
//         underscore: 'libs/underscore-min',
//     },
//     shim: {
//         'bootstrap': ['jquery'],
//         'session_security': ['jquery'],
//     }
// });

require([
    'jquery',
    'jqueryui',
    'bootstrap',
    'session_security',
    'base'
], function($, jqueryui, bootstrap, session_security, base) {

    // Resets forms in modals on cancel. Suppressed warning when leaving page with dirty forms
    $('.modal').on('hide.bs.modal', function() {
        var form = $(this).find('form')[0];
        if(form){
            form.reset();
        }
    });

    $('input[name="adjust-datasets"]:radio').change(function() {
        if ($('input[name="adjust-datasets"]:checked').val() === 'alter') {
            $('#datasets-adjust-div').show();
            $('#register-sa input[name="adjust-datasets"][value="remove"]').remove();
            $('.register-sa-div').hide();
            $('.register-sa-btn').attr("disabled","disabled");
        } else {
            $('input[name="datasets"]').attr('checked',false);
            hide_verification();
            $('#datasets-adjust-div').hide();
            $('.register-sa-div').show();
            $('.register-sa-btn').removeAttr("disabled");
        }
    });

    $('#verify-sa div input').change(function() {
        if ($('input[name="adjust-datasets"]').length) {
            if ($('input[name="adjust-datasets"]:checked').val() === 'alter') {
                $('.register-sa-div').hide();
                $('.register-sa-btn').attr("disabled","disabled");
            }
        }
        hide_verification();
    });

    $('#verify-sa').on('submit', function(e) {
        // #user-sa is only on the registration page, not on the adjustment page
        $('#user_sa').length > 0 && $('#user_sa').val($('#user_sa').val().trim());
        $('#js-messages').empty();
        $('#invalid-sa-id').hide();
        e.preventDefault();
        e.stopPropagation();

        // #user-sa is only on the registration page, not on the adjustment page
        if($('#user_sa').length > 0 && $('#user_sa').val().match(/[^A-Za-z0-9\-@\.]/g)) {
            $('#provided-sa-id').text($('#user_sa').val());
            $('#invalid-sa-id').show();
            return false;
        } else {
            $('#provided-sa-id').val('');
            $('#invalid-sa-id').hide();
        }

        var $this = $(this);
        var fields = $this.serialize();
        var user_ver_div = $('.user-verification');
        user_ver_div.hide();
        $('.results_summary').hide();
        $('.cannot-register').hide();
        $('.dcf_analysis_reg_sas').hide();
        $('.dcf_analysis_project').hide();
        $('.dcf_analysis_sas').hide();
        $('.dcf_analysis_data').hide();

        $('.have_verified_div').hide();
        $('.register-sa-div').hide();
        $('.verify-pending').show();

        $this.find('input[type="submit"]').prop('disabled', 'disabled');
        $.ajax({
            url: $this.attr('action'),
            data: fields,
            method: 'POST',
            success: function(data) {
                $('.summary_statement').empty();
                if (data['all_user_datasets_verified']) {
                    set_to_verification_success('.summary_statement', true);
                    $('.summary_statement').append("The project, service account, and users were verified. The registration can proceed.")
                } else {
                    set_to_verification_success('.summary_statement', false);
                    $('.summary_statement').append("Problems were found during verification. Please review the summary below.")
                }
                $('.results_summary').show();
                var tbody = user_ver_div.find('tbody');
                tbody.empty();
                $('.verify-pending').hide();
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

                /*
                ** Moving to DCF verification, we no longer enumerate the *Datasets* for each user,
                ** but we still enumerate the registration & linking status:
                */

                var roles = data['roles'];
                for (var email in roles) {
                    var member = roles[email];
                    var tr = $('<tr></tr>');
                    tr.append('<td>' + email + '</td>');
                    if (member['registered_user']) {
                        tr.append('<td><i class="fa fa-check"></i></td>');
                    } else {
                        tr.append('<td><i class="fa fa-times"></i></td>');
                    }
                    if (member['nih_registered']) {
                        tr.append('<td><i class="fa fa-check"></i></td>');
                    } else {
                        tr.append('<td><i class="fa fa-times"></i></td>');
                    }
                    tbody.append(tr);
                }

                if ('dcf_messages' in data) {
                    var dcf_analysis_reg_sas_div = $('.dcf_analysis_reg_sas');
                    $('.registered_sa_statement').empty();
                    $('.registered_sa_statement').append(data['dcf_messages']['dcf_analysis_reg_sas_summary']);
                    var dcf_analysis_reg_sas_summary_success = data['dcf_messages']['dcf_analysis_reg_sas_summary'].indexOf('meets all requirements') > -1;
                    set_to_verification_success('.registered_sa_statement', dcf_analysis_reg_sas_summary_success);

                    var dcf_analysis_project_div = $('.dcf_analysis_project');
                    $('.project_statement').empty();
                    $('.project_statement').append(data['dcf_messages']['dcf_analysis_project_summary']);
                    var dcf_analysis_project_summary_success =data['dcf_messages']['dcf_analysis_project_summary'].indexOf('meets all requirements') > -1;
                    set_to_verification_success('.project_statement', dcf_analysis_project_summary_success);

                    $('.membership_statement').empty();
                    $('.membership_statement').append(data['dcf_messages']['dcf_analysis_project_members']);
                    var dcf_analysis_project_members_success =data['dcf_messages']['dcf_analysis_project_members'].indexOf('meet requirements') > -1;
                    set_to_verification_success('.membership_statement', dcf_analysis_project_members_success);


                    var dcf_analysis_sas_div = $('.dcf_analysis_sas');
                    var dcf_analysis_sas = dcf_analysis_sas_div.find('tbody');
                    var dcf_msg = data['dcf_messages']['dcf_analysis_sas'];
                    dcf_analysis_sas.empty();
                    for (var key in dcf_msg) {
                        var tr = $('<tr></tr>');
                        var msg = dcf_msg[key];
                        tr.append('<td>' + msg['id'] + '</td>');
                        if (msg['ok']) {
                            tr.append('<td><i class="fa fa-check"></i></td>');
                        } else {
                            tr.append('<td><i class="fa fa-times"></i></td>');
                        }
                        tr.append('<td>' + msg['err'] + '</td>');
                        dcf_analysis_sas.append(tr);
                    }

                    var dcf_analysis_data_div = $('.dcf_analysis_data');
                    $('.data_summary_statement').empty();
                    $('.data_summary_statement').append(data['dcf_messages']['dcf_analysis_data_summary']);
                    var dcf_analysis_data_summary_success =data['dcf_messages']['dcf_analysis_data_summary'].indexOf('was approved') > -1;
                    set_to_verification_success('.data_summary_statement', dcf_analysis_data_summary_success);

                    var dcf_analysis_data = dcf_analysis_data_div.find('tbody');
                    var dcf_msg = data['dcf_messages']['dcf_analysis_data'];
                    dcf_analysis_data.empty();
                    for (var key in dcf_msg) {
                        var tr = $('<tr></tr>');
                        var msg = dcf_msg[key]
                        tr.append('<td>' + msg['id'] + '</td>');
                        if (msg['ok']) {
                            tr.append('<td><i class="fa fa-check"></i></td>');
                        } else {
                            tr.append('<td><i class="fa fa-times"></i></td>');
                        }
                        tr.append('<td>' + msg['err'] + '</td>');
                        dcf_analysis_data.append(tr);
                    }

                    dcf_analysis_reg_sas_div.show();
                    dcf_analysis_project_div.show();
                    dcf_analysis_sas_div.show();
                    dcf_analysis_data_div.show();
                }
                user_ver_div.show();

                $this.find('input[type="submit"]').prop('disabled', '');

                $('.have_verified_div').hide();
                $('.register-sa-div').hide();
                $('.cannot-register').hide();

                // If no datasets were requested, or, they were and verification came out clean, allow registration
                if(data['datasets'].length <= 0 || data['all_user_datasets_verified']) {
                    $('.have_verified_div').show();
                    $('.register-sa-div').show();
                    $('.register-sa-btn').removeAttr("disabled","disabled");
                } else {
                    $('.cannot-register').show();
                    $('.retry-btn').removeAttr("disabled");
                }
            },
            error: function (xhr) {
                var responseJSON = $.parseJSON(xhr.responseText);
                $('.verify-pending').hide();
                $('.verify-sa-btn').prop('disabled', '');
                // If we received a redirect, honor that
                if(responseJSON.redirect) {
                    base.setReloadMsg(responseJSON.level || "error",responseJSON.message);
                    // hide and reset the form
                    $('#verify-sa').hide();
                    $('#verify-sa')[0].reset();
                    window.location = responseJSON.redirect;
                } else {
                    base.showJsMessage(responseJSON.level || "error",responseJSON.message,true);
                }
            }
        });
        return false;
    });

    $('#register-sa').on('submit', function(e) {
        $('.register-sa-btn').attr("disabled","disabled");
        $('#verify-sa').hide();
        $('#verify-sa')[0].reset();
        $('.register-pending').show();
    });


    function hide_verification() {
        var user_ver_div = $('.user-verification');
        var table_body = user_ver_div.find('tbody');

        var dcf_analysis_project_div = $('.dcf_analysis_project');

        var dcf_analysis_sas_div = $('.dcf_analysis_sas');
        var dcf_analysis_sas = dcf_analysis_sas_div.find('tbody');

        var dcf_analysis_data_div = $('.dcf_analysis_data');
        var dcf_analysis_data = dcf_analysis_data_div.find('tbody');

        var dcf_analysis_reg_sas_div = $('.dcf_analysis_reg_sas');
        var have_verified_div = $('.have_verified_div');


        dcf_analysis_project_div.hide();
        dcf_analysis_sas_div.hide();
        dcf_analysis_data_div.hide();
        dcf_analysis_reg_sas_div.hide();
        have_verified_div.hide();

        var register_form = $('form#register-sa');
        var dataset_input = register_form.find('input[name="datasets"]');
        if (dataset_input.length > 0) {
            dataset_input.val([]);
        }

        $('.cannot-register').hide();
        $('.results_summary').hide();
        user_ver_div.hide();

        table_body.empty();
        dcf_analysis_sas.empty();
        dcf_analysis_data.empty();
    }

    function set_to_verification_success(selection, success){
        $(selection).removeClass('verification-success, verification-fail');
        $(selection).addClass('verification-'+(success? 'success':'fail'));
    }

    $('.retry-btn').on('click', function(e) {
        $('.retry-btn').attr("disabled","disabled");
        hide_verification();
        $('#verify-sa').submit();
    });

});