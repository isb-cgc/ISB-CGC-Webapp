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

define([
    'jquery',
    'jqueryui',
    'bootstrap',
    'session_security',
    'd3',
    'd3tip',
    'vizhelpers',
    'scatter_plot',
    'cubby_plot',
    'violin_plot',
    'histogram_plot',
    'bar_plot',
    'seqpeek_view/seqpeek_view',
    'select2',
    'assetscore',
    'assetsresponsive'

], function($, jqueryui, bootstrap, session_security, d3, d3tip, vizhelpers, scatter_plot, cubby_plot, violin_plot, histogram, bar_graph, seqpeek_view, mock_histogram_data ) {
    A11y.Core();

    var scatter_plot_obj = Object.create(scatter_plot, {});
    var cubby_plot_obj   = Object.create(cubby_plot, {});
    var violin_plot_obj  = Object.create(violin_plot, {});
    var histogram_obj    = Object.create(histogram, {});
    var bar_graph_obj    = Object.create(bar_graph, {});
    var helpers          = Object.create(vizhelpers, {});
    var cubby_tip = d3tip()
            .attr('class', 'd3-tip')
            .direction('n')
            .offset([0, 0])
            .html(function(d) {
                var mean = 0;
                for (var i = 0; i < d.length; i++) {
                    mean += parseFloat(d[i]);
                }
                mean /= d.length;
                return '<span>Mean: ' + mean.toFixed(2) + '</span><br/><span>%: ' + (d.y * 100).toFixed(2) + '%</span>';
            });

    function generate_axis_label(attr) {
        return $('option[value="' + attr + '"]:first').html()
    }

    /*
        Generate bar chart
     */
    function generate_bar_chart(margin, plot_selector, height, width, x_attr, data){
        // Bar Chart
        var svg = d3.select(plot_selector)
            .append('svg')
            .attr('width', width + 10)
            .attr('height', height);
        var bar_width = 20;
        var plot = bar_graph_obj.createBarGraph(
            svg,
            data,
            width,
            height,
            bar_width,
            'x',
            generate_axis_label(x_attr),
            cubby_tip,
            margin);

        return  {plot : plot, svg : svg}
    }

    /*
        Generate Histogram
     */
    function generate_histogram(margin, plot_selector, height, width, x_attr, data){
        var svg = d3.select(plot_selector)
                .append('svg')
                .attr('width', width + 10)
                .attr('height', height);
        var vals = helpers.values_only(data, 'x');

        var plot = histogram_obj.createHistogramPlot(
                svg,
                data,
                vals,
                width,
                height,
                'x',
                generate_axis_label(x_attr),
                cubby_tip,
                margin);

        return  {plot : plot, svg : svg}
    }

    /*
        Generate scatter plot
    */
    function generate_scatter_plot(margin, plot_selector, legend_selector, height, width, x_attr, y_attr, color_by, cohort_set, data) {
         var domain = helpers.get_min_max(data, 'x');
         var range = helpers.get_min_max(data, 'y');

         var legend = d3.select(legend_selector)
             .append('svg')
             .attr('width', 200);
         var svg = d3.select(plot_selector)
             .append('svg')
             .attr('width', width + 10)
             .attr('height', height);
         var plot = scatter_plot_obj.create_scatterplot(svg,
             data,
             domain,
             range,
             generate_axis_label(x_attr),  // xLabel
             generate_axis_label(y_attr),  // yLabel
             'x',     // xParam
             'y',     // yParam
             color_by,
             legend,
             width,
             height,
             cohort_set
         );

         return  {plot : plot, svg : svg}
    }

    /*
        Generate violin plot
     */
    function generate_violin_plot(margin, plot_selector, legend_selector, height, width, x_attr, y_attr, color_by, cohort_set, data) {
        var violin_width = 200;
        var tmp = helpers.get_min_max(data, 'y');
        var min_n = tmp[0];
        var max_n = tmp[1];
        var legend = d3.select(legend_selector)
            .append('svg')
            .attr('width', 200);

        var svg = d3.select(plot_selector)
            .append('svg')
            .attr('width', width + 10)
            .attr('height', height);

        var plot = violin_plot_obj.createViolinPlot(svg,
            data,
            height,
            violin_width,
            max_n,
            min_n,
            generate_axis_label(x_attr),
            generate_axis_label(y_attr),
            'x',
            'y',
            color_by,
            legend,
            cohort_set
        );

        return  {plot : plot, svg : svg}
    }

    /*
        Generate violin plot with axis swap
     */
    function generate_violin_plot_axis_swap(margin, plot_selector, legend_selector, height, width, x_attr, y_attr, color_by, cohort_set, data) {
        var violin_width = 200;
        var tmp = helpers.get_min_max(data, 'x');
        var min_n = tmp[0];
        var max_n = tmp[1];
        var legend = d3.select(legend_selector)
            .append('svg')
            .attr('width', 200);

        var svg = d3.select(plot_selector)
            .append('svg')
            .attr('width', width + 10)
            .attr('height', height);

        var plot = violin_plot_obj.createViolinPlot(svg,
            data,
            height,
            violin_width,
            max_n,
            min_n,
            generate_axis_label(y_attr),
            generate_axis_label(x_attr),
            'y',
            'x',
            color_by,
            legend,
            cohort_set
        );

        return  {plot : plot, svg : svg}
    }

    function generate_cubby_hole_plot(margin, plot_selector, legend_selector, height, width, x_attr, y_attr, color_by, cohort_set, data) {
        var cubby_size = 100;
        var xdomain = vizhelpers.get_domain(data, 'x');
        var ydomain = vizhelpers.get_domain(data, 'y');

        var cubby_width = xdomain.length * cubby_size + margin.left + margin.right;
        var cubby_height = ydomain.length * cubby_size + margin.top + margin.bottom;

        var svg = d3.select(plot_selector)
            .append('svg')
            .attr('width', cubby_width + 10)
            .attr('height', cubby_height);

        var plot = cubby_plot_obj.create_cubbyplot(
            svg,
            data,
            xdomain,
            ydomain,
            generate_axis_label(x_attr),
            generate_axis_label(y_attr),
            'x',
            'y',
            'c',
            legend_selector,
            cubby_width,
            cubby_height,
            cubby_size
        );

        return  {plot : plot, svg : svg}
    }

    function generate_seqpeek_plot(plot_selector, legend_selector, view_data) {
        var plot_data = view_data['plot_data'];
        var hugo_symbol = view_data['hugo_symbol'];

        var element = $(plot_selector)[0];

        if (plot_data.hasOwnProperty('tracks')) {
            seqpeek_view.render_seqpeek_legend(legend_selector);

            // Render a HTML table for the visualization. Each track will be in a separate <tr> element.
            var seqpeek_el = seqpeek_view.render_seqpeek_template(element, hugo_symbol, plot_data['tracks']);
            var table_selector = seqpeek_el.table;
            var gene_element = seqpeek_el.gene_element;

            seqpeek_view.render_seqpeek(table_selector, gene_element, view_data);
        }
        else {
            // No data was found for the gene and cohorts
            seqpeek_view.render_no_data_message(plot_selector, hugo_symbol);
        }
    }

    /*
        Generate url for gathering data
     */
    function get_data_url(base_api_url, cohorts, x_attr, y_attr, color_by){
        var cohort_str = '';
        for (var i = 0; i < cohorts.length; i++) {
            if (i == 0) {
                cohort_str += 'cohort_id=' + cohorts[i];
            } else {
                cohort_str += '&cohort_id=' + cohorts[i];
            }
        }
        var api_url = base_api_url + '/_ah/api/feature_data_api/v1/feature_data_plot?' + cohort_str;

        api_url += '&x_id=' + x_attr;
        if(color_by && color_by != ''){
            api_url += '&c_id=' + color_by;
        }
        if (y_attr && y_attr != '') {
            api_url += '&y_id=' + y_attr
        }
        return api_url;
    }

    /*
     Generate url for gathering data for a SeqPeek plot
     */
    function get_seqpeek_data_url(base_api_url, cohorts, gene_label){
        var cohort_str = '';
        for (var i = 0; i < cohorts.length; i++) {
            if (i == 0) {
                cohort_str += 'cohort_id=' + cohorts[i];
            } else {
                cohort_str += '&cohort_id=' + cohorts[i];
            }
        }
        var api_url = base_api_url + '/_ah/api/seqpeek_data_api/v1/view_data?' + cohort_str;
        api_url += "&hugo_symbol=" + gene_label;

        return api_url;
    }

    function configure_pairwise_display(element, data){
        if (data['pairwise_result'].hasOwnProperty('result_vectors')) {
            var vectors = data['pairwise_result']['result_vectors'];

            var output = $('<table class="table"><thead><tr>' +
                '<th class="feature1">Feature 1</th>' +
                '<th class="feature2">Feature 2</th>' +
                '<th class="logp">logp</th>' +
                '<th class="n">n</th>' +
                '</tr></thead><tbody></tbody></table>');
            for (var i = 0; i < vectors.length; i++) {
                var tr = '<tr><td>' + vectors[i]['feature_1'] + '</td>' +
                    '<td>' + vectors[i]['feature_2'] + '</td>' +
                    '<td>' + vectors[i]['_logp'] + '</td>' +
                    '<td>' + vectors[i]['n'] + '</td></tr>';
                output.find('tbody').append(tr);
            }
            element.html(output);
        } else {
            element.html('Pairwise returned no results.')
        }
    }

    function select_plot(args){//plot_selector, legend_selector, pairwise_element, type, x_attr, y_attr, color_by, cohorts, cohort_override, data){

        var width  = $('.worksheet.active .worksheet-panel-body:first').width(), //TODO should be based on size of screen
            height = 700, //TODO ditto
            margin = {top: 0, bottom: 100, left: 70, right: 10},
            x_type = '',
            y_type = '';

        var data = args.data;
        if (data.hasOwnProperty('pairwise_result')) {
            configure_pairwise_display(args.pairwise_element, data);
        }
        // The response form the SeqPeek data endpoint has a different schema. This is case is handled in
        // another branch below.
        if (data.hasOwnProperty('items')) {

            var cohort_set = data['cohort_set'];
            data = data['items'];
            if (args.cohort_override) {
                args.color_by = 'cohort';
            } else {
                args.color_by = 'c';
            }

            var visualization;
            switch (args.type){
                case "Bar Chart" : //x_type == 'STRING' && y_type == 'none'
                    visualization = generate_bar_chart(margin, args.plot_selector, height, width, args.x, data);
                    break;
                case "Histogram" : //((x_type == 'INTEGER' || x_type == 'FLOAT') && y_type == 'none') {
                    visualization = generate_histogram(margin, args.plot_selector, height, width, args.x, data);
                    break;
                case 'Scatter Plot': //((x_type == 'INTEGER' || x_type == 'FLOAT') && (y_type == 'INTEGER'|| y_type == 'FLOAT')) {
                    visualization = generate_scatter_plot(margin, args.plot_selector, args.legend_selector, height, width, args.x, args.y, args.color_by, cohort_set, data)
                    break;
                case "Violin Plot": //(x_type == 'STRING' && (y_type == 'INTEGER'|| y_type == 'FLOAT')) {
                    visualization = generate_violin_plot(margin, args.plot_selector, args.legend_selector, height, width, args.x, args.y, args.color_by,  cohort_set, data)
                    break;
                case 'Violin Plot with axis swap'://(y_type == 'STRING' && (x_type == 'INTEGER'|| x_type == 'FLOAT')) {
                    visualization = generate_violin_plot_axis_swap(margin, args.plot_selector, args.legend_selector, height, width, args.x, args.y, args.color_by,  cohort_set, data)
                    break;
                case 'Cubby Hole Plot' : //(x_type == 'STRING' && y_type == 'STRING') {
                    visualization = generate_cubby_hole_plot(margin, args.plot_selector, args.legend_selector, height, width, args.x, args.y, args.color_by,  cohort_set, data)
                    break;
                default :
                    break;
            }

            //establish marquee sample selection
            $(visualization.svg[0]).parents('.plot').find('.toggle-selection').unbind();
            $(visualization.svg[0]).parents('.plot').find('.toggle-selection').on('click', function () {
                $(this).toggleClass('active');
                visualization.plot.check_selection_state($(this).hasClass('active'));
            });
            visualization.plot.check_selection_state($(visualization.svg[0]).parents('.plot').find('.toggle-selection').hasClass('active'));

            //establish resize call to data
            d3.select(window).on('resize', visualization.plot.resize);

        }
        else if (args.type == "SeqPeek") {
            visualization = generate_seqpeek_plot(args.plot_selector, args.legend_selector, data);
        }
        else {
            // No samples provided TODO abstract view information
            d3.select(args.plot_selector)
                .append('svg')
                .attr('width', width)
                .attr('height', height)
                .append('text')
                .attr('fill', 'black')
                .style('font-size', 20)
                .attr('text-anchor', 'middle')
                .attr('transform', 'translate(' + (width/2) + ',' + (height/2) + ')')
                .text('Cohort provided has no samples.');
        }
    };

    function get_plot_settings(plot_type){
        var settings = {
            axis : []
        };
        switch (plot_type){
            case "Bar Chart" : //x_type == 'STRING' && y_type == 'none'
                settings.axis.push({name : 'x_axis', type : 'CATEGORICAL'});
                break;
            case "Histogram" : //((x_type == 'INTEGER' || x_type == 'FLOAT') && y_type == 'none') {
                settings.axis.push({name : 'x_axis', type : 'NUMERICAL'});
                break;
            case 'Scatter Plot': //((x_type == 'INTEGER' || x_type == 'FLOAT') && (y_type == 'INTEGER'|| y_type == 'FLOAT')) {
                settings.axis.push({name : 'x_axis', type : 'NUMERICAL'});
                settings.axis.push({name : 'y_axis', type : 'NUMERICAL'});
                break;
            case "Violin Plot": //(x_type == 'STRING' && (y_type == 'INTEGER'|| y_type == 'FLOAT')) {
                settings.axis.push({name : 'x_axis', type : 'CATEGORICAL'});
                settings.axis.push({name : 'y_axis', type : 'NUMERICAL'});
                break;
            case 'Violin Plot with axis swap'://(y_type == 'STRING' && (x_type == 'INTEGER'|| x_type == 'FLOAT')) {
                settings.axis.push({name : 'x_axis', type : 'NUMERICAL'});
                settings.axis.push({name : 'y_axis', type : 'CATEGORICAL'});
                break;
            case 'Cubby Hole Plot' : //(x_type == 'STRING' && y_type == 'STRING') {
                settings.axis.push({name : 'x_axis', type : 'CATEGORICAL'});
                settings.axis.push({name : 'y_axis', type : 'CATEGORICAL'});
                break;
            default :
                break;
        };

        return settings;
    }

    function generate_plot(args, callback){ //plot_selector, legend_selector, pairwise_element, type, x_attr, y_attr, color_by, cohorts, cohort_override, callback) {
        var plot_data_url;
        if (args.type == "SeqPeek") {
            plot_data_url = get_seqpeek_data_url(base_api_url, args.cohorts, args.gene_label);
        }
        else {
            plot_data_url = get_data_url(base_api_url, args.cohorts, args.x, args.y, args.color_by);
        }

        $.ajax({
            type: 'GET',
            url: plot_data_url,
            success: function(data, status, xhr) {
                select_plot({plot_selector    : args.plot_selector,
                             legend_selector  : args.legend_selector,
                             pairwise_element : args.pairwise_element,
                             type             : args.type,
                             x                : args.x,
                             y                : args.y,
                             color_by         : args.cohorts,
                             cohort_override  : args.color_override,
                             data             : data});
                callback({});

            },
            error: function(xhr, status, error) {
                var width  = 800, //TODO should be based on size of screen
                height = 600, //TODO ditto
                margin = {top: 0, bottom: 50, left: 70, right: 10},
                x_type = '',
                y_type = '';
                d3.select(args.plot_selector)
                            .append('svg')
                            .attr('width', width)
                            .attr('height', height)
                            .append('text')
                            .attr('fill', 'black')
                            .style('font-size', 20)
                            .attr('text-anchor', 'middle')
                            .attr('transform', 'translate(' + (width/2) + ',' + (height/3.5) + ')')
                            .text('There was an error retrieving plot data. Please try again');
                callback({error : true});
            }
        });
    };

    return {
        generate_plot     : generate_plot,
        get_plot_settings : get_plot_settings
    };
});
/**
 * Created by rossbohner on 12/20/15.
 */
