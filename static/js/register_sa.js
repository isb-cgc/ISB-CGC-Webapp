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

    $('input[name="select-datasets"]:radio').change(function() {
        if ($('input[name="select-datasets"]:checked').val() === 'yes' || $('input[name="select-datasets"]:checked').val() === 'alter') {
            $('#datasets-select-div').show();
            $('#register-sa input[name="select-datasets"][value="remove"]').remove();
        } else {
            $('input[name="datasets"]').attr('checked',false);
            $('#datasets-select-div').hide();
        }
    });

    $('#verify-sa div input').change(function() {
        $('.register-sa-btn').attr("disabled","disabled");
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

        $('.register-sa-div').hide();
        $('.verify-pending').show();

        $this.find('input[type="submit"]').prop('disabled', 'disabled');
        $.ajax({
            url: $this.attr('action'),
            data: fields,
            method: 'POST',
            success: function(data) {
                $('.summary_statement').empty()
                if (data['all_user_datasets_verified']) {
                   $('.summary_statement').append("The project, service account, and users were verified. The registration can proceed.")
                } else {
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
                    /*
                    var td = $('<td></td>');
                    td.append('<span><i class="fa fa-check"></i> All Open Datasets </span><br />');

                    for (var j = 0; j < member['datasets'].length; j++) {
                        var dataset = member['datasets'][j];
                        if (dataset['valid']) {
                            td.append('<span><i class="fa fa-check"></i> ' + dataset['name'] + '</span><br />');
                        } else {
                            td.append('<span title="User ' + email + ' does not have access to this dataset."><i class="fa fa-times"></i> ' + dataset['name'] + '</span><br />');
                        }
                    }

                    tr.append(td);
                    */
                    tbody.append(tr);
                }

                var dcf_analysis_reg_sas_div = $('.dcf_analysis_reg_sas');
                $('.registered_sa_statement').empty()
                $('.registered_sa_statement').append(data['dcf_messages']['dcf_analysis_reg_sas_summary']);

                var dcf_analysis_project_div = $('.dcf_analysis_project');
                $('.project_statement').empty()
                $('.project_statement').append(data['dcf_messages']['dcf_analysis_project_summary']);

                $('.membership_statement').empty()
                $('.membership_statement').append(data['dcf_messages']['dcf_analysis_project_members']);


                var dcf_analysis_sas_div = $('.dcf_analysis_sas');
                var dcf_analysis_sas = dcf_analysis_sas_div.find('tbody');
                var dcf_msg = data['dcf_messages']['dcf_analysis_sas'];
                dcf_analysis_sas.empty();
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
                    dcf_analysis_sas.append(tr);
                }

                var dcf_analysis_data_div = $('.dcf_analysis_data');
                $('.data_summary_statement').empty()
                $('.data_summary_statement').append(data['dcf_messages']['dcf_analysis_data_summary']);
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

                if($('input[name="select-datasets"][value="remove"]:checked').length > 0) {
                    var remove_all = $('input[value="remove"]').clone();
                    remove_all.attr("type","hidden");
                    register_form.append(remove_all[0]);
                }

                user_ver_div.show();
                dcf_analysis_reg_sas_div.show();
                dcf_analysis_project_div.show();
                dcf_analysis_sas_div.show();
                dcf_analysis_data_div.show();

                $this.find('input[type="submit"]').prop('disabled', '');

                $('.register-sa-div').hide();
                $('.cannot-register').hide();

                // If no datasets were requested, or, they were and verification came out clean, allow registration
                if(data['datasets'].length <= 0 || data['all_user_datasets_verified']) {
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

    $('.retry-btn').on('click', function(e) {
        $('.retry-btn').attr("disabled","disabled");
        var user_ver_div = $('.user-verification');
        var table_body = user_ver_div.find('tbody');

        var dcf_analysis_project_div = $('.dcf_analysis_project');

        var dcf_analysis_sas_div = $('.dcf_analysis_sas');
        var dcf_analysis_sas = dcf_analysis_sas_div.find('tbody');

        var dcf_analysis_data_div = $('.dcf_analysis_data');
        var dcf_analysis_data = dcf_analysis_data_div.find('tbody');

        dcf_analysis_project_div.hide();
        dcf_analysis_sas_div.hide();
        dcf_analysis_data_div.hide();

        $('.cannot-register').hide();
        $('.results_summary').hide();
        user_ver_div.hide();

        table_body.empty();
        dcf_analysis_sas.empty();
        dcf_analysis_data.empty();

        $('#verify-sa').submit();
    });

});