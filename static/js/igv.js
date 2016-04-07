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

        igvbeta: 'libs/igv'
    },
    shim: {
        'session_security': ['jquery'],
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'assetscore': ['jquery', 'bootstrap', 'jqueryui'],
        'assetsresponsive': ['jquery', 'bootstrap', 'jqueryui'],
        'igvbeta': ['jquery', 'jqueryui']
    }
});

require([

    'jquery',
    'jqueryui',
    'session_security',
    'bootstrap',
    'igvbeta',

    'assetscore',
    'assetsresponsive'
], function($, jqueryui, session_security, bs, igvbeta) {
    A11y.Core();

    var browser;
    var tracks = [];
    tracks.push({
        sourceType: 'ga4gh',
        type: 'bam',
        url: 'https://www.googleapis.com/genomics/v1beta2',
        readGroupSetIds: readgroupset_id,
        name: sample_barcode,
        referenceName: '1'
    });
    //tracks.push({
    //    sourceType: 'gcs',
    //    type: 'bam',
    //    url: '', ## gs:// url to .bam file. Location must also contain .bai file.
    //    name: 'GCS bam file'
    //});
    tracks.push({
        name: "Genes",
        url: "//dn7ywbm9isq8j.cloudfront.net/annotations/hg19/genes/gencode.v18.collapsed.bed",
        order: Number.MAX_VALUE,
        displayMode: "EXPANDED"
    });

    var options = {
        showNavigation: true,
        genome: "hg19",
        locus: "egfr",
        apiKey: 'AIzaSyDbqoM1bNdaCTn2-OtarruG4NmI8e-qHAk',
        tracks: tracks
    };
    $('#igv-div').empty();
    igv.browser = null;
    browser = igv.createBrowser($('#igv-div')[0], options);

    // Testing bq access
    //var config = {
    //    'client_id': clientId,
    //    'scope': 'https://www.googleapis.com/auth/bigquery'
    //};

    gapi.auth.authorize(config, function (tokenJson) {
        gapi.client.load('bigquery', 'v2');
        oauth.google.apiKey = 'a717bf753c08ea7293a226014a1134867d6c5884';
        igv.oauth.google.access_token = tokenJson.access_token;

        //igv.browser.loadTrack(
        //    {
        //        //autoHeight: false,
        //        sourceType: 'bigquery',
        //        featureType: 'seg',
        //        name: 'BRCA',
        //        cohort: 'SELECT ParticipantBarcode FROM [isb-cgc:tcga_201510_alpha.Clinical_data] WHERE Study = "BRCA"'
        //    }
        //)
    });

    //$('#dataset-selector').on('change', function() {
    //    var id = $(this).prop('value');
    //    $('.rgselector').hide();
    //    $('#rgselector-'+id).show();
    //    $('.generate-btn').show();
    //});
    //
    //if (selected_dataset != '') {
    //    $('.rgselector').hide();
    //    $('#rgselector-'+selected_dataset).show();
    //    $('.generate-btn').show();
    //    $('.generate-btn').click();
    //}

});