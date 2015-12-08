require.config({
    baseUrl: '/static/js/',
    paths: {
        jquery: 'libs/jquery-1.11.1.min',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        session_security: 'session_security',
        underscore: 'libs/underscore-min',
        assetscore: 'libs/assets.core',
        assetsresponsive: 'libs/assets.responsive',
        base: 'base',
        text: 'libs/require-text',
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'session_security': ['jquery'],
        'assetscore': ['jquery', 'bootstrap', 'jqueryui'],
        'assetsresponsive': ['jquery', 'bootstrap', 'jqueryui'],
        'underscore': {exports: '_'},
    }
});

require([
    'jquery',
    'jqueryui',
    'bootstrap',
    'session_security',
    'underscore',
    'text!../templates/upload_file_list_item.html',
    'text!../templates/upload_input_table.html',
    'assetscore',
    'assetsresponsive',
    'base',
], function($, jqueryui, bootstrap, session_security, _, UploadFileListItemTemplate, UploadInputTableTemplate) {
    'use strict';

    var uploadFileListItemTemplate = _.template(UploadFileListItemTemplate),
        uploadGroup = $('#data-upload-group'),
        inputGroup = uploadGroup.find('input:radio'),
        formGroup = $('#data-upload-forms'),
        hleCheckbox = $('#high-level-extend'),

        addedFiles = [];

    function changeUploadGroup() {
        var val = inputGroup.filter(':checked').val();

        if (val === 'high') {
            hleCheckbox.removeAttr('disabled').closest('.checkbox').removeClass('disabled');
            changeExtendSelectBox();
            $('.low-level-message').addClass('hidden');
        } else {
            hleCheckbox.closest('.checkbox').addClass('disabled').find('input, select').attr('disabled', true);
            $('.low-level-message').removeClass('hidden');
        }
    }

    function changeExtendSelectBox() {
        if(hleCheckbox.is(':checked')) {
            hleCheckbox.closest('label').siblings('select').removeAttr('disabled');
        } else {
            hleCheckbox.closest('label').siblings('select').attr('disabled', true);
        }
    }

    changeExtendSelectBox();
    changeUploadGroup();

    /**
     * Data Processing
     */
    var restrictiveGauge = ['int', 'float', 'file', 'url', 'string', 'text'],

        types = {
            'General': {
                'int': {
                    'displayName': 'Integer',
                    test: function (val) { return !!val.match(/^[0-9]+$/); }
                },
                'float': {
                    'displayName': 'Decimal',
                    test: function (val) { return !!val.match(/^[0-9]*\.?[0-9]+$/); }
                },
                'file': {
                    'displayName': 'Cloud Storage File',
                    test: function (val) { return !!val.match(/^gs:\/\//i); }
                },
                'url': {
                    'displayName': 'URL',
                    test: function (val) { return !!val.match(/^(http|gs|ftp)s?:\/\//i); }
                },
                'string': {
                    'displayName': 'Text',
                    test: function (val) { return val.length <= 200; }
                },
                'text': {
                    'displayName': 'Long Text',
                    test: function (val) { return true; }
                },
            },
            'Controlled': []
        };

    function adjustCellType(curr, cellVal) {
        // If the cell is empty we can't tell what it should be
        if($.trim(cellVal) === '')
            return curr;

        var realType = restrictiveGauge.indexOf(curr);

        if(realType < 0)
            realType = 0;

        while(realType < restrictiveGauge.length && !types.General[restrictiveGauge[realType]].test(cellVal)) {
            realType++
        }

        return restrictiveGauge[realType];
    }

    function readFile(file) {
        return $.Deferred(function (deferred) {
            var fr = new FileReader();
            fr.addEventListener('load', function () {
                var fileObj = {
                        name: file.name,
                        size: file.size
                    },
                    lines = fr.result.split(/\r?\n/),
                    headers = lines[0].split('\t'),
                    len = headers.length;

                fileObj.columns = [];
                for (var h = 0; h < len; h++) {
                    fileObj.columns.push({
                        name: headers[h],
                        type: null,
                        isParticipantBarcode: !!(headers[h].match(/barcode/i) && headers[h].match(/participant/i)),
                        isSampleBarcode: !!(headers[h].match(/barcode/i) && !headers[h].match(/participant/i)),
                        colMatch: false
                    });
                }

                fileObj.rows = [];
                for (var i = 1, l = lines.length; i < l; i++) {
                    var row = lines[i].split('\t');
                    if (row.length != len) {
                        // Allow an empty last line for a file that ends with a newline
                        if (i === l - 1 && lines[i].match(/^\s*$/)) {
                            lines.pop();
                            continue;
                        }
                        deferred.reject(new Error('Line #' + i + ' in file "' + file.name + '" contains ' +
                            row.length + ' columns but the header line contains ' + len + ' columns.'));
                    }

                    for (var c = 0; c < len; c++) {
                        fileObj.columns[c].type = adjustCellType(fileObj.columns[c].type, row[c]);
                    }
                    fileObj.rows.push(row);
                }

                deferred.resolve(fileObj);
            }, false);
            fr.addEventListener('error', deferred.reject.bind(deferred), false);
            fr.readAsText(file, 'utf-8');
        });
    }

    function buildInputTable(fileObj, parentEl) {
        var t = _.template(UploadInputTableTemplate);

        parentEl.append( t(fileObj) );
    }

    /**
     * Event Listeners
     */

    // using tabs to toggle project information section
    $('a[data-target="#project-info"]').on('show.bs.tab', function(e){
        if($(this).hasClass('disabled')) {
            e.preventDefault();
            return false;
        }
        var target = $(this).data('target');

        $('#project-tab').val($(this).data('value'))
        $(target).collapse('show');
        $('#study-info').collapse('hide');
    }).on('hide.bs.tab', function(e){
        var target = $(this).data('target');

        $(target).collapse('hide');
        $('#study-info').collapse('show');
    });

    formGroup.on('click', '.close-btn', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var fileEl = $(this).closest('.uploaded-file'),
            obj = _.findWhere(addedFiles, { file: fileEl.data('fileObj') });

        addedFiles.splice(addedFiles.indexOf(obj), 1);
        fileEl.remove();

        if(addedFiles.length == 0) {
            $('#file-list-table .table-message').show();
        }

    });

    $('.upload-file-button').on('click', function (e) {
        e.stopPropagation();
        e.preventDefault();
        $(this).closest('form').find('.upload-file-field').click();
    });

    // toggle upload ui on selected radio
    $('#data-upload-group input[type="radio"]').on('change', changeUploadGroup);

    hleCheckbox.on('change', changeExtendSelectBox);

    $('#data-upload-group')
        .on('click', '.upload-file-button', function (e) {
            e.stopPropagation();
            e.preventDefault();
            $(this).closest('.upload-area').find('.upload-file-field').click();
        }).on('change', 'input[type=file]', function (e) {
            if(this.files && this.files.length) {
                var table = $('#file-list-table');
                table.find('.table-message').hide();
                // Add files
                for(var f = 0, l = this.files.length; f < l; f++) {
                    var tr = $(uploadFileListItemTemplate(this.files[f]));
                    tr.data('fileObj', this.files[f]);
                    addedFiles.push({
                        file: this.files[f],
                        $el : tr
                    });
                    table.append(tr);
                }
            }
        });

    function clearErrors() {
        $('.error-message-container').empty();
    }

    function errorMessage(msg) {
        $('<div>')
            .addClass('alert alert-danger alert-error-message')
            .append($('<p>').text(msg))
            .appendTo($('.error-message-container'));
    }

    $('#next-btn').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        var $next = $(this);
        if($next.hasClass('disabled')) {
            return;
        }
        clearErrors();
        // Validate form fields selected
        var hasErrors = false,
            tabSet = $('#project-tab').val();

        if( (tabSet == 'new' && !$.trim( $('#project-name').val() )) ||
            (tabSet == 'existing' && !$.trim( $('project-selection').val() )) ) {

            hasErrors = true;
            errorMessage('Invalid project. Please select an existing project or insert a name for a new project');
        }

        if( !$.trim($('#study-name').val()) ) {
            hasErrors = true;
            errorMessage('Please insert a valid study name');
        }

        if( $('.data-radio:checked').val() === 'high' &&
            hleCheckbox.is(':checked') &&
            !$.trim($('#high-level-extend-study').val()) ) {

            hasErrors = true;
            errorMessage('Please select a study your data is extending');
        }

        if(!addedFiles.length) {
            hasErrors = true;
            errorMessage('No files added. Must add at least 1 file to upload for processing');
        }

        if(hasErrors) {
            window.scroll(0,135);
            return;
        }

        // Process Files
        $next.text('Processing...').addClass('disabled');
        var processing = [];
        for(var a = 0, l = addedFiles.length; a < l; a++) {
            processing.push( readFile(addedFiles[a].file) );
        }

        // Show fields
        var processListEl = $('#file-process-list');
        $.when.apply($, processing).then(function () {
            var args = Array.prototype.slice.call(arguments);
            for(var a = 0, l = args.length; a < l; a++) {
                // There is a one to one mapping and it should remain in order between the two
                var result = args[a],
                    added = addedFiles[a];

                added.processed = result;
                processListEl.append( $('<h3>').text('File: ' + added.file.name) );
                buildInputTable(added.processed, processListEl);
            }

            $('#first-section').addClass('hidden');
            $('#second-section').removeClass('hidden');
        }).fail(function (err) {
            errorMessage('There was an error processing the files. ' + err.message);
        }).always(function () {
            window.scroll(0,135);
            $next.text('Next').removeClass('disabled');
        });
    });

    $('#back-button').on('click', function (e) {
        if($(this).hasClass('disabled'))
            return;
        $('#first-section').removeClass('hidden');
        $('#second-section').addClass('hidden');
    });

    $('#upload-button').on('click', function (e) {
        if($(this).hasClass('disabled'))
            return;

        $('#upload-button, #back-button').addClass('disabled');

        var form = new FormData(),
            tabSet = $('#project-tab').val();

        form.append('project-type', tabSet);
        if(tabSet == 'new') {
            form.append('project-name', $.trim( $('#project-name').val()));
            form.append('project-description', $.trim( $('#project-description').val()));
        } else {
            form.append('project-id', $('#project-selection').val());
        }

        form.append('study-name', $('#study-name').val());
        form.append('study-description', $('#study-description').val());

        var uploadDataType = $('.data-radio:checked').val();
        if(uploadDataType === 'high' && hleCheckbox.is(':checked')) {
            uploadDataType = 'extend';
            form.append('extend-project-id', $('project-selection').val());
        }
        form.append('data-type', uploadDataType);

        for(var a = 0, l = addedFiles.length; a < l; a++) {
            form.append('files', addedFiles[a].file, addedFiles[a].file.name);
            form.append('file_proc_objects', JSON.stringify(addedFiles[a].processed));
        }

        var csrv = $('#base-data-form').find('input')[0];
        form.append(csrv.name, csrv.value);

        $.ajax({
            url: $('#base-data-form').attr('action'),
            type: 'POST',
            data: form,
            processData: false,
            contentType: false,
        }).done(function (res) {
            console.log('Response: ', res);
            if(res.status === 'success') {
                $('#base-data-form')[0].reset();
                location.href = res.redirect_url;
            } else {
                errorMessage('Error submitting response' + res.message);
            }
        }).always(function () {
            $('#upload-button, #back-button').removeClass('disabled');
        });
    });

});