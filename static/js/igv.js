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
        jquery: 'libs/jquery-3.5.1.min',
        jqueryui: 'libs/jquery-ui.min',
        igv: 'libs/igv'
    },
    shim: {
        'igv': ['jquery', 'jqueryui']
    }
});

require([
    'jquery',
    'igv',
    'jqueryui',
    'bootstrap'
], function($, igv) {
    let tracks = [];
    let bam_divs = $('.bam-data');

    for (let i = 0; i < bam_divs.length; i++) {
        let row = $(bam_divs[i]);
        let bam_path = row.data('gcs').split(';')[0];
        let bai_path = row.data('gcs').split(';')[1];
        let sample_barcode = row.data('sample');
        let bam_track = {
            sourceType: 'file',
            type: 'alignment',
            format: 'bam',
            url: bam_path, // gs:// url to .bam file
            name: sample_barcode + ': GCS BAM file',
            withCredentials: true,
            indexURL: bai_path
        };
        tracks.push(bam_track);
    }

    let genes_track = {
        name: "Genes: Gencode v18",
        url: "https://s3.amazonaws.com/igv.broadinstitute.org/annotations/hg19/genes/gencode.v18.collapsed.bed",
        indexURL: "https://s3.amazonaws.com/igv.broadinstitute.org/annotations/hg19/genes/gencode.v18.collapsed.bed.idx",
        order: Number.MAX_VALUE,
        displayMode: "EXPANDED"
    };

    if(genome_build === 'HG38') {
        genes_track.url = 'https://s3.amazonaws.com/igv.broadinstitute.org/annotations/hg38/genes/gencode.v24.annotation.sorted.gtf.gz';
        genes_track.indexURL = 'https://s3.amazonaws.com/igv.broadinstitute.org/annotations/hg38/genes/gencode.v24.annotation.sorted.gtf.gz.tbi';
        genes_track.name = 'Genes: Gencode v24';
        genes_track.format = 'gtf';
    }

    tracks.push(genes_track);

    let options = {
        showNavigation: true,
        genome: genome_build.toLowerCase(),
        locus: "EGFR",
        tracks: tracks,
        withCredentials: true,
        clientId: oauth_client_id
    };

    $('#igv-div').empty();
    igv.browser = null;
    igv.createBrowser($('#igv-div')[0], options);

});