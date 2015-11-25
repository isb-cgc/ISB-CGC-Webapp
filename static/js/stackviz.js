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
        session_security: 'session_security'
    },
    shim: {
        'session_security': ['jquery']
    }
});

require([
    'session_security',
    'visualizations/createStackvizPlot',
    'helpers/vis_helpers'
], function() {
    var row_height = 24,
        row_margin = 10,
        bar_margin = 0,
        bar_width = 1;

    var margin = {top: 0, bottom: 50, left: 100, right: 0};



//    var height = 500,
//        width = data.length * (bar_width + bar_margin) + margin.left;
//
//    var total_count = data.length;
//
//    $('#other-data').html('Total Number of Samples: ' + total_count);
//
//    var svg = d3.select('#stackviz')
//        .append('svg')
//        .attr('width', width)
//        .attr('height', height);
//
//    var legend = d3.select('#legend')
//        .append('svg')
//        .attr('width', 200);
//
//    var row_attr = ['DNAseq_data',
//                    'mirnPlatform',
//                    'cnvrPlatform',
//                    'methPlatform',
//                    'gexpPlatform',
//                    'rppaPlatform'];



//
//    var new_index = false;
//
//    var list = sort_data(data, 'DNAseq_data');
//    var sub_lists = [];
//    var sub_list = [];
//    for (var i = 0; i < list.length-1; i++) {
//        if (!new_index) {
//            sub_list.push(list[i]);
//        } else {
//            sub_lists.push(sub_list);
//            sub_list = [list[i]];
//            new_index = false;
//        }
//        if (list[i]['DNAseq_data'] != list[i+1]['DNAseq_data']) {
//            new_index = true;
//        }
////        console.log(list[i]['DNAseq_data']);
//    }
//    sub_lists.push(sub_list);


    // create stackviz where the rows are data types, and the bars represent different subtypes
//    createStackvizPlot(svg,
//        data,
//        height,
//        width,
//        row_height,
//        row_margin,
//        bar_width,
//        bar_margin,
//        row_attr,
//        margin,
//        tip,
//        legend
//    );
    var row_domain = [
        'TP53',
        'RB1',
        'NF1',
        'APC',
        'CTNNB1',
        'PIK3CA',
        'PTEN',
        'FBXW7',
        'NRAS',
        'ARID1A',
        'CDKN2A',
        'SMAD4',
        'BRAF',
        'NFE2L2',
        'IDH1',
        'PIK3R1',
        'HRAS',
        'EGFR',
        'BAP1',
        'KRAS'
    ];

    var friendly_map = {
        "1": 'Mutant',
        "0": 'Wild Type',
        "None": 'NA'
    };

    var generate_plot = function(plot, x_attr, y_attr, cohort, disease_codes) {
        var width = 800,
            view_width = 800,
            height = 600,
            margin = {top: 0, bottom: 50, left: 100, right: 0};

        plot.find('.plot-div').empty();
        plot.find('.legend').empty();
        var api_url = '';
        if (window.location.origin.indexOf('stage') != -1) {
            api_url = 'https://stage-dot-isb-cgc.appspot.com/_ah/api/fm_api/v1/fmdata?search_id=' + cohort + '&selectors=sample';
        }
        else if (window.location.origin.indexOf('cgcdemo') != -1 || (window.location.origin.indexOf('isb-cgc.appspot.com') != -1)) {
            api_url = 'https://isb-cgc.appspot.com/_ah/api/fm_api/v1/fmdata?search_id=' + cohort + '&selectors=sample';
        } else {
            api_url = window.location.origin + '/_ah/api/fm_api/v1/fmdata?search_id=' + cohort + '&selectors=sample';
        }
        var selectors = row_domain;
        for (var i = 0; i < selectors.length; i++) {
            if (selectors[i] && selectors[i] != 'none') {
                api_url += '&selectors=' + selectors[i];
            }
        }
        if (disease_codes) {
            api_url += '&disease_code=' + disease_codes;
        }
        var tip = d3.tip()
            .attr('class', 'd3-tip')
            .direction('n')
            .offset([0, 0])
            .html(function(d) {
                return '<span>' + friendly_map[d[d3.select(this.parentNode).datum()]] + '</span>';
            });

        var plot_selector = '#' + plot.prop('id') + ' .plot-div';
        var legend_selector = '#' + plot.prop('id') + ' .legend';
        plot.find('.plot-loader').show();
        $.ajax({
            type: 'GET',
            url: api_url,
            success: function (data, status, xhr) {
                data = data['items'];
                var width = data.length * (bar_width + bar_margin) + margin.left;

                var svg = d3.select(plot_selector)
                        .append('svg')
                        .attr('width', view_width)
                        .attr('height', height);

                var legend = d3.select(legend_selector)
                        .append('svg')
                        .attr('width', 200);
                createStackvizPlot(svg,
                    data,
                    height,
                    width,
                    view_width,
                    row_height,
                    row_margin,
                    bar_width,
                    bar_margin,
                    x_attr,
                    y_attr,
                    margin,
                    tip,
                    legend,
                    friendly_map
                );
                plot.find('.plot-loader').hide();
            }
        });
    };

    $('#disease-types').on('change', function() {
        var disease_codes = $(this).val();
        disease_codes = disease_codes.replace(' ', '');
        var plot = $(this).parents('.plot');
        var cohort = plot.find('input[name="cohort"]').val();
        generate_plot(plot, '', '', cohort, disease_codes);
    });

    for (var i = 0; i < plots_data.length; i++) {
        var plot = $('#plot-' + plots_data[i]['plot_index']);
        plot.find('.x-selector option[value="' + plots_data[i]['x_attr'] + '"]').attr('selected', 'selected');
        plot.find('.y-selector option[value="' + plots_data[i]['y_attr'] + '"]').attr('selected', 'selected');
        var x_attr = plot.find('.x-selector').val();
        var y_attr = plot.find('.y-selector').val();
        var cohort = plot.find('input[name="cohort"]').val();
        generate_plot(plot, x_attr, y_attr, cohort);
    }
    $('#disease-types').tokenfield({
        autocomplete:{
            source: data_domains['disease_code']
        },
        showAutocompleteOnFocus: true
    });

});
