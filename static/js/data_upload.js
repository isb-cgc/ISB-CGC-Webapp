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
                },
            },
            'Controlled': {
                'sample': {
                    'displayName': 'Sample Barcode',
                    test: function (col) { return !!(col.name.match(/barcode/i) && !col.name.match(/participant/i)); },
                    type: 'string',
                    key: 'sample_barcode',
                },
                'participant': {
                    'displayName': 'Participant Barcode',
                    test: function (col) { return !!(col.name.match(/barcode/i) && col.name.match(/participant/i)); },
                    type: 'string',
                    key: 'participant_barcode',
                },
            },
            'Dictionary': {
                // Dictionary provided by ISB
                // ===== START DICTIONARY =====
                "avg_percent_tumor_nuclei": {"displayName": "Average Percent Tumor Nuclei","key": "avg_percent_tumor_nuclei","type": "float"},
                "min_percent_neutrophil_infiltration": {"displayName": "Minimum Percent Neutrophil Infiltration","key": "min_percent_neutrophil_infiltration","type": "float"},
                "lymphatic_invasion": {"displayName": "Lymphatic Invasion Indicator","key": "lymphatic_invasion","type": "string"},
                "neoplasm_histologic_grade": {"displayName": "Neoplasm Histologic Grade","key": "neoplasm_histologic_grade","type": "string"},
                "icd_o_3_site": {"displayName": "ICD-O-3 Site Code","key": "icd_o_3_site","type": "string"},
                "SampleTypeLetterCode": {"displayName": "Sample Type Letter Code","key": "SampleTypeLetterCode","type": "string"},
                "psa_value": {"displayName": "Prostate-Specific Antigen Value","key": "psa_value","type": "float"},
                "days_to_submitted_specimen_dx": {"displayName": "Days to Submitted Specimen Dx","key": "days_to_submitted_specimen_dx","type": "int"},
                "days_to_death": {"displayName": "Days to Death","key": "days_to_death","type": "int"},
                "person_neoplasm_cancer_status": {"displayName": "Tumor Status","key": "person_neoplasm_cancer_status","type": "string"},
                "new_tumor_event_after_initial_treatment": {"displayName": "New Tumor Event After Initial Treatment","key": "new_tumor_event_after_initial_treatment","type": "string"},
                "TSSCode": {"displayName": "Tissue Source Site Code","key": "TSSCode","type": "string"},
                "min_percent_lymphocyte_infiltration": {"displayName": "Minimum Percent Lymphocyte Infiltration","key": "min_percent_lymphocyte_infiltration","type": "float"},
                "max_percent_monocyte_infiltration": {"displayName": "Maximum Percent Monocyte Infiltration","key": "max_percent_monocyte_infiltration","type": "float"},
                "clinical_M": {"displayName": "Extent of Distant Metastasis","key": "clinical_M","type": "string"},
                "clinical_N": {"displayName": "Extent of Regional Lymph Node Involvement","key": "clinical_N","type": "string"},
                "Project": {"displayName": "Project","key": "Project","type": "string"},
                "clinical_T": {"displayName": "Extent of Primary Cancer","key": "clinical_T","type": "string"},
                "pathologic_stage": {"displayName": "Tumor Stage (Pathological)","key": "pathologic_stage","type": "string"},
                "days_to_sample_procurement": {"displayName": "Days to Sample Procurement","key": "days_to_sample_procurement","type": "int"},
                "max_percent_tumor_nuclei": {"displayName": "Maximum Percent Tumor Nuclei","key": "max_percent_tumor_nuclei","type": "float"},
                "gender": {"displayName": "Gender","key": "gender","type": "string"},
                "days_to_last_known_alive": {"displayName": "Days to Last Known Alive","key": "days_to_last_known_alive","type": "int"},
                "anatomic_neoplasm_subdivision": {"displayName": "Anatomic Neoplasm Subdivision","key": "anatomic_neoplasm_subdivision","type": "string"},
                "race": {"displayName": "Race","key": "race","type": "string"},
                "weiss_venous_invasion": {"displayName": "Weiss Venous Invasion","key": "weiss_venous_invasion","type": "string"},
                "weight": {"displayName": "Patient Body Weight","key": "weight","type": "int"},
                "batch_float": {"displayName": "Batch float","key": "batch_float","type": "int"},
                "pregnancies": {"displayName": "Pregnancies","key": "pregnancies","type": "string"},
                "vital_status": {"displayName": "Vital Status","key": "vital_status","type": "string"},
                "icd_10": {"displayName": "ICD-10","key": "icd_10","type": "string"},
                "colorectal_cancer": {"displayName": "Colorectal Cancer?","key": "colorectal_cancer","type": "string"},
                "BMI": {"displayName": "BMI","key": "BMI","type": "float"},
                "max_percent_lymphocyte_infiltration": {"displayName": "Maximum Percent Lymphocyte Infiltration","key": "max_percent_lymphocyte_infiltration","type": "float"},
                "prior_dx": {"displayName": "Prior Diagnosis?","key": "prior_dx","type": "string"},
                "histological_type": {"displayName": "Histological Type","key": "histological_type","type": "string"},
                "Study": {"displayName": "Study","key": "Study","type": "string"},
                "min_percent_tumor_nuclei": {"displayName": "Minimum Percent Tumor Nuclei","key": "min_percent_tumor_nuclei","type": "float"},
                "hpv_calls": {"displayName": "HPV Calls","key": "hpv_calls","type": "string"},
                "country": {"displayName": "Country of Procurement","key": "country","type": "string"},
                "primary_neoplasm_melanoma_dx": {"displayName": "Primary Neoplasm Melanoma Dx","key": "primary_neoplasm_melanoma_dx","type": "string"},
                "mononucleotide_and_dinucleotide_marker_panel_analysis_status": {"displayName": "Mononucleotide and Dinucleotide Marker Panel Analysis Status","key": "mononucleotide_and_dinucleotide_marker_panel_analysis_status","type": "string"},
                "tumor_tissue_site": {"displayName": "Site of Disease","key": "tumor_tissue_site","type": "string"},
                "lymphnodes_examined": {"displayName": "Lymphnodes Examined","key": "lymphnodes_examined","type": "string"},
                "primary_therapy_outcome_success": {"displayName": "Primary Therapy Outcome Success","key": "primary_therapy_outcome_success","type": "string"},
                "max_percent_normal_cells": {"displayName": "Maximum Percent Normal Cells","key": "max_percent_normal_cells","type": "float"},
                "residual_tumor": {"displayName": "Margins of surgical resection","key": "residual_tumor","type": "string"},
                "height": {"displayName": "Height","key": "height","type": "float"},
                "avg_percent_necrosis": {"displayName": "Average Percent Necrosis","key": "avg_percent_necrosis","type": "float"},
                "avg_percent_stromal_cells": {"displayName": "Average Percent Stromal Cells","key": "avg_percent_stromal_cells","type": "float"},
                "min_percent_monocyte_infiltration": {"displayName": "Minimum Percent Monocyte Infiltration","key": "min_percent_monocyte_infiltration","type": "float"},
                "days_to_initial_pathologic_diagnosis": {"displayName": "Days to Initial Pathologic Diagnosis","key": "days_to_initial_pathologic_diagnosis","type": "int"},
                "history_of_neoadjuvant_treatment": {"displayName": "History of Neoadjuvant Treatment","key": "history_of_neoadjuvant_treatment","type": "string"},
                "avg_percent_monocyte_infiltration": {"displayName": "Average Percent Monocyte Infiltration","key": "avg_percent_monocyte_infiltration","type": "float"},
                "min_percent_necrosis": {"displayName": "Minimum Percent Necrosis","key": "min_percent_necrosis","type": "float"},
                "max_percent_stromal_cells": {"displayName": "Maximum Percent Stromal Cells","key": "max_percent_stromal_cells","type": "float"},
                "max_percent_necrosis": {"displayName": "Maximum Percent Necrosis","key": "max_percent_necrosis","type": "float"},
                "gleason_score_combined": {"displayName": "Gleason Score Combined","key": "gleason_score_combined","type": "float"},
                "is_ffpe": {"displayName": "Is FFPE","key": "is_ffpe","type": "string"},
                "avg_percent_neutrophil_infiltration": {"displayName": "Average Percent Neutrophil Infiltration","key": "avg_percent_neutrophil_infiltration","type": "float"},
                "days_to_last_followup": {"displayName": "Days to Last Followup","key": "days_to_last_followup","type": "int"},
                "clinical_stage": {"displayName": "Clinical Stage of Tumor","key": "clinical_stage","type": "string"},
                "analyte_code": {"displayName": "Analyte Code","key": "analyte_code","type": "string"},
                "year_of_initial_pathologic_diagnosis": {"displayName": "Year of Initial Pathologic Diagnosis","key": "year_of_initial_pathologic_diagnosis","type": "int"},
                "pathologic_N": {"displayName": "Pathologic Spread: Lymph Nodes (pN)","key": "pathologic_N","type": "string"},
                "pathologic_M": {"displayName": "Pathologic Spread: Distant Metastases (M)","key": "pathologic_M","type": "string"},
                "age_at_initial_pathologic_diagnosis": {"displayName": "Age at Initial Pathologic Diagnosis","key": "age_at_initial_pathologic_diagnosis","type": "int"},
                "days_to_collection": {"displayName": "Days to Collection","key": "days_to_collection","type": "int"},
                "tumor_type": {"displayName": "Papillary Renal Cell Carcinoma","key": "tumor_type","type": "string"},
                "pathologic_T": {"displayName": "Pathologic Spread: Primary Tumor (pT)","key": "pathologic_T","type": "string"},
                "max_percent_neutrophil_infiltration": {"displayName": "Maximum Percent Neutrophil Infiltration","key": "max_percent_neutrophil_infiltration","type": "float"},
                "avg_percent_normal_cells": {"displayName": "Average Percent Normal Cells","key": "avg_percent_normal_cells","type": "float"},
                "SampleUUID": {"displayName": "Sample UUID","key": "SampleUUID","type": "string"},
                "frozen_specimen_anatomic_site": {"displayName": "Frozen Specimen Anatomic Site","key": "frozen_specimen_anatomic_site","type": "string"},
                "ethnicity": {"displayName": "Ethnicity","key": "ethnicity","type": "string"},
                "ParticipantUUID": {"displayName": "Participant UUID","key": "ParticipantUUID","type": "string"},
                "min_percent_tumor_cells": {"displayName": "Minimum Percent Tumor Cells","key": "min_percent_tumor_cells","type": "float"},
                "history_of_colon_polyps": {"displayName": "History of Colon Polyps","key": "history_of_colon_polyps","type": "string"},
                "menopause_status": {"displayName": "Menopause Status","key": "menopause_status","type": "string"},
                "avg_percent_lymphocyte_infiltration": {"displayName": "Average Percent Lymphocyte Infiltration","key": "avg_percent_lymphocyte_infiltration","type": "float"},
                "icd_o_3_histology": {"displayName": "ICD-O-3 Histology Code","key": "icd_o_3_histology","type": "string"},
                "SampleType": {"displayName": "Sample Type","key": "SampleType","type": "string"},
                "float_of_lymphnodes_positive_by_he": {"displayName": "Lymph Nodes Positive by H&E Light Microscopy (Float)","key": "float_of_lymphnodes_positive_by_he","type": "int"},
                "history_of_prior_malignancy": {"displayName": "History of Prior Malignancy","key": "history_of_prior_malignancy","type": "string"},
                "lymphovascular_invasion_present": {"displayName": "Lymphovascular Invasion Present","key": "lymphovascular_invasion_present","type": "string"},
                "days_to_birth": {"displayName": "Days to Birth","key": "days_to_birth","type": "int"},
                "float_of_lymphnodes_examined": {"displayName": "Lymphnodes Examined (Float)","key": "float_of_lymphnodes_examined","type": "float"},
                "hpv_status": {"displayName": "HPV Status","key": "hpv_status","type": "string"},
                "tobacco_smoking_history": {"displayName": "Smoking History","key": "tobacco_smoking_history","type": "string"},
                "min_percent_normal_cells": {"displayName": "Minimum Percent Normal Cells","key": "min_percent_normal_cells","type": "float"},
                "float_pack_years_smoked": {"displayName": "Packs per year (Float)","key": "float_pack_years_smoked","type": "int"},
                "avg_percent_tumor_cells": {"displayName": "Average Percent Tumor Cells","key": "avg_percent_tumor_cells","type": "float"},
                "min_percent_stromal_cells": {"displayName": "Minimum Percent Stromal Cells","key": "min_percent_stromal_cells","type": "float"},
                "SampleTypeCode": {"displayName": "Sample Type Code","key": "SampleTypeCode","type": "string"},
                "max_percent_tumor_cells": {"displayName": "Maximum Percent Tumor Cells","key": "max_percent_tumor_cells","type": "float"},
                "bcr": {"displayName": "Biospecimen Core Resource","key": "bcr","type": "string"}
                // ====== END DICTIONARY ======
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

        var dictionary = _.toArray(types.Dictionary);
        dictionary = _.sortBy(dictionary, 'displayName')

        var $el = $(uploadInputTableTemplate({
            file: fileObj.file,
            processed: fileObj.processed,
            uid: fileObj.uid,
            dictionary: dictionary
        }));
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

        if(fileDataTypes['NOT SELECTED'] && $('.data-radio:checked').val() === 'high') {
            hasErrors = true;
            errorMessage('You must select a file data type for every file when uploading high level data');
        }

        return !hasErrors;
    }

    function validateSectionTwo() {
        var hasErrors = validateSectionOne();

        var hasSampleBarcode = _.every(addedFiles, function (file) {
                if(!file.processed || !file.processed.columns)
                    return true;

                return 1 === _.reduce(file.processed.columns, function (n, col) {
                        return !col.ignored && col.controlled && col.controlled.key == 'sample_barcode' ? n + 1 : n;
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
            } else if (types.Dictionary[newVal]) {
                col.controlled = types.Dictionary[newVal];
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
            form.append('extend-study-id', $('#high-level-extend-study').val());
        }
        form.append('data-type', uploadDataType);

        _.each(addedFiles, function (added) {
            form.append('file_'+added.uid, added.file, added.file.name);
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
            contentType: false,
        }).done(function (res) {
            if(res.status === 'success') {
                $('#base-data-form')[0].reset();
                location.href = res.redirect_url;
            } else {
                errorMessage('Error submitting response : ' + res.message);
            }
        }).fail(function () {
            errorMessage('We had an error submitting the response. Please try again later');
        }).always(function () {
            $('#upload-button, #back-button').removeClass('disabled')
                .siblings('.progress-message').addClass('hidden');
        });
    });

});