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
        session_security: 'session_security/script',
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
        var bam_path = row.data('gcs').split(';')[0];
        var bai_path = row.data('gcs').split(';')[1];
        var sample_barcode = row.data('sample');
        var obj = {
            sourceType: 'gcs',
            type: 'bam',
            url: bam_path, // gs:// url to .bam file
            name: sample_barcode + ': GCS bam file',
            withCredentials: true,
            indexURL: bai_path
        };
        tracks.push(obj);
    }

    var genes_obj = {
        name: "Genes: Gencode v18",
        url: "https://s3.amazonaws.com/igv.broadinstitute.org/annotations/hg19/genes/gencode.v18.collapsed.bed",
        indexURL: "https://s3.amazonaws.com/igv.broadinstitute.org/annotations/hg19/genes/gencode.v18.collapsed.bed.idx",
        order: Number.MAX_VALUE,
        displayMode: "EXPANDED"
    };

    if(genome_build === 'HG38') {
        genes_obj.url = 'https://s3.amazonaws.com/igv.broadinstitute.org/annotations/hg38/genes/gencode.v24.annotation.sorted.gtf.gz';
        genes_obj.indexURL = 'https://s3.amazonaws.com/igv.broadinstitute.org/annotations/hg38/genes/gencode.v24.annotation.sorted.gtf.gz.tbi';
        genes_obj.name = 'Genes: Gencode v24';
        genes_obj.format = 'gtf';
    }

    tracks.push(genes_obj);

    var options = {
        showNavigation: true,
        genome: genome_build.toLowerCase(),
        locus: "EGFR",
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