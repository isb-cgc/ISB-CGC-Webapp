'use strict';

require.config({
    baseUrl: STATIC_FILES_URL+'js/',
    paths: {
        text: 'libs/require-text'
    },
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
    'underscore',
    'text!'+STATIC_FILES_URL+'templates/upload_input_table.html',
    'base',
    'bootstrap'
], function ($, _, UploadInputTableTempl) {

    var changeNumber = 0,
        restrictiveGauge = ['int', 'float', 'file', 'url', 'string', 'text'],

        types = {
            'General': {
                'int': {
                    'displayName': 'Integer',
                    test: function (val) { return !!val.match(/^[0-9]+$/); }
                },
                'float': {
                    'displayName': 'Float',
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

    function readFile(file, change) {
        return $.Deferred(function (deferred) {
            var fr = new FileReader();
            fr.addEventListener('load', function () {
                if (changeNumber != change) {
                    // We changed files again, so this read doesn't apply anymore
                    return;
                }

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
        var t = _.template(UploadInputTableTempl);

        parentEl.append( t(fileObj) );
    }

    $('.upload-file-button').on('click', function (e) {
        e.stopPropagation();
        e.preventDefault();
        $(this).closest('form').find('.upload-file-field').click();
    });

    var list = $('.upload-file-list');

    $('input[type=file]').on('change', function (e) {
        changeNumber++;
        list.empty();
        for(var f = 0, l = this.files.length; f < l; f++) {
            (function (file) {
                var item = $('<li>');
                list.append(item);
                item.append( $('<h3>').text('File: ' + file.name) );
                var loading = $('<span>').addClass('fa fa-spin fa-spinner');
                item.append( loading );
                readFile(file, changeNumber).then(function (obj) {
                    buildInputTable(obj, item);
                }).fail(function (err) {
                    var msg = $('<span>')
                        .addClass('alert alert-danger')
                        .text('Error when processing file: ' + err.message);
                    item.append( msg );
                }).always(function () {
                    loading.remove();
                });
            })(this.files[f])
        }
    });

});