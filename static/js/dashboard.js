require.config({
    baseUrl: STATIC_FILES_URL + 'js/',
    paths: {
        jquery: 'libs/jquery-1.11.1.min',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        session_security: 'session_security',
        underscore: 'libs/underscore-min',
        tablesorter: 'libs/jquery.tablesorter.min',
        base: 'base'
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'session_security': ['jquery'],
        'assetscore': ['jquery', 'bootstrap', 'jqueryui'],
        'assetsresponsive': ['jquery', 'bootstrap', 'jqueryui'],
        'tablesorter': ['jquery'],
        'base': ['jquery'],
    }
});

require([
    'jquery',
    'base',
    'jqueryui',
    'bootstrap',
    'session_security',
    'tablesorter'
], function ($, base) {

    // Resets forms in modals on cancel. Suppressed warning when leaving page with dirty forms
    $('.modal').on('hide.bs.modal', function () {
        $(this).find('form')[0].reset();
    });

    $('#more-analysis').on('show.bs.collapse', function () {
        $('a[data-target="#more-analysis"]').text('Show Less');
    }).on('hide.bs.collapse', function () {
        $('a[data-target="#more-analysis"]').text('Show More');
    });

    $('#create-workbook').on('submit', function () {
        $(this).find('button[type="submit"]').attr('disabled', 'disabled');
    });

    $('.min-max a').on('click', function () {
        $(this).find('i').toggleClass('fa-angle-double-up');
        $(this).find('i').toggleClass('fa-angle-double-down');
    });

    $(window).on('beforeunload', function () {
        var settingsObj = {};
        $('.panel-collapse').each(function (index, elem) {
            settingsObj[$(elem).attr('id')] = $(elem).attr('aria-expanded');
        });
        sessionStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(settingsObj));
    });

    if (sessionStorage.getItem(USER_SETTINGS_KEY)) {
        var settingsObj = JSON.parse(sessionStorage.getItem(USER_SETTINGS_KEY));

        for (var i in settingsObj) {
            if (settingsObj.hasOwnProperty(i)) {
                var expanded = settingsObj[i];
                var elem = $('#' + i);
                if (elem.attr('aria-expanded') !== expanded) {
                    elem.attr('aria-expanded', expanded);
                    elem.toggleClass('in');
                    elem.siblings('.panel-heading').find('i').toggleClass('fa-angle-double-up');
                    elem.siblings('.panel-heading').find('i').toggleClass('fa-angle-double-down');
                }
            }
        }
    }

    var get_vm_instance = function (vm_div) {
        var vm_user = $(vm_div).find("input[name='vm_user']").val();
        var vm_project_id = $(vm_div).find("input[name='vm_project_id']").val();
        var vm_name = $(vm_div).find("input[name='vm_name']").val();
        var vm_zone = $(vm_div).find("input[name='vm_zone']").val();
        var client_ip_range = $(vm_div).find("input[name='client_ip_range']").val();
        var serv_port = $(vm_div).find("input[name='serv_port']").val();
        var password = $(vm_div).find("input[name='password']").val();
        var vm_instance = {
            'user': vm_user,
            'project_id': vm_project_id,
            'name': vm_name,
            'zone': vm_zone,
            'client_ip_range': client_ip_range,
            'serv_port': serv_port,
            'password': password
        };
        return vm_instance;
    };

    var open_https_browser = function (ip_address, port) {
        var url = "https://" + ip_address + ":" + port;
        window.open(url);
    };

    var command_vm = function (command, vm_div) {
        var vm_spinner = $(vm_div).find(".vm-spinner");
        var vm_stat = $(vm_div).find(".vm-stat");
        var vm_msg = $(vm_div).find(".vm-msg");
        var vm_btn = $(vm_div).find(".vm-btn");

        vm_spinner.show();

        var action;
        switch (command) {
            case 'create_vm':
                action = 'Creating Instance';
                break;
            case 'delete_vm':
                action = 'Deleting Instance';
                break;
            case 'start_vm':
                action = 'Starting Instance';
                break;
            case 'stop_vm':
                action = 'Stopping Instance';
                break;
        }
        vm_stat.html(action);
        vm_btn.prop("disabled", true);
        vm_msg.html('');
        var vm_instance = get_vm_instance(vm_div);
        var csrftoken = $.getCookie('csrftoken');
        $.ajax({
            type: 'POST',
            dataType: 'json',
            url: BASE_URL + '/notebooks/' + command,
            data: JSON.stringify(vm_instance),
            beforeSend: function (xhr) {
                xhr.setRequestHeader("X-CSRFToken", csrftoken);
            },
            success: function (data) {
                if (data['resp_code'] == 200 && (command == 'create_vm' || command == 'delete_vm')) {
                    window.location.reload(true);
                }
                else if (command == 'run_browser') {
                    var external_ip = data['external_ip'];
                    // var serv_port = data['serv_port'];
                    open_https_browser(external_ip, vm_instance['serv_port']);
                    // var url = "https://"+external_ip+":5000";
                    // window.open(url);
                    // update_vm_stat(vm_div);
                }
                else {
                    vm_msg.html(data['message']);
                    // update_vm_stat(vm_div);
                }
            },
            error: function (e) {
                vm_msg.html('[Error]: ' + e);
            },
            complete: function () {
                // if(command != 'create_vm' && command != 'delete_vm'){
                update_vm_stat(vm_div);
                // }
                // else{
                //     //clear password input
                $(vm_div).find("input[name='password']").val('');
                // }
            }
        });
    };

    var vm_input_complete = function () {
        return false;
    };

    $('.vm-btn').on('click', function (e) {
        var command = $(this).val();
        var vm_div = $(this).parents(".vm-div");

        // console.log('command: '+command);
        var no_repeat = $('#delete-vm-modal').find("input[name='vm_delete_confirm']").val();
        switch (command) {
            case 'create_vm':
                var password = $(vm_div).find("input[name='password']").val();
                if (!password) {
                    $('#create-jnb-modal').modal('show');
                    $('#create-jnb-modal').find('#messageBlock').html('');
                    return;
                }
                break;
            case 'delete_vm':
                if (!no_repeat) {
                    $('#delete-vm-modal').modal('show');
                    return;
                }
                break;
            // case 'run_browser':
            //     var external_ip =
            //     if(external_ip){
            //         open_https_browser(external_ip, port_no);
            //         return;
            //     }
            //     break;

        }
        command_vm(command, vm_div);

        // if(command == 'create_vm' && !password){
        //     // $('#create-jnb-modal').
        //     $('#create-jnb-modal').modal('show');
        //     $('#create-jnb-modal').find('#messageBlock').html('');
        // }
        // else if(command == 'delete_vm' && !no_repeat){
        //     $('#delete-vm-modal').modal('show');
        // }
        // else{
        //     command_vm(command, vm_div);
        // }
    });

    var update_vm_stat = function (vm_div) {
        var vm_instance = get_vm_instance(vm_div);
        var vm_stat = $(vm_div).find(".vm-stat");
        var vm_msg = $(vm_div).find(".vm-msg");
        var vm_btn = $(vm_div).find(".vm-btn");
        var vm_spinner = $(vm_div).find(".vm-spinner");
        var csrftoken = $.getCookie('csrftoken');

        vm_spinner.show();
        vm_btn.prop("disabled", true);
        $.ajax({
            type: 'POST',
            dataType: 'json',
            url: BASE_URL + '/notebooks/check_vm',
            data: JSON.stringify(vm_instance),
            beforeSend: function (xhr) {
                xhr.setRequestHeader("X-CSRFToken", csrftoken);
            },
            success: function (data) {
                var status = data['status'];
                var vm_create_btn = $(vm_div).find(".vm-create-btn");
                var vm_stop_btn = $(vm_div).find(".vm-stop-btn");
                var vm_start_btn = $(vm_div).find(".vm-start-btn");
                var vm_delete_btn = $(vm_div).find(".vm-delete-btn");
                var vm_run_browser_btn = $(vm_div).find(".vm-run-browser-btn");

                vm_stat.html(status);
                vm_btn.hide();
                if (status == 'RUNNING') {
                    vm_stop_btn.show();
                    vm_delete_btn.show();
                    vm_run_browser_btn.show();
                }
                else if (status == 'NOT FOUND') {
                    vm_create_btn.show();
                }
                else {
                    vm_start_btn.show();
                    vm_delete_btn.show();
                }
            },
            error: function (e) {
                console.log('error: ' + e);
                vm_msg.html('[Error]: ' + e);
            },
            complete: function () {
                vm_spinner.hide();
                vm_btn.prop("disabled", false);
            }
        });
    };


    $('#delete-vm-conf-btn').click(function (e) {
        e.preventDefault();
        $("#delete-vm-modal input[name='vm_delete_confirm']").val(true);
        $('#notebook-panel .vm-div .vm-delete-btn').trigger('click');
        $('#delete-vm-modal').modal('hide');
    });


    $('#create-vm-submit-btn').click(function (e) {
        var vm_div = $('#notebook-panel .vm-div');
        e.preventDefault();
        var msg = "";
        var create_jnb_form = $(this).parents('.create-jnb-form');
        var project_id = create_jnb_form.find('#gcp_id_select').val();
        var vm_name = create_jnb_form.find('#vmName').val();
        // var vmZone = create_jnb_form.find('#vmZone').val();
        var client_ip_range = create_jnb_form.find('#client_ip_range').val();
        var pwd1 = create_jnb_form.find('#exampleInputPassword1').val();
        var pwd2 = create_jnb_form.find('#exampleInputPassword2').val();

        if (!project_id || !vm_name || !client_ip_range || !pwd1 || !pwd2) {
            msg = "Some fields are missing. "
        }
        else if (vm_name.length > 30) {
            msg = "Machine name must be less than 30 characters"
        }
        else if (!/^[a-z]([-a-z0-9]+[a-z0-9])$/.test(vm_name)) {
            msg = "Machine name must start with lowercase letter, and all following characters must be a dash, lowercase letter, or digit, except the last character, which cannot be a dash"
        }
        else if (pwd1 != pwd2) {
            msg = "Password entries do not match."
        }
        else if (pwd1.length > 20 || pwd1.length < 8) {
            msg = "Password must be 8-20 characters."
        }
        else if (!/^[a-z0-9]+$/i.test(pwd1)) {
            msg = "Password must contain only letters and numbers"
        }

        if (client_ip_range){
            var ip_address_list = client_ip_range.split(',');
            for(var i=0; i<ip_address_list.length; i++){
                if(!/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip_address_list[i].trim())){
                    msg = "Enter a valid IPv4 address";
                    break;
                }
            }
        }

        //display or clear message
        create_jnb_form.find('#messageBlock').html(msg);

        //set inputs and trigger vm-create-btn
        if (!msg) {
            $(vm_div).find("input[name='vm_project_id']").val(project_id);
            $(vm_div).find("input[name='vm_name']").val(vm_name);
            // $(vm_div).find("input[name='vm_zone']").val(vmZone);
            $(vm_div).find("input[name='client_ip_range']").val(client_ip_range);
            $(vm_div).find("input[name='password']").val(pwd1);
            $(vm_div).find('.vm-create-btn').trigger('click');
            $(this).parents('.modal').modal('hide');
        }
    });

    // Solr Search
    //
    $('#nb-keyword-search-form').on('submit', function (e) {

        e.preventDefault();
        var url = SOLR_URL + 'notebooks/select';
        var keywords = $(this).find('.nb-keyword-field').val();
        var list_max = 5;
        var count_p = $(this).parents('.panel-body').find('.nb-result-count');
        var table_list = $(this).parents('.panel-body').find('.table-list');
        $.ajax({
            'url': url,
            crossDomain: true,
            data: {'wt': 'json', 'q': keywords},
            success: function (data) {
                var num_found = data.response.numFound;
                var docs = data.response.docs;
                var html_list = "";
                for (var i = 0; i < docs.length && i < list_max; i++) {
                    html_list += '<li><a href=\"/notebooks/' + docs[i].id + '/public\" title=\"' + docs[i].name +
                        '\"><div class=\"list-main\"><h5 class=\"list-title\">' + docs[i].name +
                        '</h5><p>' + (docs[i].description) + '</p></div></a></li>'
                }
                var count_message = num_found + ' result' + (num_found > 0 ? 's' : '') + ' found' +
                    (num_found > list_max ? (' Showing 5 results') : '');
                count_p.html(count_message);
                table_list.html(html_list);
            },
            dataType: 'jsonp',
            jsonp: 'json.wrf'
        });

    });

});