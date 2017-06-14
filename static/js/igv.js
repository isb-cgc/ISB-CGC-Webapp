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
    baseUrl: STATIC_FILES_URL+'js/',
    paths: {
        jquery: 'libs/jquery-1.11.1.min',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        session_security: 'session_security',
        underscore: 'libs/underscore-min',
        igv_lib: 'libs/igv'
    },
    shim: {
        'session_security': ['jquery'],
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'igv_lib': ['jquery', 'jqueryui']
    }
});

require([

    'jquery',
    'jqueryui',
    'session_security',
    'bootstrap',
    'igv_lib'

], function($, jqueryui, session_security, bs, igv_lib) {
    var browser;
    var tracks = [];
    var readgroupset_divs = $('.readgroupset-data');
    var bam_divs = $('.bam-data');

    for (var i = 0; i < readgroupset_divs.length; i++) {
        var row = $(readgroupset_divs[i]);
        var readgroupset_id = row.data('readgroupset');
        var sample_barcode = row.data('sample');
        tracks.push({
            sourceType: 'ga4gh',
            type: 'bam',
            url: 'https://genomics.googleapis.com/v1',
            readGroupSetIds: readgroupset_id,
            name: sample_barcode + ': Google Genomics',
            referenceName: '1',
            withCredentials: true
        });
    }

    for (var i = 0; i < bam_divs.length; i++) {
        var row = $(bam_divs[i]);
        var bam_path = row.data('gcs');
        var sample_barcode = row.data('sample');
        var obj = {
            sourceType: 'gcs',
            type: 'bam',
            url: bam_path, // gs:// url to .bam file
            name: sample_barcode + ': GCS bam file',
            withCredentials: true
        };
        if(row['program'] === 'TCGA' && row['build'] === 'HG38'){
            obj.indexURL = bam_path.replace(/\.bam/,'.bai');
        }
        tracks.push(obj);
    }

    tracks.push({
        name: "Genes",
        url: "//dn7ywbm9isq8j.cloudfront.net/annotations/hg19/genes/gencode.v18.collapsed.bed",
        order: Number.MAX_VALUE,
        displayMode: "EXPANDED"
    });

    var options = {
        showNavigation: true,
        genome: genome_build.toLowerCase(),
        locus: "egfr",
        tracks: tracks,
        withCredentials: true
    };

    $('#igv-div').empty();

    // Invoking libs/igv creates a global igv var for us to use
    igv.browser = null;
    igv.oauth.google.setRedirectUrl(BASE_URL, service_account);
    igv.oauth.google.login();

    browser = igv.createBrowser($('#igv-div')[0], options);

});