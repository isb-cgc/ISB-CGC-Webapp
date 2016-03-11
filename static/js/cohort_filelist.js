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
        d3: 'libs/d3.min',
        d3tip: 'libs/d3-tip',

    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'session_security': ['jquery'],
        'assetscore': ['jquery', 'bootstrap', 'jqueryui'],
        'assetsresponsive': ['jquery', 'bootstrap', 'jqueryui']
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
    'assetsresponsive'
], function ($, jqueryui, bootstrap, session_security, d3, d3tip) {
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
                    if (files[i]['gg_readgroupset_id']) {
                        files[i]['gg_readgroupset_id'] = '<a href="'+ base_url + '/igv/?sample_barcode=' + files[i]['sample'] + '&readgroupset_id=' + files[i]['gg_readgroupset_id'] + '"><i class="fa fa-check"></i> Go to IGV</a>'
                    }
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
                }
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

    update_table();
});
