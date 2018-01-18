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
        tokenfield: 'libs/bootstrap-tokenfield.min'
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'session_security': ['jquery'],
        'tokenfield': ['jquery', 'jqueryui']
    }
});

require([
    'jquery',
    'jqueryui',
    'bootstrap',
    'session_security',
    'tokenfield'
], function ($) {

    // For manaaging filter changes
    var UPDATE_PENDING = false;
    var SUBSEQUENT_DELAY = 600;
    var update_displays_thread = null;
    var UPDATE_QUEUE = [];

    var SELECTED_FILTERS = {
        'all': {},
        'igv': {}
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
                tokens.push({
                    label: this.slide_image[i]['label'],
                    value: i,
                    dataType: "slide_image"
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
            $('.filelist-panel input.igv[type="checkbox"]:not(:checked)').attr('disabled',true);
        } else {
            $('#file-max-alert-igv').hide();
            $('.filelist-panel input.igv[type="checkbox"]').attr('disabled',false);
        }
        if(selCamFiles.count() >= SEL_IGV_FILE_MAX) {
            $('#file-max-alert-cam').show();
            $('.filelist-panel input.cam[type="checkbox"]:not(:checked)').attr('disabled',true);
        } else {
            $('#file-max-alert-cam').hide();
            $('.filelist-panel input.cam[type="checkbox"]').attr('disabled',false);
        }
    };

    var update_on_platform_filter_change = function(e) {

        var totalSel = 0;

        if($('input[name="platform-selected"]:checked').length <= 0) {
            $('input[name="platform-selected"]').each(function(i) {
               totalSel += parseInt($(this).attr('data-platform-count'));
            });
        } else {
            $('input[name="platform-selected"]:checked').each(function(i) {
               totalSel += parseInt($(this).attr('data-platform-count'));
            });
        }
        $('.file-list-limit').text(FILE_LIST_MAX);
        $('.file-list-total').text(totalSel);

        if(totalSel < FILE_LIST_MAX) {
            $('#file-list-warning').hide();
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

           $('.filelist-panel input.igv[type="checkbox"]').attr('disabled',false);

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

    var update_table = function (active_tab) {
        var tab_selector = '#'+active_tab+'-files';
        if(active_tab == 'igv'){
            $('#igv-build').attr('value',$(tab_selector).find('.build :selected').val());
        }

        // Gather filters here
        var filters = {};

        var url = ajax_update_url[active_tab] + '?page=' + page;
        
        file_list_total = 0;

        // Calculate the file total based on the reported counts for any given filter (data_format used here)
        if($('input[data-feature-name="all-data_format"]:checked').length <= 0) {
             $('input[data-feature-name="all-data_format"]').each(function(i) {
               file_list_total += parseInt($(this).data('count'));
            });
        } else {
            $('input[data-feature-name="all-data_format"]:checked').each(function(i) {
               file_list_total += parseInt($(this).data('count'));
            });
        }        

        if (Object.keys(SELECTED_FILTERS[active_tab]).length >0) {
            var filter_args = 'filters=' + encodeURIComponent(JSON.stringify(SELECTED_FILTERS[active_tab]));
            url += '&'+filter_args;
            $(tab_selector).find('.download-link').attr('href', download_url + '?' + filter_args + '&total=' + file_list_total);
        } else {
            $(tab_selector).find('.download-link').attr('href', download_url + '?total=' + file_list_total)
        }

        if(active_tab !== 'camic') {
            $(tab_selector).find('.download-link').attr('href',$(tab_selector).find('.download-link').attr('href')+'&build='+$(tab_selector).find('.build :selected').val());
            url += '&build='+$(tab_selector).find('.build :selected').val();
        }

        $(tab_selector).find('.prev-page').addClass('disabled');
        $(tab_selector).find('.next-page').addClass('disabled');
        $(tab_selector).find('.content-panel .spinner i').removeClass('hidden');

        $.ajax({
            url: url,
            success: function (data) {
                update_table_display(active_tab,data);
            },
            error: function(e) {
                console.log(e);
                $(tab_selector).find('.content-panel .spinner i').addClass('hidden');
            }
        });

    };

    function update_table_display(active_tab, data) {
        var tab_selector = '#'+active_tab+'-files';
        var total_files = data['total_file_count'];
        var total_pages = Math.ceil(total_files / 20);
        if(total_pages <= 0) {
            $(tab_selector).find('.file-page-count').hide();
            $(tab_selector).find('.no-file-page-count').show();
        } else {
            $(tab_selector).find('.file-page-count').show();
            $(tab_selector).find('.no-file-page-count').hide();
            $(tab_selector).find('.filelist-panel .panel-body .file-count').html(total_pages);
            $(tab_selector).find('.filelist-panel .panel-body .page-num').html(page);
        }

        var files = data['file_list'];
        $(tab_selector).find('.filelist-panel table tbody').empty();

        if(files.length <= 0) {
            $(tab_selector).find('.filelist-panel table tbody').append(
                '<tr>' +
                '<td colspan="6"><i>No file listings found in this cohort for this build.</i></td><td></td>'
            );
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
            var disable = true;
            if (files[i]['access'] != 'controlled' || files[i]['user_access'] == 'True') {
                disable = false;
            }

            if(active_tab !== 'all') {
                if (files[i]['cloudstorage_location'] && ((files[i]['dataformat'] == 'BAM') || (files[i]['datatype'] == 'Tissue slide image') || (files[i]['datatype'] == 'Diagnostic image'))) {
                    if(active_tab === 'igv' && files[i]['dataformat'] == 'BAM') {
                        val = files[i]['cloudstorage_location'] + ';' + files[i]['cloudstorage_location'].substring(0, files[i]['cloudstorage_location'].lastIndexOf("/") + 1) + files[i]['index_name'] + ',' + files[i]['sample'];
                        dataTypeName = "gcs_bam";
                        label = "IGV";
                        checkbox_inputs += '<label><input class="igv" type="checkbox" token-label="' + tokenLabel + '" program="' + files[i]['program'] + '" name="' + dataTypeName + '" data-type="' + dataTypeName + '" value="' + val + '"';
                        if (disable) {
                            checkbox_inputs += ' disabled="disabled"';
                        }
                        checkbox_inputs += '> '+label+'</label>';
                    } else if(active_tab === 'camic' && (files[i]['datatype'] == 'Tissue slide image' || files[i]['datatype'] == 'Diagnostic image')) {
                        val = files[i]['cloudstorage_location'].split('/').pop().split(/\./).shift();
                        files[i]['thumbnail'] = files[i]['cloudstorage_location'].split('/').slice(-2)[0];
                        dataTypeName = "slide_image";
                        label = "caMicro";
                        checkbox_inputs += '<label><input class="cam" type="checkbox" name="' + dataTypeName + '" data-thumb="'+files[i]['thumbnail']+'" data-sub-type="'+files[i]['datatype']+'" data-type="' + dataTypeName + '" value="' + val + '"';
                        if (disable) {
                            checkbox_inputs += ' disabled="disabled"';
                        }
                        checkbox_inputs += '> '+label+'</label>';
                    }
                }
                files[i]['file_viewer'] = checkbox_inputs;
            }

            var row = '<tr>' +
                '<td>' + files[i]['program'] + '</td>' +
                '<td>' + files[i]['sample'] + '</td>' +
                '<td>' + files[i]['disease_code'] + '</td>' +
                (active_tab === 'camic' ? (files[i]['thumbnail'] ? '<td><img src="'+IMG_THUMBS_URL+files[i]['thumbnail']+'/thmb_128x64.jpeg"></td>' : '<td></td>') : '') +
                (active_tab !== 'camic' ? '<td>' + (files[i]['exp_strat'] || 'N/A') + '</td>' : '')+
                (active_tab !== 'camic' ? '<td>' + happy_name(files[i]['platform']) + '</td>' : '')+
                (active_tab !== 'camic' ? '<td>' + files[i]['datacat'] + '</td>' : '') +
                '<td>' + files[i]['datatype'] + '</td>' +
                '<td>' + files[i]['dataformat'] + '</td>' +
                (active_tab !== 'all' ? (files[i]['file_viewer'] ? '<td>' + files[i]['file_viewer'] + '</td>' : '<td></td>') : '') +
            '</tr>';

            $(tab_selector).find('.filelist-panel table tbody').append(row);

            // Remember any previous checks
            var thisCheck = $(tab_selector).find('.filelist-panel input[value="'+val+'"]');
            selIgvFiles[thisCheck.attr('data-type')] && selIgvFiles[thisCheck.attr('data-type')][thisCheck.attr('value')] && thisCheck.attr('checked', true);
            selCamFiles[thisCheck.attr('data-type')] && selCamFiles[thisCheck.attr('data-type')][thisCheck.attr('value')] && thisCheck.attr('checked', true);
        }

        // If we're at the max, disable all checkboxes which are not currently checked
        selIgvFiles.count() >= SEL_IGV_FILE_MAX && $(tab_selector).find('.filelist-panel input.igv[type="checkbox"]:not(:checked)').attr('disabled',true);
        selCamFiles.count() >= SEL_IGV_FILE_MAX && $(tab_selector).find('.filelist-panel input.cam[type="checkbox"]:not(:checked)').attr('disabled',true);

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
                        'thumb': self.data('thumb')
                    };
                    $('#selected-files-cam-tokenfield').hide();
                } else {
                    delete selCamFiles[self.attr('data-type')][self.attr('value')];
                }

                $('#selected-files-cam').tokenfield('setTokens',selCamFiles.toTokens());
            } else {
                if(self.is(':checked')) {
                    selIgvFiles[self.attr('data-type')][self.attr('value')] = {
                        'label': self.attr('token-label') + ' ['+$('#build :selected').val()+']',
                        'program': self.attr('program'),
                        'build': $('#build :selected').val()
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
        if (parseInt(page) * 20 > total_files) {
            $(tab_selector).find('.next-page').addClass('disabled');
        }
        $(tab_selector).find('.content-panel .spinner i').addClass('hidden');


        var build = $(tab_selector).find('.build :selected').val();
        // Update the platform build set
        if($('#platform-'+build).length <= 0) {
            // We need to make this selection set
            $('#platforms-panel').append(
                '<ul class="search-checkbox-list platform-counts" id="platform-'+build+'"></ul>'
            );
        }

        $('#platform-'+build).show();
    };

    // Next page button click
    $('.data-tab-content').on('click', '.next-page', function () {
        var this_tab = $(this).parents('.data-tab').data('file-type');
        page = page + 1;
        update_table(this_tab);
    });

    // Previous page button click
    $('.data-tab-content').on('click', '.prev-page', function () {
        var this_tab = $(this).parents('.data-tab').data('file-type');
        page = page - 1;
        update_table(this_tab);
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

    $('#build').on('change',function(){
        update_table();
    });

    $('#filter-panel input[type="checkbox"]').on('change', function() {
        page = 1;

        var totalSel = 0;

        if($('input[name="platform-selected"]:checked').length <= 0) {
            $('input[name="platform-selected"]').each(function(i) {
               totalSel += parseInt($(this).attr('data-platform-count'));
            });
        } else {
            $('input[name="platform-selected"]:checked').each(function(i) {
               totalSel += parseInt($(this).attr('data-platform-count'));
            });
        }

        $('.file-list-total').text(totalSel);

        if(totalSel < FILE_LIST_MAX) {
            $('#file-list-warning').hide();
        }

        update_table();
    });

    $('#download-link').on('click',function(e) {

        update_on_platform_filter_change();

        if(parseInt($('.file-list-total').text()) > FILE_LIST_MAX) {
            $('#file-list-warning').show();
            e.preventDefault();
            return false;
        } else {
            $('#file-list-warning').hide();
        }
    });

    $('#build').on('change',function(){
        // Remove any selected files not from this build
        var new_build = $('#build :selected').val();
        var selCount = Object.keys(selIgvFiles.gcs_bam).length;
        for(var i in selIgvFiles.gcs_bam) {
            if(selIgvFiles.gcs_bam.hasOwnProperty(i)) {
                if(selIgvFiles.gcs_bam[i].build !== new_build){
                    delete selIgvFiles.gcs_bam[i];
                    $('.filelist-panel input[value="'+i+'"').prop('checked',false);
                }
            }
        }
        if(Object.keys(selIgvFiles.gcs_bam).length !== selCount) {
            $('#selected-files-igv').tokenfield('setTokens',selIgvFiles.toTokens());
            update_on_selex_change();
        }
    });

    function update_filters(checked) {
        var type_tab = checked.parents('.data-tab.active')[0];
        var active_tab = $(type_tab).data('file-type');
        SELECTED_FILTERS[active_tab] = {};

        $(type_tab).find('input[type="checkbox"]:checked').each(function(){
            if(!SELECTED_FILTERS[active_tab][$(this).data('feature-name')]) {
                SELECTED_FILTERS[active_tab][$(this).data('feature-name')] = [];
            }
            SELECTED_FILTERS[active_tab][$(this).data('feature-name')].push($(this).data('value-name'));
        });
    };

    function enqueueUpdate(){
        UPDATE_QUEUE.push(function(){
            update_displays();
        });
    };

    function dequeueUpdate(){
        if(UPDATE_QUEUE.length > 0) {
            UPDATE_QUEUE.shift()();
        }
    };

    var update_displays = function(active_tab) {
        // If a user has clicked more filters while an update was going out, queue up a future update and return
        if(UPDATE_PENDING) {
            // We only need to queue one update because our updates don't pull the filter set until they run
            if(UPDATE_QUEUE.length <= 0) {
                enqueueUpdate();
            }
            return;
        }

        // If there's an update ready to fire and waiting for additional input, clear it...
        (update_displays_thread !== null) && clearTimeout(update_displays_thread);

        // ...and replace it with a new one
        update_displays_thread = setTimeout(function(){
            var url = ajax_update_url[active_tab] + '?build=' + $('#'+active_tab+'-files').find('.build :selected').val();
            if(Object.keys(SELECTED_FILTERS[active_tab]).length > 0) {
                url += '&filters=' + encodeURIComponent(JSON.stringify(SELECTED_FILTERS[active_tab]));
            }
            UPDATE_PENDING = true;
            $.ajax({
                type: 'GET',
                url: url,
                success: function(data) {
                    for(var i=0; i <  data.metadata_data_attr.length; i++){
                        var this_attr = data.metadata_data_attr[i];
                        for(var j=0; j < this_attr.values.length; j++) {
                            var this_val = this_attr.values[j];
                            $('#'+active_tab+'-'+this_attr.name+'-'+this_val.value).siblings('span.count').html('('+this_val.count+')');
                        }
                    }
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

    $('.data-tab-content').on('click','.filter-panel input[type="checkbox"]',function(){
        update_filters($(this));
        update_displays($('ul.nav-tabs-files li.active a').data('file-type'));
    });

    browser_tab_load(cohort_id);

});
