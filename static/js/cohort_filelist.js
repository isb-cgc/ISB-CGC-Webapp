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
    baseUrl: '/static/js/',
    paths: {
        jquery: 'libs/jquery-1.11.1.min',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        session_security: 'session_security',
        underscore: 'libs/underscore-min',
        assetscore: 'libs/assets.core',
        assetsresponsive: 'libs/assets.responsive',
        tokenfield: 'libs/bootstrap-tokenfield.min',
        d3: 'libs/d3.min',
        d3tip: 'libs/d3-tip',

    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'session_security': ['jquery'],
        'assetscore': ['jquery', 'bootstrap', 'jqueryui'],
        'assetsresponsive': ['jquery', 'bootstrap', 'jqueryui'],
        'tokenfield': ['jquery', 'jqueryui']
    }
});

require([
    'jquery',
    'jqueryui',
    'bootstrap',
    'session_security',
    'd3',
    'd3tip',
    'assetscore',
    'assetsresponsive',
    'tokenfield'
], function ($, jqueryui, bootstrap, session_security, d3, d3tip) {

    var SEL_FILE_MAX = 5;

    // The data-type/name input checkbox attritbutes below must be reflected here in this map
    // to properly convey the checked list to IGV
    var selFiles = {
        gcs_bam: {},
        readgroupset_id: {},
        toTokens: function() {
            var tokens = [];
            for(var i in this.gcs_bam) {
                tokens.push({
                    label: this.gcs_bam[i],
                    value: i,
                    dataType: "gcs_bam"
                });
            }
            for(var i in this.readgroupset_id) {
                tokens.push({
                    value: i,
                    label: this.readgroupset_id[i],
                    dataType: "readgroupset_id"
                });
            }
            return tokens;
        },
        count: function() {
            return (Object.keys(this.gcs_bam).length
                + Object.keys(this.readgroupset_id).length);
        }
    };
    
    var selFileField = $('#selected-files');
    
    // Build the file tokenizer
    // Bootstrap tokenfield requires 'value' as the datem attribute field
    selFileField.tokenfield({
        delimiter : " ",
        minLength: 2,
        limit: SEL_FILE_MAX,
        tokens: selFiles.toTokens()
    // No creating
    }).on('tokenfield:edittoken',function(e){
        e.preventDefault();
        return false;
    }).on('tokenfield:removedtoken',function(e){

        // Uncheck the input checkbox - note this will not fire the event, which
        // is bound to form click
        var thisCheck = $('.filelist-panel input[value="'+e.attrs.value+'"');
        thisCheck.prop('checked',false);

        delete selFiles[e.attrs.dataType][e.attrs.value];

        $('#checked_list_input').attr('value',JSON.stringify(selFiles));

        // Update the submit button
        $('input[type="submit"]').prop('disabled', (selFiles.count() <= 0));

        // If we've cleared out our tokenfield, re-display the placeholder
        selFiles.count() <= 0 && $('#selected-files-tokenfield').show();
        
        // Update the display counter
        $('#selected-count').text(selFiles.count());

        // Update the limit display
        $('#selected-file-limit').css('color', (
            selFiles.count() < SEL_FILE_MAX ? "#000000" : (selFiles.count == SEL_FILE_MAX ? "11A633" : "#BD12CC")
        ));

        if(selFiles.count() <= SEL_FILE_MAX) {
            $('.filelist-panel input[type="checkbox"]').attr('disabled',false);
        }

    });

    // Prevent user inputs
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
        } else {
            return input.replace(/_/g, ' ');
        }

    };

    var update_table = function () {
        var selector_list = [];
        $('#filter-panel input[type="checkbox"]:checked').each(function() {
            selector_list.push($(this).attr('id'));
        });
        var url = ajax_update_url + '?page=' + page;

        if (selector_list.length) {
            for (var selector in selector_list) {
                url += '&' + selector_list[selector] + '=True';
            }
            $('.menu-items-right ul li a').attr('href', download_url + '?params=' + selector_list.join(','))
        } else {
            $('.menu-items-right ul li a').attr('href', download_url)
        }

        $('#prev-page').addClass('disabled');
        $('#next-page').addClass('disabled');
        $('#content-panel .spinner i').removeClass('hidden');
        $.ajax({
            url: url,
            success: function (data) {
                data = JSON.parse(data);
                var total_files = data['total_file_count'];
                $('.filelist-panel .panel-body .file-count').html(total_files);
                $('.filelist-panel .panel-body .page-num').html(page);
                var files = data['file_list'];
                $('.filelist-panel table tbody').empty();
                for (var i = 0; i < files.length; i++) {
                    if (!('datatype' in files[i])) {
                        files[i]['datatype'] = '';
                    }

                    var val = null;
                    var dataTypeName = '';
                    var label = '';
                    var tokenLabel = files[i]['sample']+", "+files[i]['pipeline']+", "+happy_name(files[i]['platform'])+", "+files[i]['datatype'];

                    if (files[i]['gg_readgroupset_id']) {
                        val = files[i]['gg_readgroupset_id'] + ',' + files[i]['sample'];
                        dataTypeName = "readgroupset_id";
                        label = "GA4GH";
                    } else if (files[i]['cloudstorage_location'] /*&& files[i]['cloudstorage_location'].split('.').pop() == 'bam'*/) {
                        val = files[i]['cloudstorage_location'] + ',' + files[i]['sample'];
                        dataTypeName = "gcs_bam";
                        label = "Cloud Storage";
                    }

                    files[i]['gg_readgroupset_id'] = (
                        val !== null
                        ? '<label><input type="checkbox" token-label="'+tokenLabel+'"name="'+dataTypeName+'" data-type="'+dataTypeName+'" value="'+val+'"> '+label+'</label>'
                        : ''
                    );

                    $('.filelist-panel table tbody').append(
                        '<tr>' +
                        '<td>' + files[i]['sample'] + '</td>' +
                        '<td>' + files[i]['pipeline'] + '</td>' +
                        '<td>' + happy_name(files[i]['platform']) + '</td>' +
                        '<td>' + files[i]['datalevel'] + '</td>' +
                        '<td>' + files[i]['datatype'] + '</td>' +
                        '<td>' + files[i]['gg_readgroupset_id'] + '</td>' +
                        '</tr>'
                    )

                    // Remember any previous checks
                    var thisCheck = $('.filelist-panel input[value="'+val+'"');
                    selFiles[thisCheck.attr('data-type')] && selFiles[thisCheck.attr('data-type')][thisCheck.attr('value')] && thisCheck.attr('checked', true);
                }

                selFileField.tokenfield('setTokens',selFiles.toTokens());

                // If there are checkboxes for igv, show the "Launch IGV" button
                if (selFiles.count() > 0 || $('.filelist-panel input[type="checkbox"]').length > 0) {
                    $('input[type="submit"]').show();
                } else {
                    $('input[type="submit"]').hide();
                }

                // Bind event handler to checkboxes
                $('.filelist-panel input[type="checkbox"]').on('click', function() {
                    // Memorize anything being checked or unchecked
                    var self=$(this);

                    self.is(':checked') && (selFiles[self.attr('data-type')][self.attr('value')] = self.attr('token-label'));
                    self.is(':checked') && $('#selected-files-tokenfield').hide();
                    !self.is(':checked') && delete selFiles[self.attr('data-type')][self.attr('value')];
                    !self.is(':checked') && (selFiles.count() <= 0) && $('#selected-files-tokenfield').show();

                    $('#checked_list_input').attr('value',JSON.stringify(selFiles));

                    selFileField.tokenfield('setTokens',selFiles.toTokens());

                    // Update the submit button
                    $('input[type="submit"]').prop('disabled', (selFiles.count() <= 0));

                    // Update the display counter
                    $('#selected-count').text(selFiles.count());

                    // Update the limit display
                    $('#selected-file-limit').css('color', (selFiles.count() < SEL_FILE_MAX ? "#000000" : "#BD12CC"));

                    if (self.is(':checked') && selFiles.count() >= SEL_FILE_MAX) {
                        $('.filelist-panel input[type="checkbox"]:not(:checked)').attr('disabled',true);
                        alert("The maximum number of files which can be viewed in IGV\n"
                            + "simultaneously is " + SEL_FILE_MAX + ".");
                    } else {
                        $('.filelist-panel input[type="checkbox"]').attr('disabled',false);
                    }

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

    $('#filter-panel input[type="checkbox"]').on('change', function() {
        page = 1;

        //TODO: update download url
        update_table();
    });

    $('input[type="submit"]').prop('disabled', true);
    $('input[type="submit"]').hide();
    update_table();
});
