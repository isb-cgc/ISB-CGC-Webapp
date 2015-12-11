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
        uploadInputTableTemplate = _.template(UploadInputTableTemplate),
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
            'Controlled': {
                'sample': {
                    'displayName': 'Sample Barcode',
                    test: function (col) { return !!(col.name.match(/barcode/i) && !col.name.match(/participant/i)); },
                    type: 'string',
                    key: 'sample',
                },
                'participant': {
                    'displayName': 'Participant Barcode',
                    test: function (col) { return !!(col.name.match(/barcode/i) && col.name.match(/participant/i)); },
                    type: 'string',
                    key: 'participant',
                },
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
                        colMatch: false
                    });
                }

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
        var $el = $(uploadInputTableTemplate(fileObj));
        parentEl.append( $el );

        return $el;
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

        $('#project-tab').val('new');
        $(target).collapse('show');
        $('#study-info').collapse('hide');
    }).on('hide.bs.tab', function(e){
        var target = $(this).data('target');

        $(target).collapse('hide');
        $('#study-info').collapse('show');
        $('#project-tab').val('existing');
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
                        uid: uidCounter++,
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

    function validateSectionOne() {
        clearErrors();
        // Validate form fields selected
        var hasErrors = false,
            tabSet = $('#project-tab').val();

        var fileDataTypes = {};
        _.each(addedFiles, function (addedFile) {
            var type = addedFile.$el.find('select').val();
            type = type || 'NOT SELECTED';

            if(!fileDataTypes[type])
                fileDataTypes[type] = 0;

            fileDataTypes[type]++;
        });

        if( (tabSet == 'new' && !$.trim( $('#project-name').val() )) ||
            (tabSet == 'existing' && !$.trim( $('#project-selection').val() )) ) {

            hasErrors = true;
            errorMessage('Please select an existing project or insert a name for a new project');
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
            errorMessage('You must add at least 1 file to upload for processing');
        }

        if(fileDataTypes['NOT SELECTED']) {
            hasErrors = true;
            errorMessage('You must select a file data type for every file');
        }

        return !hasErrors;
    }

    function validateSectionTwo() {
        var hasErrors = validateSectionOne();

        var hasSampleBarcode = _.every(addedFiles, function (file) {
            if(!file.processed)
                return true;

            return 1 === _.reduce(file.processed.columns, function (n, col) {
                    return !col.ignored && col.controlled && col.controlled.key == 'sample' ? n + 1 : n;
                }, 0);
        });

        if(!hasSampleBarcode) {
            hasErrors = true;
            errorMessage('All files must have a Sample Barcode column');
        }

        return hasErrors;
    }

    var processListEl = $('#file-process-list');
    $('#next-btn').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        var $next = $(this);
        if($next.hasClass('disabled')) {
            return;
        }

        if(!validateSectionOne()) {
            window.scroll(0,135);
            return;
        }

        _.each(addedFiles, function (addedFile) {
            addedFile.datatype = addedFile.$el.find('select').val();
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
            } else {
                col.type = newVal;
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

        _.each(addedFiles, function (added) {
            form.append('file_'+added.uid, added.file, added.file.name);
            form.append('file_' + added.uid + '_type', added.datatype);
            if(added.processed)
                form.append('file_' + added.uid + '_desc', JSON.stringify(added.processed));
        });

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
            $('#upload-button, #back-button').removeClass('disabled')
                .siblings('.progress-message').addClass('hidden');
        });
    });

});