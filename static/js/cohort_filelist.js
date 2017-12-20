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
        tissue_slide_image: {},
        toTokens: function() {
            var tokens = [];
            for(var i in this.tissue_slide_image) {
                tokens.push({
                    label: this.tissue_slide_image[i]['label'],
                    value: i,
                    dataType: "tissue_slide_image"
                });
            }
            return tokens;
        },
        count: function() {
            return (Object.keys(this.tissue_slide_image).length);
        }
    };

    // Set of display controls to update when we check or uncheck
    var update_on_selex_change = function() {
        // Update the hidden form control
        $('#checked_list_input').attr('value',JSON.stringify(selIgvFiles));
        $('#checked_list_input_camic').attr('value',JSON.stringify(selCamFiles));

        // Update the submit buttons
        $('#igv-viewer input[type="submit"]').prop('disabled', (selIgvFiles.count() <= 0));
        $('#camic-viewer input[type="submit"]').prop('disabled', (selCamFiles.count() <= 0));

        // Update the display counter
        $('.selected-count-igv').text(selIgvFiles.count());
        $('.selected-count-camic').text(selCamFiles.count());

        // Update the limit display
        $('#selected-file-limit-igv').css('color', (selIgvFiles.count() < SEL_IGV_FILE_MAX ? "#000000" : "#BD12CC"));
        $('#selected-file-limit-camic').css('color', (selCamFiles.count() < SEL_IGV_FILE_MAX ? "#000000" : "#BD12CC"));

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

    $('.file-limit-igv').text(SEL_IGV_FILE_MAX);
    $('.file-limit-camic').text(SEL_IGV_FILE_MAX);

    // Our file list tokenizer
    var selIgvFileField = $('#selected-files-igv');
    var selCamFilesField = $('#selected-files-cam');

    // Build the file tokenizer for IGV
    // Bootstrap tokenfield requires 'value' as the datem attribute field
    selIgvFileField.tokenfield({
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

        if(selIgvFiles.count() <= SEL_IGV_FILE_MAX) {
            $('.filelist-panel input[type="checkbox"]').attr('disabled',false);
        }
    });

    // Build the file tokenizer for caMic
    // Bootstrap tokenfield requires 'value' as the datem attribute field
    selCamFilesField.tokenfield({
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
    $('#selected-files-tokenfield').prop('disabled','disabled');

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

    var update_table = function () {
        $('#igv-build').attr('value',$('#build :selected').val());
        var selector_list = [];
        $('#filter-panel input[type="checkbox"]:checked').each(function() {
            selector_list.push($(this).attr('id'));
        });
        var url = ajax_update_url + '?page=' + page;
        
        file_list_total = 0;
        
        if($('input[name="platform-selected"]:checked').length <= 0) {
             $('input[name="platform-selected"]').each(function(i) {
               file_list_total += parseInt($(this).attr('data-platform-count'));
            });
        } else {
            $('input[name="platform-selected"]:checked').each(function(i) {
               file_list_total += parseInt($(this).attr('data-platform-count'));
            });
        }        
        
        
        if (selector_list.length) {
            var param_list = '';
            for (var selector in selector_list) {
                param_list += '&' + selector_list[selector] + '=True';
            }
            url += param_list;
            $('#download-link').attr('href', download_url + '?' + param_list + '&total=' + file_list_total);
        } else {
            $('#download-link').attr('href', download_url + '?total=' + file_list_total)
        }

        $('#download-link').attr('href',$('#download-link').attr('href')+'&build='+$('#build :selected').val());
        url += '&build='+$('#build :selected').val();

        $('#prev-page').addClass('disabled');
        $('#next-page').addClass('disabled');
        $('#content-panel .spinner i').removeClass('hidden');
        $.ajax({
            url: url,
            success: function (data) {
                total_files = data['total_file_count'];
                var total_pages = Math.ceil(total_files / 20);
                if(total_pages <= 0) {
                    $('.file-page-count').hide();
                    $('.no-file-page-count').show();
                } else {
                    $('.file-page-count').show();
                    $('.no-file-page-count').hide();
                    $('.filelist-panel .panel-body .file-count').html(total_pages);
                    $('.filelist-panel .panel-body .page-num').html(page);
                }

                var files = data['file_list'];
                $('.filelist-panel table tbody').empty();

                if(files.length <= 0) {
                    $('.filelist-panel table tbody').append(
                        '<tr>' +
                        '<td colspan="6"><i>No file listings found in this cohort for this build.</i></td><td></td>'
                    );
                }

                for (var i = 0; i < files.length; i++) {
                    if (!('datatype' in files[i])) {
                        files[i]['datatype'] = '';
                    }

                    var val = null;
                    var dataTypeName = '';
                    var label = '';
                    var tokenLabel = files[i]['sample']+", "+files[i]['exp_strat']+", "+happy_name(files[i]['platform'])+", "+files[i]['datatype'];
                    var checkbox_inputs = '';
                    var disable = true;
                    if (files[i]['access'] != 'controlled' || files[i]['user_access'] == 'True') {
                        disable = false;
                    }

                    if (files[i]['cloudstorage_location'] && ((files[i]['cloudstorage_location'].split('.').pop() == 'bam') || (files[i]['datatype'] == 'Tissue slide image') || (files[i]['datatype'] == 'Diagnostic image'))) {
                        if(files[i]['cloudstorage_location'].split('.').pop() == 'bam') {
                            val = files[i]['cloudstorage_location'] + ';' + files[i]['cloudstorage_location'].substring(0, files[i]['cloudstorage_location'].lastIndexOf("/") + 1) + files[i]['index_name'] + ',' + files[i]['sample'];
                            dataTypeName = "gcs_bam";
                            label = "IGV";
                            checkbox_inputs += '<label><input class="igv" type="checkbox" token-label="' + tokenLabel + '" program="' + files[i]['program'] + '" name="' + dataTypeName + '" data-type="' + dataTypeName + '" value="' + val + '"';
                        } else {
                            val = files[i]['cloudstorage_location'].split('/').pop().split(/\./).shift();
                            dataTypeName = "tissue_slide_image";
                            label = "caMicro";
                            checkbox_inputs += '<label><input class="cam" type="checkbox" name="' + dataTypeName + '" data-type="' + dataTypeName + '" value="' + val + '"';
                        }
                        if (disable) {
                            checkbox_inputs += ' disabled="disabled"';
                        }
                        checkbox_inputs += '> '+label+'</label>';
                    }

                    files[i]['file_viewer'] = checkbox_inputs;

                    $('.filelist-panel table tbody').append(
                        '<tr>' +
                        '<td>' + files[i]['program'] + '</td>' +
                        '<td>' + files[i]['sample'] + '</td>' +
                        '<td>' + (files[i]['exp_strat'] || 'N/A') + '</td>' +
                        '<td>' + happy_name(files[i]['platform']) + '</td>' +
                        '<td>' + files[i]['datacat'] + '</td>' +
                        '<td>' + files[i]['datatype'] + '</td>' +
                        '<td>' + files[i]['file_viewer'] + '</td>' +
                        '</tr>'
                    );

                    // Remember any previous checks
                    var thisCheck = $('.filelist-panel input[value="'+val+'"');
                    selIgvFiles[thisCheck.attr('data-type')] && selIgvFiles[thisCheck.attr('data-type')][thisCheck.attr('value')] && thisCheck.attr('checked', true);
                }

                // If we're at the max, disable all checkboxes which are not currently checked
                selIgvFiles.count() >= SEL_IGV_FILE_MAX && $('.filelist-panel input[type="checkbox"]:not(:checked)').attr('disabled',true);

                selIgvFileField.tokenfield('setTokens',selIgvFiles.toTokens());
                selCamFilesField.tokenfield('setTokens',selCamFiles.toTokens());

                // If there are checkboxes for igv, show the "Launch IGV" button
                if (selIgvFiles.count() > 0 || $('.filelist-panel input[type="checkbox"]').length > 0) {
                    $('input[type="submit"]').show();
                } else {
                    $('input[type="submit"]').hide();
                }

                // Bind event handler to checkboxes
                $('.filelist-panel input[type="checkbox"]').on('click', function() {

                    var self=$(this);

                    if(self.data('type') == 'tissue_slide_image') {
                        if(self.is(':checked')) {
                            selCamFiles[self.attr('data-type')][self.attr('value')] = {
                                'label': self.attr('value')
                            };
                            $('#selected-files-cam-tokenfield').hide();
                        } else {
                            delete selCamFiles[self.attr('data-type')][self.attr('value')];
                        }

                        selCamFilesField.tokenfield('setTokens',selCamFiles.toTokens());
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

                        selIgvFileField.tokenfield('setTokens',selIgvFiles.toTokens());
                    }

                    update_on_selex_change();
                });

                $('#prev-page').removeClass('disabled');
                $('#next-page').removeClass('disabled');
                if (parseInt(page) == 1) {
                    $('#prev-page').addClass('disabled');
                }
                if (parseInt(page) * 20 > total_files) {
                    $('#next-page').addClass('disabled');
                }
                $('#content-panel .spinner i').addClass('hidden');


                var build = $('#build :selected').val();
                // Update the platform build set
                if($('#platform-'+build).length <= 0) {
                    // We need to make this selection set
                    $('#platforms-panel').append(
                        '<ul class="search-checkbox-list platform-counts" id="platform-'+build+'"></ul>'
                    );

                    if(Object.keys(data.platform_count_list).length <= 0) {
                        $('#platform-'+build).append(
                            '<i>No platforms available to list.</i>'
                        );
                    }
                    for(var i in data.platform_count_list) {
                        if(data.platform_count_list.hasOwnProperty(i)) {
                            var platform = data.platform_count_list[i];
                            $('#platform-'+build).append(
                                '<li><input data-platform-count="'+platform['count']+'" type="checkbox" name="platform-selected" '+
                                    'id="'+platform['platform']+'"><label for="'+platform['platform']+'">'+platform['platform']+'</label><span class="count">('+platform['count']+')</span></li>'
                            );
                        }
                    }
                }
                $('.platform-counts').hide();
                $('#platform-'+build).show();
            },
            error: function(e) {
                console.log(e);
                $('#content-panel .spinner i').addClass('hidden');
            }
        })
    };

    // Next page button click
    $('#next-page').on('click', function () {
        page = page + 1;
        update_table();
    });

    // Previous page button click
    $('#prev-page').on('click', function () {
        page = page - 1;
        update_table();
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

    $('input[type="submit"]').prop('disabled', true);
    $('input[type="submit"]').hide();
    update_table();

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
            selIgvFileField.tokenfield('setTokens',selIgvFiles.toTokens());
            update_on_selex_change();
        }
    });
});
