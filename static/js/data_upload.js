require.config({
    baseUrl: STATIC_FILES_URL+'js/',
    paths: {
        // jquery: 'libs/jquery-1.11.1.min',
        // bootstrap: 'libs/bootstrap.min',
        // jqueryui: 'libs/jquery-ui.min',
        // session_security: 'session_security/script',
        // underscore: 'libs/underscore-min',
        // base: 'base',
        text: 'libs/require-text'
    },
    // shim: {
    //     'bootstrap': ['jquery'],
    //     'jqueryui': ['jquery'],
    //     'session_security': ['jquery'],
    //     'underscore': {exports: '_'}
    // },
    // Per http://jaketrent.com/post/cross-domain-requirejs-text/
    // Because this is a cross-domain text request, we need to force
    // it to succeed
    config: {
        text: {
            useXhr: function (url, protocol, hostname, port) {
                // allow cross-domain requests
                // remote server allows CORS
                return true;
            }
        }
    }
});

require([
    'jquery',
    'jqueryui',
    'bootstrap',
    'session_security',
    'underscore',
    'base',
    'text!'+STATIC_FILES_URL+'templates/upload_file_list_item.html',
    'text!'+STATIC_FILES_URL+'templates/upload_input_table.html'
], function($, jqueryui, bootstrap, session_security, _, base, UploadFileListItemTemplate, UploadInputTableTemplate) {
    'use strict';

    var uploadFileListItemTemplate = _.template(UploadFileListItemTemplate),
        uploadInputTableTemplate = _.template(UploadInputTableTemplate),
        uploadGroup = $('#data-upload-group'),
        inputGroup = uploadGroup.find('input:radio'),
        formGroup = $('#data-upload-forms'),
        hleCheckbox = $('#high-level-extend'),

        addedFiles = [];

    function changeUploadGroup() {
        var val = inputGroup.filter(':checked').val(),
            flt = $('#file-list-table');

        if (val === 'high') {
            hleCheckbox.removeAttr('disabled').closest('.checkbox').removeClass('disabled');
            changeExtendSelectBox();
            $('.low-level-message').addClass('hidden');
            flt.removeClass('low-level-data');
        } else {
            hleCheckbox.closest('.checkbox').addClass('disabled').find('input, select').attr('disabled', true);
            $('.low-level-message').removeClass('hidden');
            flt.addClass('low-level-data');
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
                }
            },
            'Controlled': {
                'sample': {
                    'displayName': 'Sample Barcode',
                    test: function (col) { return !!(col.name.match(/barcode/i) && !col.name.match(/participant/i)); },
                    type: 'string',
                    key: 'sample_barcode'
                },
                'case': {
                    'displayName': 'Case Barcode',
                    test: function (col) { return !!(col.name.match(/barcode/i) && col.name.match(/participant/i)); },
                    type: 'string',
                    key: 'case_barcode'
                }
            }
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
                        colMatch: false,
                        index: h,
                        ignored: false,
                    });
                }

                //fileObj.rows = [];
                for (var i = 1, l = lines.length; i < l; i++) {
                    var row = lines[i].split('\t');
                    if (row.length !== len) {
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
                    //fileObj.rows.push(row);
                }

                _.each(fileObj.columns, function (col) {
                    col.controlled = _.find(types.Controlled, function (type) {
                        return type.test(col) && restrictiveGauge.indexOf(type.type) >= restrictiveGauge.indexOf(col.type);
                    });
                    if(col.controlled) {
                        col.type = col.controlled.type;
                    }
                });

                deferred.resolve(fileObj);
            }, false);
            fr.addEventListener('error', deferred.reject.bind(deferred), false);
            fr.readAsText(file, 'utf-8');
        });
    }

    function buildInputTable(fileObj, parentEl) {

        var $el = $(uploadInputTableTemplate({
            file: fileObj.file,
            processed: fileObj.processed,
            uid: fileObj.uid
        }));
        parentEl.append( $el );

        return $el;
    }

    /**
     * Event Listeners
     */

    // using tabs to toggle program information section
    $('a[data-target="#program-info"]').on('show.bs.tab', function(e){
        if($(this).hasClass('disabled')) {
            e.preventDefault();
            return false;
        }
        var target = $(this).data('target');

        $('#program-tab').val('new');
        $(target).collapse('show');
        $('#project-info').collapse('hide');
    }).on('hide.bs.tab', function(e){
        var target = $(this).data('target');

        $(target).collapse('hide');
        $('#project-info').collapse('show');
        $('#program-tab').val('existing');
    });

    /**
     * Remove files on click of the X button next to each file
     */
    formGroup.on('click', '.close-btn', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var fileEl = $(this).closest('.uploaded-file'),
            obj = _.findWhere(addedFiles, { file: fileEl.data('fileObj') });

        addedFiles.splice(addedFiles.indexOf(obj), 1);
        fileEl.remove();

        if(addedFiles.length === 0) {
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

    var uidCounter = 0;
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
                        $el : tr,
                        uid: uidCounter++
                    });
                    table.append(tr);
                }

                $('.data-type-selector').on('change', function() {
                    var value = $(this).val();

                    if (value === 'user_gen') {
                        $(this).siblings('.file-format-check').prop('style','visibility: hidden;');
                    } else {
                        $(this).siblings('.file-format-check').prop('style','visibility: visible;');
                    }
                })
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

    function validateSectionOne() {
        clearErrors();
        // Validate form fields selected
        var hasErrors = false,
            tabSet = $('#program-tab').val();

        var fileDataTypes = {};
        _.each(addedFiles, function (addedFile) {
            var type = addedFile.$el.find('select').val();
            type = type || 'NOT SELECTED';

            if(!fileDataTypes[type])
                fileDataTypes[type] = 0;

            fileDataTypes[type]++;
        });

        if( (tabSet === 'new' && !$.trim( $('#program-name').val() )) ||
            (tabSet === 'existing' && !$.trim( $('#program-selection').val() )) ) {

            hasErrors = true;
            errorMessage('Please select an existing program or insert a name for a new program');
        }

        if( !$.trim($('#project-name').val()) ) {
            hasErrors = true;
            errorMessage('Please insert a valid project name');
        }

        if( $('.data-radio:checked').val() === 'high' &&
            hleCheckbox.is(':checked') &&
            !$.trim($('#high-level-extend-project').val()) ) {

            hasErrors = true;
            errorMessage('Please select a project your data is extending');
        }

        if(!addedFiles.length) {
            hasErrors = true;
            errorMessage('You must add at least 1 file to upload for processing');
        }

        if(fileDataTypes['NOT SELECTED'] && $('.data-radio:checked').val() === 'high') {
            hasErrors = true;
            errorMessage('You must select a file data type for every file when uploading high level data');
        }

        return !hasErrors;
    }

    function validateSectionTwo() {
        var hasErrors = !validateSectionOne();

        var hasSampleBarcode = _.every(addedFiles, function (file) {
                if(!file.processed || !file.processed.columns)
                    return true;

                return 1 === _.reduce(file.processed.columns, function (n, col) {
                        return !col.ignored && col.controlled && col.controlled.key === 'sample_barcode' ? n + 1 : n;
                    }, 0);
            }),
            platformPipelineValid = _.every(addedFiles, function (file) {
                return file.$columnsEl.find('.platform-field').val() && file.$columnsEl.find('.pipeline-field').val();
            });

        if(!hasSampleBarcode) {
            hasErrors = true;
            errorMessage('All files must have a Sample Barcode column');
        }

        if(!platformPipelineValid) {
            hasErrors = true;
            errorMessage('All files must have a platform and a pipeline filled in');
        }

        return !hasErrors;
    }

    var processListEl = $('#file-process-list');
    $('#next-btn').on('click', function (e) {

        e.preventDefault();
        e.stopPropagation();

        var $next = $(this);
        if($next.hasClass('disabled')) {
            return false;
        }

        var textInputOk = true;

        var names = $('input#program-name').val() + ' ' + $('input#project-name').val();
        var descs = $('textarea#project-description').val() + ' ' + $('textarea#program-description').val();

        var unallowed_names = names.match(base.blacklist);
        var unallowed_descs = descs.match(base.blacklist);

        if(unallowed_names || unallowed_descs) {
            textInputOk = false;
            var unalloweds = unallowed_names || [];
            var msg = (unallowed_names ? 'names' : null);
            if (unallowed_descs) {
                unalloweds = unalloweds.concat(unallowed_descs);
                msg = (msg ? msg+' and descriptions' : 'descriptions');
            }

            $('span.unallowed-fields').text(msg);
            $('span.unallowed-chars').text(unalloweds.join(", "));
        }

        if(!textInputOk) {
            $('#unallowed-chars-alert').show();
            window.scroll(0,135);
            return false;
        } else {
            $('#unallowed-chars-alert').hide();
            $('span.unallowed-fields').text('');
            $('span.unallowed-chars').text('');
        }

        if(!validateSectionOne()) {
            window.scroll(0,135);
            return false;
        }

        var fileGroupType = inputGroup.filter(':checked').val();
        _.each(addedFiles, function (addedFile) {
            if(fileGroupType === 'high') {
                addedFile.datatype = addedFile.$el.find('select').val();
            } else {
                addedFile.datatype = 'low_level';
            }
        });

        // Process Files
        $next.addClass('disabled')
            .siblings('.progress-message').removeClass('hidden');
        var processing = _.map(addedFiles, function (addedFile) {
            if(addedFile.datatype === 'user_gen') {
                var p = readFile(addedFile.file);
                p.then(function (result) {
                    addedFile.processed = result;
                });
                return p;
            }
            addedFile.processed = false;
        });

        // Show fields
        $.when.apply($, processing).then(function () {
            processListEl.find('.column-definitions').remove();

            _.each(addedFiles, function (file) {
                file.$columnsEl = buildInputTable(file, processListEl);
            });

            $('#first-section').addClass('hidden');
            $('#second-section').removeClass('hidden');
        }).fail(function (err) {
            errorMessage('There was an error processing the files. ' + err.message);
        }).always(function () {
            window.scroll(0,135);
            $next.removeClass('disabled')
                .siblings('.progress-message').addClass('hidden');
        });
    });

    processListEl
        .on('click', '.ignore-row-btn', function (e) {
            var $this = $(this),
                row = $this.closest('tr').toggleClass('ignored');

            $this.toggleClass('text-danger text-success');
            var i = $this.closest('[data-index]').data('index'),
                fileUID = $this.closest('[data-file]').data('file'),
                ignoreCol = _.findWhere(addedFiles, {uid: fileUID}).processed.columns[i];
            ignoreCol.ignored = !ignoreCol.ignored;

            row.data('ignored', !row.data('ignored'));
            row.find('select').attr('disabled', row.data('ignored'));
        })
        .on('change', '.type-selection', function (e) {
            var $this = $(this),
                i = $this.closest('[data-index]').data('index'),
                fileUID = $this.closest('[data-file]').data('file'),
                col = _.findWhere(addedFiles, {uid: fileUID}).processed.columns[i],
                newVal = $this.val();

            if(types.Controlled[newVal]) {
                col.controlled = types.Controlled[newVal];
                col.type = col.controlled.type;
            } else {
                col.type = newVal;
                col.controlled = null;
            }
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

        if(!validateSectionTwo())
            return;

        $('#upload-button, #back-button').addClass('disabled')
            .siblings('.progress-message').removeClass('hidden');

        var form = new FormData(),
            tabSet = $('#program-tab').val();

        form.append('program-type', tabSet);
        if(tabSet == 'new') {
            form.append('program-name', $.trim( $('#program-name').val()));
            form.append('program-description', $.trim( $('#program-description').val()));
        } else {
            form.append('program-id', $('#program-selection').val());
        }

        form.append('project-name', $('#project-name').val());
        form.append('project-description', $('#project-description').val());

        var uploadDataType = $('.data-radio:checked').val();
        if(uploadDataType === 'high' && hleCheckbox.is(':checked')) {
            uploadDataType = 'extend';
            form.append('extend-project-id', $('#high-level-extend-project').val());
        }
        form.append('data-type', uploadDataType);

        // Add BQ Dataset and Bucket information
        form.append('bucket', $('#select-gcp-bucket').val());
        form.append('dataset', $('#select-gcp-dataset').val());

        _.each(addedFiles, function (added) {
            form.append('file_' + added.uid, added.file, added.file.name);
            form.append('file_' + added.uid + '_type', added.datatype);
            if(!added.processed)
                added.processed = {};

            added.processed.platform = added.$columnsEl.find('.platform-field').val();
            added.processed.pipeline = added.$columnsEl.find('.pipeline-field').val();
            form.append('file_' + added.uid + '_desc', JSON.stringify(added.processed));
        });

        var csrv = $('#base-data-form').find('input')[0];
        form.append(csrv.name, csrv.value);

        $.ajax({
            url: $('#base-data-form').attr('action'),
            type: 'POST',
            data: form,
            processData: false,
            contentType: false
        }).done(function (res) {
            if (res.status === 'success') {
                $('#base-data-form')[0].reset();
                location.href = res.redirect_url;
            } else {
                errorMessage('Error submitting response : ' + res.message);
            }
        }).error(function (res) {
            errorMessage('We had an error submitting the response' + (res.responseJSON ? ': '+res.responseJSON.msg : '.'));
        }).always(function () {
            $('#upload-button, #back-button').removeClass('disabled')
                .siblings('.progress-message').addClass('hidden');
        });
    });

    $('.data-type-selector').on('change', function() {
        var value = $(this).val();

        if (value === 'other') {
            $(this).sibling('.file-format-check').hide();
        } else {
            $(this).sibling('.file-format-check').show();
        }
    })
});