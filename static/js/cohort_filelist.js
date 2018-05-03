/**
 *
 * Copyright 2017, Institute for Systems Biology
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
        tokenfield: 'libs/bootstrap-tokenfield.min',
        base: 'base',
        bq_export: 'export_to_bq',
        gcs_export: 'export_to_gcs'
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'session_security': ['jquery'],
        'tokenfield': ['jquery', 'jqueryui'],
        'base': ['jquery', 'jqueryui', 'session_security', 'bootstrap', 'underscore']
    }
});

require([
    'jquery',
    'base',
    'jqueryui',
    'bootstrap',
    'session_security',
    'tokenfield',
    'bq_export',
    'gcs_export'
], function ($, base) {

    // For manaaging filter changes
    var UPDATE_PENDING = false;
    var SUBSEQUENT_DELAY = 600;
    var update_displays_thread = null;
    var UPDATE_QUEUE = [];

    var SELECTED_FILTERS = {
        'all': {
            'HG19': {},
            'HG38': {}
        },
        'igv': {
            'HG19': {},
            'HG38': {}
        }
    };
        
    var file_list_total = 0;

    // File selection storage object
    // The data-type/name input checkbox attritbutes in the form below must be reflected here in this map
    // to properly convey the checked list to IGV
    var selIgvFiles = {
        gcs_bam: {},
        toTokens: function() {
            var tokens = [];
            for(var i in this.gcs_bam) {
                tokens.push({
                    label: this.gcs_bam[i]['label'],
                    value: i,
                    dataType: "gcs_bam",
                    'data-build': $('#igv-build :selected').val(),
                    program: this.gcs_bam[i]['program']
                });
            }
            return tokens;
        },
        count: function() {
            return (Object.keys(this.gcs_bam).length);
        }
    };

    var selCamFiles = {
        slide_image: {},
        toTokens: function() {
            var tokens = [];
            for(var i in this.slide_image) {
                var img = this.slide_image[i];
                tokens.push({
                    label: img['label'],
                    value: i,
                    dataType: "slide_image",
                    sample: img['sample'],
                    case: img['case'],
                    project: img['project'],
                    disease_code: img['disease_code']
                });
            }
            return tokens;
        },
        count: function() {
            return (Object.keys(this.slide_image).length);
        }
    };

    // Set of display controls to update when we check or uncheck
    var update_on_selex_change = function() {
        // Update the hidden form control
        $('#checked_list_input').attr('value',JSON.stringify(selIgvFiles));
        $('#checked_list_input_camic').attr('value',JSON.stringify(selCamFiles));

        // Update the submit buttons
        $('input.igv[type="submit"]').prop('disabled', (selIgvFiles.count() <= 0));
        $('input.cam[type="submit"]').prop('disabled', (selCamFiles.count() <= 0));

        // Update the display counter
        $('.selected-count-igv').text(selIgvFiles.count());
        $('.selected-count-camic').text(selCamFiles.count());

        // Update the limit display
        $('.file-limit-igv').css('color', (selIgvFiles.count() < SEL_IGV_FILE_MAX ? "#000000" : "#BD12CC"));
        $('.file-limit-camic').css('color', (selCamFiles.count() < SEL_IGV_FILE_MAX ? "#000000" : "#BD12CC"));

        // If we've cleared out our tokenfield, re-display the placeholder
        selIgvFiles.count() <= 0 && $('#selected-files-igv-tokenfield').show();
        selCamFiles.count() <= 0 && $('#selected-files-camic-tokenfield').show();

        if(selIgvFiles.count() >= SEL_IGV_FILE_MAX) {
            $('#file-max-alert-igv').show();
            $('.filelist-panel input.igv.accessible[type="checkbox"]:not(:checked)').attr('disabled',true);
        } else {
            $('#file-max-alert-igv').hide();
            $('.filelist-panel input.igv.accessible[type="checkbox"]').attr('disabled',false);
        }
        if(selCamFiles.count() >= SEL_IGV_FILE_MAX) {
            $('#file-max-alert-cam').show();
            $('.filelist-panel input.cam.accessible[type="checkbox"]:not(:checked)').attr('disabled',true);
        } else {
            $('#file-max-alert-cam').hide();
            $('.filelist-panel input.cam.accessible[type="checkbox"]').attr('disabled',false);
        }
    };


    function build_igv_widgets() {
        // Build the file tokenizer for IGV
        // Bootstrap tokenfield requires 'value' as the datem attribute field
        $('#selected-files-igv').tokenfield({
            delimiter : " ",
            minLength: 2,
            limit: SEL_IGV_FILE_MAX,
            tokens: selIgvFiles.toTokens()
        // No creating
        }).on('tokenfield:edittoken',function(e){
            e.preventDefault();
            return false;
        }).on('tokenfield:removedtoken',function(e){

            // Uncheck the input checkbox - note this will not fire the event, which
            // is bound to form click
            var thisCheck = $('.filelist-panel input[value="'+e.attrs.value+'"');
            thisCheck.prop('checked',false);

            delete selIgvFiles[e.attrs.dataType][e.attrs.value];

            update_on_selex_change();

           //$('.filelist-panel input.igv[type="checkbox"]').attr('disabled',false);

        });

        // Prevent direct user input on the tokenfield
        $('#selected-files-igv-tokenfield').prop('disabled','disabled');

        $('.file-limit-igv').text(SEL_IGV_FILE_MAX);

        $('input.igv[type="submit"]').prop('disabled', true);
    }

    function build_camic_widgets() {
        // Build the file tokenizer for caMic
        // Bootstrap tokenfield requires 'value' as the datem attribute field
        $('#selected-files-cam').tokenfield({
            delimiter : " ",
            minLength: 2,
            limit: SEL_IGV_FILE_MAX,
            tokens: selCamFiles.toTokens()
        // No creating
        }).on('tokenfield:edittoken',function(e){
            e.preventDefault();
            return false;
        }).on('tokenfield:removedtoken',function(e){

            // Uncheck the input checkbox - note this will not fire the event, which
            // is bound to form click
            var thisCheck = $('.filelist-panel input[value="'+e.attrs.value+'"');
            thisCheck.prop('checked',false);

            delete selCamFiles[e.attrs.dataType][e.attrs.value];

            update_on_selex_change();

            $('.filelist-panel input.cam[type="checkbox"]').attr('disabled',false);
        });

        // Prevent direct user input on the tokenfield
        $('#selected-files-cam-tokenfield').prop('disabled','disabled');

        $('.file-limit-camic').text(SEL_IGV_FILE_MAX);

        $('input.cam[type="submit"]').prop('disabled', true);
    };

    var happy_name = function(input) {
        var dictionary = {
            'DNAseq_data': 'DNAseq',
            'Yes': 'GA',
            'No': 'N/A',
            'mirnPlatform': 'microRNA',
            'None': 'N/A',
            'IlluminaHiSeq_miRNASeq': 'HiSeq',
            'IlluminaGA_miRNASeq': 'GA',
            'cnvrPlatform': 'SNP/CN',
            'Genome_Wide_SNP_6': 'SNP6',
            'methPlatform': 'DNAmeth',
            'HumanMethylation27': '27k',
            'HumanMethylation450': '450k',
            'gexpPlatform': 'mRNA',
            'IlluminaHiSeq_RNASeq': 'HiSeq/BCGSC',
            'IlluminaHiSeq_RNASeqV2': 'HiSeq/UNC V2',
            'IlluminaGA_RNASeq': 'GA/BCGSC',
            'IlluminaGA_RNASeqV2': 'GA/UNC V2',
            'rppaPlatform': 'Protein',
            'MDA_RPPA_Core': 'RPPA'
        };
        if (input in dictionary) {
            return dictionary[input];
        } else if(input !== null && input !== undefined) {
            return input.replace(/_/g, ' ');
        } else {
            return "N/A";
        }

    };

    var reject_load = false;

    var browser_tab_load = function(cohort) {
        if (reject_load) {
            return;
        }
        var active_tab = $('ul.nav-tabs-files li.active a').data('file-type');
        var tab_selector ='#'+active_tab+'-files';
        if ($(tab_selector).length == 0) {
            reject_load = true;
            $('.tab-pane.data-tab').each(function() { $(this).removeClass('active'); });
            $('#placeholder').addClass('active');
            $('#placeholder').show();
            var data_tab_content_div = $('div.data-tab-content');
            var get_panel_url = BASE_URL + '/cohorts/filelist/'+cohort+'/panel/' + active_tab +'/';

            $.ajax({
                type        :'GET',
                url         : get_panel_url,
                success : function (data) {
                    data_tab_content_div.append(data);

                    update_download_link(active_tab);
                    update_table_display(active_tab, {'total_file_count': total_files, 'file_list': file_listing});

                    $('.tab-pane.data-tab').each(function() { $(this).removeClass('active'); });
                    $(tab_selector).addClass('active');
                    $('#placeholder').hide();

                    switch(active_tab) {
                        case 'camic':
                            build_camic_widgets();
                            break;
                        case 'igv':
                            build_igv_widgets();
                            break;
                        default:
                            break;
                    }
                },
                error: function () {
                    base.showJsMessage("error","Failed to load file browser panel.",true);
                    $('#placeholder').hide();
                },
                complete: function(xhr, status) {
                   reject_load = false;
                }
            })
        }
    };

    // Detect tab change and load the panel
    $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
        browser_tab_load(cohort_id);
    });
    $('a[data-toggle="tab"]').on('click', function (e) {
        if (reject_load) {
            e.preventDefault();
            e.stopPropagation();
        }
    });

    function update_download_link(active_tab) {
        var tab_selector = '#'+active_tab+'-files';
        var build = $(tab_selector).find('.build :selected').val();

        file_list_total = 0;

        // Calculate the file total based on the reported counts for any given filter (data_format used here)
        if($(tab_selector).find('div[data-filter-build="'+build+'"] input[data-feature-name="data_format"]:checked').length <= 0) {
             $(tab_selector).find('div[data-filter-build="'+build+'"] input[data-feature-name="data_format"]').each(function(i) {
               file_list_total += parseInt($(this).attr('data-count'));
            });
        } else {
            $(tab_selector).find('div[data-filter-build="'+build+'"] input[data-feature-name="data_format"]:checked').each(function(i) {
               file_list_total += parseInt($(this).attr('data-count'));
            });
        }

        if(file_list_total <= 0) {
            // Can't download/export something that isn't there
            $(tab_selector).find('.download-link .btn, .export-btn').attr('disabled','disabled');
        } else if(!HAS_USER_DATA) {
            $(tab_selector).find('.download-link .btn, .export-btn').removeAttr('disabled');
        }

        $(tab_selector).find('.file-list-total').text(file_list_total);

        if(file_list_total < FILE_LIST_MAX) {
            $(tab_selector).find('.file-list-warning').hide();
        } else {
            $(tab_selector).find('.file-list-warning').show();
        }

        // Clear the previous parameter settings from the export form, and re-add the build
        $('#export-to-bq-form, #export-to-gcs-form').find('input[name="build"]').remove();
        $('#export-to-bq-form , #export-to-gcs-form').append('<input class="param" type="hidden" name="build" value="'+build+'" />');

        var downloadToken = new Date().getTime();
        $('.filelist-obtain .download-token').val(downloadToken);

        if (SELECTED_FILTERS[active_tab] && Object.keys(SELECTED_FILTERS[active_tab][build]).length >0) {
            var filter_args = 'filters=' + encodeURIComponent(JSON.stringify(SELECTED_FILTERS[active_tab][build]));
            $(tab_selector).find('.download-link').attr('href', download_url + '?' + filter_args + '&downloadToken='+downloadToken+'&total=' + Math.min(FILE_LIST_MAX,file_list_total));
            $('#export-to-bq-form').append('<input class="param" type="hidden" name="filters" value="" />');
            $('#export-to-bq-form input[name="filters"]').attr('value',JSON.stringify(SELECTED_FILTERS[active_tab][build]));
        } else {
            $(tab_selector).find('.download-link').attr('href', download_url + '?downloadToken='+downloadToken+'&total=' + Math.min(FILE_LIST_MAX,file_list_total))
        }

        if(active_tab !== 'camic') {
            $(tab_selector).find('.download-link').attr('href',$(tab_selector).find('.download-link').attr('href')+'&build='+build);
        }
    };

    var update_table = function (active_tab, do_filter_count) {
        do_filter_count = (do_filter_count === undefined || do_filter_count === null ? true : do_filter_count);
        var tab_selector = '#'+active_tab+'-files';
        var build = $(tab_selector).find('.build :selected').val();
        if(active_tab == 'igv'){
            $('#igv-build').attr('value',build);
        }

        // Gather filters here
        var filters = {};
        var page = tab_page[active_tab];
        var files_per_page = tab_files_per_page[active_tab];
        var sort_column = tab_sort_column[active_tab][0];
        var sort_order = tab_sort_column[active_tab][1];
        var url = ajax_update_url[active_tab] + '?page=' + page +'&files_per_page=' + files_per_page +'&sort_column='+ sort_column +'&sort_order='+sort_order;

        if (SELECTED_FILTERS[active_tab] && Object.keys(SELECTED_FILTERS[active_tab][build]).length >0) {
            var filter_args = 'filters=' + encodeURIComponent(JSON.stringify(SELECTED_FILTERS[active_tab][build]));
            url += '&'+filter_args;
        }

        if(active_tab !== 'camic' && active_tab !== 'dicom') {
            url += '&build='+$(tab_selector).find('.build :selected').val();
        }

        $(tab_selector).find('.prev-page').addClass('disabled');
        $(tab_selector).find('.next-page').addClass('disabled');
        $(tab_selector).find('.filelist-panel .spinner i').removeClass('hidden');

        $.ajax({
            url: url,
            success: function (data) {
                update_download_link(active_tab);
                update_table_display(active_tab,data,do_filter_count);
            },
            error: function(e) {
                console.log(e);
                $(tab_selector).find('.filelist-panel .spinner i').addClass('hidden');
            }
        });

    };

    function update_table_display(active_tab, data, do_filter_count) {
        do_filter_count = (do_filter_count === undefined || do_filter_count === null ? true : do_filter_count);
        var page = tab_page[active_tab];
        var total_files = tab_count[active_tab];
        var tab_selector = '#'+active_tab+'-files';
        var files_per_page = tab_files_per_page[active_tab];
        var sort_column = tab_sort_column[active_tab];
        if(do_filter_count) {
            tab_count[active_tab] = total_files = data['total_file_count'];
        }
        var total_pages = Math.ceil(total_files / files_per_page);
        if (total_pages <= 0) {
            $(tab_selector).find('.file-page-count').hide();
            $(tab_selector).find('.no-file-page-count').show();
            $(tab_selector).find('.paginate_button_space').hide();
            $(tab_selector).find('.dataTables_length').addClass('disabled');
            $(tab_selector).find('.sortable_table th').addClass('disabled');
        } else {
            var page_list = pagination(page,total_pages);
            var html_page_button = "";
            for(let i of page_list){
                if(i === "..."){
                    html_page_button += "<span class='\ellipsis\'>...</span>"
                }
                else{
                    html_page_button += "<a class=\'paginate_button numeric_button"+ (i == page ? " current\'":"\'") +">" + i + "</a>";
                }
            }

            $(tab_selector).find('.file-page-count').show();
            $(tab_selector).find('.no-file-page-count').hide();
            $(tab_selector).find('.paginate_button_space').show();
            $(tab_selector).find('.dataTables_length').removeClass('disabled');
            $(tab_selector).find('.sortable_table th').removeClass('disabled');
            $(tab_selector).find('.filelist-panel .panel-body .total-file-count').html(total_files);
            $(tab_selector).find('.filelist-panel .panel-body .paginate_button_space').html(html_page_button);
        }

        $(tab_selector).find('.filelist-panel table tbody').empty();
        $(tab_selector).find('.sortable_table th:not(.sorting_disabled)').removeClass('sorting_asc sorting_desc').addClass('sorting');

        var files = data['file_list'];
        if(files.length <= 0) {
            $(tab_selector).find('.filelist-panel table tbody').append(
                '<tr>' +
                '<td colspan="9"><i>No file listings found in this cohort for this build.</i></td><td></td>'
            );
        }
        else {
            var first_page_entry = ((page - 1) * files_per_page) + 1;
            var last_page_entry = first_page_entry + files.length - 1;
            $(tab_selector).find('.showing').text(first_page_entry + " to " + last_page_entry);
            // set column sorting class
            $(tab_selector).find('.sortable_table th:not(.sorting_disabled)[columnId=\'' + tab_sort_column[active_tab][0] + '\']')
                .removeClass('sorting')
                .addClass(tab_sort_column[active_tab][1] ? 'sorting_desc' : 'sorting_asc');
        }

        for (var i = 0; i < files.length; i++) {
            if (!('datatype' in files[i])) {
                files[i]['datatype'] = '';
            }

            var val = "";
            var dataTypeName = '';
            var label = '';
            var tokenLabel = files[i]['sample']+", "+files[i]['exp_strat']+", "+happy_name(files[i]['platform'])+", "+files[i]['datatype'];
            var checkbox_inputs = '';
            var accessible = false;
            if (files[i]['access'] != 'controlled' || files[i]['user_access'] == 'True') {
                accessible = true;
            }

            if(active_tab !== 'all') {
                if (files[i]['cloudstorage_location'] && ((files[i]['dataformat'] == 'BAM') || (files[i]['datatype'] == 'Tissue slide image') || (files[i]['datatype'] == 'Diagnostic image'))) {
                    if(active_tab === 'igv' && files[i]['dataformat'] == 'BAM') {
                        val = files[i]['cloudstorage_location'] + ';' + files[i]['cloudstorage_location'].substring(0, files[i]['cloudstorage_location'].lastIndexOf("/") + 1) + files[i]['index_name'] + ',' + files[i]['sample'];
                        dataTypeName = "gcs_bam";
                        label = "IGV";
                        checkbox_inputs += '<input class="igv'+(accessible? ' accessible':'')+'" type="checkbox" token-label="' + tokenLabel + '" program="' + files[i]['program'] + '" name="' + dataTypeName + '" data-type="' + dataTypeName + '" value="' + val + '"';
                        if (!accessible) {
                            checkbox_inputs += ' disabled';
                        }
                        checkbox_inputs += '>';
                    } else if(active_tab === 'camic' && (files[i]['datatype'] == 'Tissue slide image' || files[i]['datatype'] == 'Diagnostic image')) {
                        val = files[i]['cloudstorage_location'].split('/').pop().split(/\./).shift();
                        files[i]['thumbnail'] = files[i]['cloudstorage_location'].split('/').slice(-2)[0];
                        dataTypeName = "slide_image";
                        label = "caMicro";
                        checkbox_inputs += '<input class="cam'+ (accessible? ' accessible':'') +'" type="checkbox" name="' + dataTypeName
                            + '" data-thumb="'+files[i]['thumbnail']+'" data-sub-type="'+files[i]['datatype']
                            + '" data-sample="' + files[i]['sample'] + '" data-case="' + files[i]['case']
                            + '" data-disease-code="' + files[i]['disease_code'] + '" data-project="' + files[i]['project']
                            + '" data-type="' + dataTypeName + '" value="' + val + '"';
                        if (!accessible) {
                            checkbox_inputs += ' disabled';
                        }
                        checkbox_inputs += '>';
                    }
                }
                files[i]['file_viewer'] = checkbox_inputs;
            }

            var row = '<tr>' +
                '<td>' + files[i]['program'] + '</td>' +
                '<td>' + files[i]['case'] + '</td>'
                + (active_tab !== 'dicom' ? '<td><div class="col-filename">' +
                    '<div>' + files[i]['filename'] + '</div>' +
                    '<div>[GDC ID: ' + files[i]['file_gdc_id'] + ']</div>' +
                '</div></td>' : '') +
                '<td>' + files[i]['disease_code'] + '</td>' +
                (active_tab === 'dicom' ? '<td>'+files[i]['project_short_name']+'</td>' : '') +
                (active_tab === 'dicom' ? '<td>'+files[i]['study_desc']+'</td>' : '') +
                (active_tab === 'dicom' ?
                    '<td><div class="study-uid">' +
                    '<a href="'+DICOM_URL+files[i]['study_uid']+'/" target="_blank">'+files[i]['study_uid']+
                        '<div class="osmisis" style="display: none;"><i>Open in Osimis Web Viewer</i></div></a>'+
                    '</div></td>' : '') +
                (active_tab === 'camic' ? (files[i]['thumbnail'] ? '<td><img src="'+IMG_THUMBS_URL+files[i]['thumbnail']+'/thmb_128x64.jpeg"></td>' : '<td></td>') : '') +
                (active_tab !== 'camic' && active_tab !== 'dicom' ? '<td>' + (files[i]['exp_strat'] || 'N/A') + '</td>' : '')+
                (active_tab !== 'camic' && active_tab !== 'dicom' ? '<td>' + happy_name(files[i]['platform']) + '</td>' : '')+
                (active_tab !== 'camic' && active_tab !== 'dicom' ? '<td>' + files[i]['datacat'] + '</td>' : '') +
                (active_tab !== 'dicom' ? '<td>' + files[i]['datatype'] + '</td><td>' + files[i]['dataformat'] + '</td>' : '') +
                (active_tab !== 'all' && active_tab !== 'dicom' ? (files[i]['file_viewer'] ? '<td>' + files[i]['file_viewer'] + '</td>' : '<td></td>') : '') +
            '</tr>';

            $(tab_selector).find('.filelist-panel .file-list-table tbody').append(row);

            // Remember any previous checks
            var thisCheck = $(tab_selector).find('.filelist-panel input[value="'+val+'"]');
            selIgvFiles[thisCheck.attr('data-type')] && selIgvFiles[thisCheck.attr('data-type')][thisCheck.attr('value')] && thisCheck.attr('checked', true);
            selCamFiles[thisCheck.attr('data-type')] && selCamFiles[thisCheck.attr('data-type')][thisCheck.attr('value')] && thisCheck.attr('checked', true);
        }

        // If we're at the max, disable all checkboxes which are not currently checked
        selIgvFiles.count() >= SEL_IGV_FILE_MAX && $(tab_selector).find('.filelist-panel input.igv.accessible[type="checkbox"]:not(:checked)').attr('disabled',true);
        selCamFiles.count() >= SEL_IGV_FILE_MAX && $(tab_selector).find('.filelist-panel input.cam.accessible[type="checkbox"]:not(:checked)').attr('disabled',true);

        // Update the Launch buttons
        $('#igv-viewer input[type="submit"]').prop('disabled', (selIgvFiles.count() <= 0));
        $('#camic-viewer input[type="submit"]').prop('disabled', (selCamFiles.count() <= 0));

        $('#selected-files-igv').tokenfield('setTokens',selIgvFiles.toTokens());
        $('#selected-files-cam').tokenfield('setTokens',selCamFiles.toTokens());

        // Bind event handler to checkboxes
        $(tab_selector).find('.filelist-panel input[type="checkbox"]').on('click', function() {

            var self=$(this);

            if(self.data('type') == 'slide_image') {
                if(self.is(':checked')) {
                    selCamFiles[self.data('type')][self.attr('value')] = {
                        'label': self.attr('value'),
                        'type': self.data('sub-type'),
                        'thumb': self.data('thumb'),
                        'sample': self.data('sample'),
                        'case': self.data('case'),
                        'disease_code': self.data('disease-code'),
                        'project': self.data('project'),

                    };
                    $('#selected-files-cam-tokenfield').hide();
                } else {
                    delete selCamFiles[self.attr('data-type')][self.attr('value')];
                }

                $('#selected-files-cam').tokenfield('setTokens',selCamFiles.toTokens());
            } else {
                if(self.is(':checked')) {
                    var build = $(tab_selector).find('.build :selected').val();
                    selIgvFiles[self.attr('data-type')][self.attr('value')] = {
                        'label': self.attr('token-label') + ' ['+build+']',
                        'program': self.attr('program'),
                        'build': build
                    };
                    $('#selected-files-igv-tokenfield').hide();
                } else {
                    delete selIgvFiles[self.attr('data-type')][self.attr('value')];
                }

                $('#selected-files-igv').tokenfield('setTokens',selIgvFiles.toTokens());
            }

            update_on_selex_change();
        });

        $(tab_selector).find('.prev-page').removeClass('disabled');
        $(tab_selector).find('.next-page').removeClass('disabled');
        if (parseInt(page) == 1) {
            $(tab_selector).find('.prev-page').addClass('disabled');
        }
        if (parseInt(page) * files_per_page >= total_files) {
            $(tab_selector).find('.next-page').addClass('disabled');
        }
        $(tab_selector).find('.filelist-panel .spinner i').addClass('hidden');

    };

    function goto_table_page(tab, page_no){
        tab_page[tab] = page_no;
        update_table(tab, false);
    }

    $('.data-tab-content').on('click', '.paginate_button', function () {
        var this_tab = $(this).parents('.data-tab').data('file-type');
        var page_no;
        if($(this).hasClass('next-page')){
            page_no = parseInt(tab_page[this_tab])+1;
        }
        else if($(this).hasClass('prev-page')){
            page_no = page_no == 1 ? 1 : tab_page[this_tab]-1;
        }
        else if($(this).hasClass('numeric_button')){
            if($(this).hasClass('current'))
                return;
            page_no = $(this).text();
        }
        else{
            page_no = 1;
        }
        goto_table_page(this_tab, page_no)
    });

    // change no of entries per page
    $('.data-tab-content').on('change', '.files-per-page', function () {
        var this_tab = $(this).parents('.data-tab').data('file-type');
        tab_files_per_page[this_tab] = $('#'+this_tab+'-files').find('.files-per-page :selected').val();
        goto_table_page(this_tab, 1);
    });

    // change column sorting
    $('.data-tab-content').on('click', '.sortable_table th:not(.sorting_disabled)', function () {
        var this_tab = $(this).parents('.data-tab').data('file-type');
        var column = $(this).attr("columnId");
        var order = $(this).is('.sorting, .sorting_desc') ? 0 : 1;
        tab_sort_column[this_tab] = [column, order];
        update_table(this_tab, false);
    });

    // Show more/less links on categories with >6 fiilters
    $('.data-tab-content').on('click', '.show-more', function() {
        $(this).parent().siblings('li.extra-values').show();
        $(this).parent().siblings('.less-checks').show();
        $(this).parent().hide();
    });
    $('.data-tab-content').on('click', '.show-less', function() {
        $(this).parent().siblings('li.extra-values').hide();
        $(this).parent().siblings('.more-checks').show();
        $(this).parent().hide();
    });

    $('.data-tab-content').on('change','.build', function(){
        var this_tab = $(this).parents('.data-tab').data('file-type');
        $('#'+this_tab+'-files').find('.filter-build-panel').hide();
        update_displays(this_tab);
        $('#'+this_tab+'-filter-panel-'+$(this).find(':selected').val()).show();

        if(this_tab == 'igv') {
            // Remove any selected files not from this build
            var new_build = $('#'+this_tab+'-files').find('.build :selected').val();
            var selCount = Object.keys(selIgvFiles.gcs_bam).length;
            for (var i in selIgvFiles.gcs_bam) {
                if (selIgvFiles.gcs_bam.hasOwnProperty(i)) {
                    if (selIgvFiles.gcs_bam[i].build !== new_build) {
                        delete selIgvFiles.gcs_bam[i];
                        $('.filelist-panel input[value="' + i + '"').prop('checked', false);
                    }
                }
            }
            if (Object.keys(selIgvFiles.gcs_bam).length !== selCount) {
                $('#selected-files-igv').tokenfield('setTokens', selIgvFiles.toTokens());
                update_on_selex_change();
            }
            $('#igv-form-build').attr("value",new_build);
        }
    });

    function update_filters(checked) {
        var type_tab = checked.parents('.data-tab.active')[0];
        var active_tab = $(type_tab).data('file-type');
        var build = $('#'+active_tab+'-files').find('.build :selected').val();
        SELECTED_FILTERS[active_tab][build] = {};

        $(type_tab).find('div[data-filter-build="'+build+'"] input[type="checkbox"]:checked').each(function(){
            if(!SELECTED_FILTERS[active_tab][build][$(this).data('feature-name')]) {
                SELECTED_FILTERS[active_tab][build][$(this).data('feature-name')] = [];
            }
            SELECTED_FILTERS[active_tab][build][$(this).data('feature-name')].push($(this).data('value-name'));
        });
        tab_page[active_tab] = 1;
    };

    function enqueueUpdate(active_tab){
        UPDATE_QUEUE.push(function(){
            update_displays(active_tab);
        });
    };

    function dequeueUpdate(){
        if(UPDATE_QUEUE.length > 0) {
            UPDATE_QUEUE.shift()();
        }
    };

    function pagination(c, m) {
        var current = parseInt(c),
            last = m,
            delta = 2,
            left = current - delta,
            right = current + delta + 1,
            range = [],
            rangeWithDots = [],
            l;
        for (var i = 1; i <= last; i++) {
            if (i == 1 || i == last || i >= left && i < right) {
                range.push(i);
            }
        }
        for(let i of range) {
            if (l) {
                if (i - l === 2) {
                    rangeWithDots.push(l + 1);
                } else if (i - l !== 1) {
                    rangeWithDots.push('...');
                }
            }
            rangeWithDots.push(i);
            l = i;
        }
        return rangeWithDots;
    };

    var update_displays = function(active_tab) {
        // If a user has clicked more filters while an update was going out, queue up a future update and return
        if(UPDATE_PENDING) {
            // We only need to queue one update because our updates don't pull the filter set until they run
            if(UPDATE_QUEUE.length <= 0) {
                enqueueUpdate(active_tab);
            }
            return;
        }

        // If there's an update ready to fire and waiting for additional input, clear it...
        (update_displays_thread !== null) && clearTimeout(update_displays_thread);

        // ...and replace it with a new one
        update_displays_thread = setTimeout(function(){
            var build = $('#'+active_tab+'-files').find('.build :selected').val();
            var files_per_page = tab_files_per_page[active_tab];
            var url = ajax_update_url[active_tab] + '?build=' + build +'&files_per_page=' +files_per_page;
            if(SELECTED_FILTERS[active_tab] && Object.keys(SELECTED_FILTERS[active_tab][build]).length > 0) {
                url += '&filters=' + encodeURIComponent(JSON.stringify(SELECTED_FILTERS[active_tab][build]));
            }
            UPDATE_PENDING = true;
            $('#'+active_tab+'-files').find('.filelist-panel .spinner i').removeClass('hidden');
            $.ajax({
                type: 'GET',
                url: url,
                success: function(data) {
                    for(var i=0; i <  data.metadata_data_attr.length; i++){
                        var this_attr = data.metadata_data_attr[i];
                        for(var j=0; j < this_attr.values.length; j++) {
                            var this_val = this_attr.values[j];
                            $('#'+active_tab+'-'+data.build+'-'+this_attr.name+'-'+this_val.value).siblings('span.count').html('('+this_val.count+')');
                            $('#'+active_tab+'-'+data.build+'-'+this_attr.name+'-'+this_val.value).attr('data-count',this_val.count);
                        }
                    }
                    update_download_link(active_tab);
                    update_table_display(active_tab, data);
                },
                error: function() {

                }
            }).then(
                    function(){
                        UPDATE_PENDING = false;
                        dequeueUpdate();
                    }
                );
            },SUBSEQUENT_DELAY);
    };

    $('.data-tab-content').on('change','.filter-panel input[type="checkbox"]',function(){
        update_filters($(this));
        update_displays($('ul.nav-tabs-files li.active a').data('file-type'));
    });

    // Click events for 'Check All/Uncheck All' in filter categories
    $('.data-tab-content').on('click', '.check-all', function(){
        $(this).parent().parent().siblings('.checkbox').find('input').prop('checked',true);
        update_filters($($(this).parent().parent().siblings('.checkbox').find('input')[0]));
        update_displays($('ul.nav-tabs-files li.active a').data('file-type'));
    });
    $('.data-tab-content').on('click', '.uncheck-all', function(){
        $(this).parent().parent().siblings('.checkbox').find('input').prop('checked',false);
        update_filters($($(this).parent().parent().siblings('.checkbox').find('input')[0]));
        update_displays($('ul.nav-tabs-files li.active a').data('file-type'));
    });

    browser_tab_load(cohort_id);

    $('.data-tab-content').on('click', '.download-btn', function() {
        var self=$(this);
        var msg = $('#download-in-prog');

        self.attr('disabled','disabled');
        msg.show();

        base.blockResubmit(function() {
            self.removeAttr('disabled');
            msg.hide();
        },$('.filelist-obtain .download-token').val(),"downloadToken");
    });



    $('.data-tab-content').on('click','.download-link',function(e) {
        var type_tab = $(this).parents('.data-tab.active')[0];
        var active_tab = $(type_tab).data('file-type');

        if(parseInt($('.file-list-total').text()) > FILE_LIST_MAX) {
            $('#'+active_tab+'-files').find('.file-list-warning').show();
            e.preventDefault();
            return false;
        } else {
            $('#'+active_tab+'-files').find('.file-list-warning').hide();
        }
    });

    $('.data-tab-content').on('hover enter mouseover','.study-uid',function(e){
        $(this).find('.osmisis').show();
    });

    $('.data-tab-content').on('leave mouseout mouseleave','.study-uid',function(e){
        $(this).find('.osmisis').hide();
    });

});
