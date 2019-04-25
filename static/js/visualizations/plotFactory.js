/**
 *
 * Copyright 2016, Institute for Systems Biology
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
    'd3textwrap',
    'vizhelpers',
    'scatter_plot',
    'cubby_plot',
    'violin_plot',
    'histogram_plot',
    'bar_plot',
    'seqpeek_view/seqpeek_view',
    'oncoprint_plot',
    'oncogrid_plot',
    'select2',
    'fileSaver',
    'cbio_util',
    'download_util',

], function($, jqueryui, bootstrap, session_security, d3, d3tip, d3textwrap, vizhelpers, scatter_plot, cubby_plot,
            violin_plot, histogram, bar_graph, seqpeek_view, oncoprint_plot,  oncogrid_plot, mock_histogram_data ) {

    var VERSION = $('#workbook-build :selected').data('plot-version')
                        || $('.workbook-build-display').data('plot-version');

    var scatter_plot_obj = Object.create(scatter_plot, {});
    var cubby_plot_obj   = Object.create(cubby_plot, {});
    var violin_plot_obj  = Object.create(violin_plot, {});
    var histogram_obj    = Object.create(histogram, {});
    var bar_graph_obj    = Object.create(bar_graph, {});
    var oncoprint_obj    = Object.create(oncoprint_plot, {});
    var oncogrid_obj     = Object.create(oncogrid_plot, {});
    var helpers          = Object.create(vizhelpers, {});
    var fullscreen = false;
    function generate_axis_label(attr, isLogTransform, units) {
        if(isLogTransform) {
            return $('option[value="' + attr + '"]:first').html() + " - log("+(units && units.length > 0 ? units : 'n')+"+1)";
        }
        return $('option[value="' + attr + '"]:first').html() + (units && units.length > 0 ? " (" + units +")": '')
    }

    /*
        Generate bar chart
     */
    function generate_bar_chart(margin, plot_selector, height, width, x_attr, data, units){
        // Bar Chart
        var svg = d3.select(plot_selector)
            .append('svg')
            .attr('width', width)
            .attr('height', height);
        var bar_width = 25;
        var plot = bar_graph_obj.createBarGraph(
            svg,
            data,
            width,
            height,
            bar_width,
            'x',
            generate_axis_label(x_attr, false, units.x),
            margin);
        return  {plot : plot, svg : svg}
    }

    /*
        Generate Histogram
     */
    function generate_histogram(margin, plot_selector, height, width, x_attr, data, units, logTransform){
        var svg = d3.select(plot_selector)
                .append('svg')
                .attr('width', width)
                .attr('height', height);
        var vals = helpers.values_only(data, 'x');

        var plot = histogram_obj.createHistogramPlot(
                svg,
                data,
                vals,
                width,
                height,
                'x',
                generate_axis_label(x_attr, logTransform.x, units.x),
                margin);

        return  {plot : plot, svg : svg}
    }

    /*
        Generate scatter plot
    */
    function generate_scatter_plot(margin, plot_selector, legend_selector, legend, height, width, x_attr, y_attr, cohort_map, data, units, logTransform) {
         var domain = helpers.get_min_max(data, 'x');

         if(domain[0] === domain[1]){
             domain[0] -= 0.5;
             domain[1] += 0.5;
         }

         var range = helpers.get_min_max(data, 'y');
         if(range[0] === range[1]){
             range[0] -= 0.5;
             range[1] += 0.5;
         }

         legend['svg'] = d3.select(legend_selector)
                .append('svg')
                .attr('width', 850);
         var svg = d3.select(plot_selector)
             .append('svg')
             .attr('width', width)
             .attr('height', height);
         var plot = scatter_plot_obj.create_scatterplot(svg,
             data,
             domain,
             range,
             generate_axis_label(x_attr, logTransform.x, units.x),  // xLabel
             generate_axis_label(y_attr, logTransform.y, units.y),  // yLabel
             'x',     // xParam
             'y',     // yParam
             margin,
             legend,
             width,
             height,
             cohort_map
         );

         return  {plot : plot, svg : svg}
    }

    /*
        Generate violin plot
     */
    function generate_violin_plot(margin, plot_selector, legend_selector, legend, height, width, x_attr, y_attr, cohort_map, data, units, logTransform) {
        var violin_width = 200;
        var tmp = helpers.get_min_max(data, 'y');
        if(tmp[0] === tmp[1]){
             tmp[0] -= 0.5;
             tmp[1] += 0.5;
        }

        var min_n = tmp[0];
        var max_n = tmp[1];
        legend['svg'] = d3.select(legend_selector)
                    .append('svg')
                    .attr('width', 850);
        var svg = d3.select(plot_selector)
            .append('svg')
            .attr('width', width)
            .attr('height', height);
        var plot = violin_plot_obj.createViolinPlot(svg,
            data,
            height,
            violin_width,
            max_n,
            min_n,
            generate_axis_label(x_attr, false, units.x),
            generate_axis_label(y_attr, logTransform.y, units.y),
            'x',
            'y',
            margin,
            legend,
            cohort_map
        );

        return  {plot : plot, svg : svg}
    }

    /*
        Generate violin plot with axis swap
     */
    function generate_violin_plot_axis_swap(margin, plot_selector, legend_selector, legend, height, width, x_attr, y_attr, cohort_map, data, units, logTransform) {
        var violin_width = 200;
        var tmp = helpers.get_min_max(data, 'x');
        if(tmp[0] === tmp[1]){
             tmp[0] -= 0.5;
             tmp[1] += 0.5;
        }
        var min_n = tmp[0];
        var max_n = tmp[1];
        legend['svg'] = d3.select(legend_selector)
            .append('svg')
            .attr('width', 850);

        var svg = d3.select(plot_selector)
            .append('svg')
            .attr('width', width)
            .attr('height', height);

        var plot = violin_plot_obj.createViolinPlot(svg,
            data,
            height,
            violin_width,
            max_n,
            min_n,
            generate_axis_label(y_attr, logTransform.y, units.y),
            generate_axis_label(x_attr, false, units.x),
            'y',
            'x',
            legend,
            cohort_map
        );

        return  {plot : plot, svg : svg}
    }

    function generate_cubby_hole_plot(plot_selector, legend_selector, height, width, x_attr, y_attr, data, units) {
        var margin = {top: 10, bottom: 115, left: 140, right: 20};
        var cubby_max_size = 150; // max cubby size
        var cubby_min_size = 25; // min cubby size
        var x_label = generate_axis_label(x_attr, false, units.x);
        var y_label = generate_axis_label(y_attr, false, units.y);
        var font_width = 7.5;
        var min_width = x_label.length * font_width;
        var min_height = y_label.length * font_width;
        var view_width = width-margin.left-margin.right;
        var view_height = height-margin.top-margin.bottom;
        var xdomain = helpers.get_domain(data, 'x');
        var ydomain = helpers.get_domain(data, 'y');
        var legend = d3.select(legend_selector)
            .append('svg')
            .attr('width', 850);
        var cubby_size = Math.min(cubby_max_size, Math.min(Math.floor(view_width/xdomain.length), Math.floor(view_height/ydomain.length)));
        cubby_size = cubby_size < cubby_min_size ? cubby_min_size : cubby_size;

        //adjust margins if axis label is longer than plot size
        var margin_w_gap = min_width - xdomain.length * cubby_size;
        var margin_h_gap = min_height - ydomain.length * cubby_size;
        if(margin_w_gap > 0 ){
            margin.right += margin_w_gap/2 ;
            margin.left += margin_w_gap/2 ;
        }
        if(margin_h_gap > 0 ){
            margin.top += margin_h_gap/2 ;
            margin.bottom += margin_h_gap/2 ;
        }

        var plot_width = xdomain.length * cubby_size + margin.left + margin.right;
        var plot_height = ydomain.length * cubby_size + margin.top + margin.bottom;
        var svg = d3.select(plot_selector)
            .append('svg')
            .attr('width', plot_width)
            .attr('height', plot_height);

        var plot = cubby_plot_obj.create_cubbyplot(
            svg,
            margin,
            data,
            xdomain,
            ydomain,
            x_label,
            y_label,
            'x',
            'y',
            legend,
            plot_width,
            plot_height,
            cubby_size
        );
        return  {plot : plot, svg : svg}
    }

    function generate_seqpeek_plot(plot_selector, legend_selector, view_data) {
        var plot_data = view_data['plot_data'];
        var hugo_symbol = view_data['hugo_symbol'];

        var element = $(plot_selector)[0];
        var plot;
        var svg;
        if (plot_data.hasOwnProperty('tracks')) {
            seqpeek_view.render_seqpeek_legend(legend_selector);

            // Render a HTML table for the visualization. Each track will be in a separate <tr> element.
            var seqpeek_el = seqpeek_view.render_seqpeek_template(element, hugo_symbol, plot_data['tracks']);
            var table_selector = seqpeek_el.table;
            var gene_element = seqpeek_el.gene_element;

            plot = seqpeek_view.render_seqpeek(table_selector, gene_element, view_data);
            svg = [$(plot_selector).find('#seqpeek_row_4').children('svg')];
            $(legend_selector).show();
        }
        else {
            display_no_gene_mut_mssg(plot_selector, [hugo_symbol]);
        }
        return  {plot : plot, svg: svg};
    }

    function generate_oncoprint_plot(plot_selector, view_data) {
        var plot_data = view_data['plot_data'];
        var gene_list = view_data['gene_list'];
        var plot_message = view_data['plot_message'];
        if (plot_message){
            $('#plot-message-alert').show();
            $('#plot-message-alert p').text(plot_message);
        }
        var plot;
        if (plot_data && oncoprint_obj.isInputValid(plot_data)) {
            plot = oncoprint_obj.createOncoprintPlot(plot_selector, plot_data);
            //$('.worksheet.active .worksheet-panel-body .plot-div .oncoprint-diagram-downloads-icon').trigger('mouseover');
        }
        else {
            display_no_gene_mut_mssg(plot_selector, gene_list);
        }
        return  {plot : plot};
    }

    function generate_oncogrid_plot(plot_selector, view_data) {

        var donor_data_list = view_data['donor_data_list'];
        var gene_data_list = view_data['gene_data_list'];
        var observation_data_list = view_data['observation_data_list'];
        var donor_track_count_max = view_data['donor_track_count_max'];
        var plot;
        if (donor_data_list && gene_data_list && observation_data_list) {
            plot = oncogrid_obj.createOncogridPlot(donor_data_list, gene_data_list, observation_data_list, donor_track_count_max);
        }
        else {
            display_no_gene_mut_mssg(plot_selector, gene_list);
        }
        return  {plot : plot};
    }
    /*
        Generate url for gathering data
     */
    function get_data_url(base_url, cohorts, x_attr, y_attr, color_by_url_code, logTransform){
        var cohort_str = '';
        for (var i = 0; i < cohorts.length; i++) {
            if (i == 0) {
                cohort_str += 'cohort_id=' + cohorts[i];
            } else {
                cohort_str += '&cohort_id=' + cohorts[i];
            }
        }
        var api_url = base_url + '/visualizations/feature_data_plot/'+ VERSION + '?' + cohort_str;

        api_url += '&x_id=' + x_attr;
        if(color_by_url_code && color_by_url_code !== ''){
            api_url += '&c_id=' + color_by_url_code;
        }
        if (y_attr && y_attr !== '') {
            api_url += '&y_id=' + y_attr;
        }
        if(logTransform) {
            api_url += "&log_transform="+JSON.stringify(logTransform);
        }
        return api_url;
    }

    // Generate url for gathering data for a SeqPeek plot
    function get_seqpeek_data_url(base_url, cohorts, gene_label){
        var cohort_str = '';
        for (var i = 0; i < cohorts.length; i++) {
            if (i === 0) {
                cohort_str += 'cohort_id=' + cohorts[i];
            } else {
                cohort_str += '&cohort_id=' + cohorts[i];
            }
        }
        var seqpeek_url = base_url + '/visualizations/seqpeek_data_plot/' + VERSION + '?' + cohort_str;

        seqpeek_url += "&hugo_symbol=" + gene_label
            + (VERSION === 'v2' ? "&genomic_build=" + $('.workbook-build-display').data('build') : '');


        return seqpeek_url;
    }

    // Generate url for gathering data for a OncoPrint and OncoGrid plot
    function get_onco_data_url(base_url, plot_type, cohorts, gene_list){
        var cohort_str = '';
        for (var i = 0; i < cohorts.length; i++) {
            if (i == 0) {
                cohort_str += 'cohort_id=' + cohorts[i];
            } else {
                cohort_str += '&cohort_id=' + cohorts[i];
            }
        }
        var url = base_url + '/visualizations/'
            + (plot_type === 'OncoPrint' ? 'oncoprint_data_plot/': 'oncogrid_data_plot/')
            + VERSION + '?' + cohort_str + '&gene_list=' + gene_list.join(",")
            + (VERSION === 'v2' ? "&genomic_build=" + $('.workbook-build-display').data('build') : '');
        return url;
    }

    function configure_pairwise_display(element, data){
        if (data['pairwise_result'] && data['pairwise_result'].hasOwnProperty('result_vectors')) {
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

    function getPlotSvgNode(svg_node, legend_svg){
        var svg_css = 'svg { color: #333333; font-size: 14px; font-family: "proxima-nova", Arial, sans-serif; background-color: #fff; } ' +
            '.label { font-weight: 500; font-size: 1.1em; } ' +
            'foreignObject div {overflow: hidden;  text-overflow: ellipsis;  padding: 5px 5px 5px 5px;  line-height: 1.25; max-height: 100%;} ' +
            'foreignObject div.truncated-single { white-space: nowrap; text-align: end; }' +
            'foreignObject div.center { text-align: center; }' +
            '.x-label-container div, .y-label-container div { text-align: center; }' +
            '.axis path{ fill: none;  stroke: #000; }' +
            '.grid .tick, .axis .tick line { stroke: lightgrey; stroke-opacity: 0.7; }' +
            '.grid path { stroke-width: 0; } '+
            '.expected_fill.selected { stroke: #01307F; stroke-width: 5px; }' +
            '.extent { fill: rgba(40, 130, 50, 0.5); stroke: #fff; }' +
            '.plot-bar, .plot-bar { fill: rgba(0, 0, 0, 0.5); }' +
            '.plot-bar:hover, .plot-bar.selected { fill: rgba(0, 0, 225, 0.5); }';
        var svg_clone = svg_node.cloneNode(true);
        $(svg_clone).removeAttr('viewBox');
        $(svg_clone).prepend('<style>');
        $(svg_clone).find('style').append(svg_css);

        // var legend_svg = $(args.legend_selector).find('svg');
        if(legend_svg && legend_svg.length > 0) {
            var legend_svg_clone = legend_svg.clone();
            var legend_height = parseInt(legend_svg_clone.attr('height'));
            var svg_height = parseInt($(svg_clone).attr('height'));
            legend_svg_clone.attr('x', '0');
            legend_svg_clone.attr('y', svg_height+50);
            $(svg_clone).attr('height', svg_height + legend_height + 50);
            $(svg_clone).append(legend_svg_clone);
        }
        return svg_clone;
    }

    function select_plot(args){//plot_selector, legend_selector, pairwise_element, type, x_attr, y_attr, color_by, cohorts, cohort_override, data){
        var width  = $('.worksheet.active .worksheet-panel-body:first').width(),
            height = $('.worksheet.active .worksheet-panel-body:first').height(),
            // Top margin: required to keep top-most Y-axis ticks from being cut off on non-scrolled y axes
            // Bottom margin: takes into account double-wrapped x-axis title and wrapped long-text x-axis labels
            margin = {top: 15, bottom: 150, left: 80, right: 10},
            x_type = '',
            y_type = '';

        height = height < 600 ? 650 : height;
        var data = args.data;
        if (data.hasOwnProperty('pairwise_result')) {
            configure_pairwise_display(args.pairwise_element, data);
        }
        // The response form the SeqPeek data endpoint has a different schema. This is case is handled in
        // another branch below.
        var visualization;
        if (data.hasOwnProperty('items') && data['items'].length > 0) {

            var cohort_set = data['cohort_set'];
            var cohort_map = {};
            for(var i=0; i<cohort_set.length; i++){
                 cohort_map[cohort_set[i]['id']] = cohort_set[i]['name'];
            }

            var units = {
                x: data.xUnits,
                y: data.yUnits
            };

            var legend_title = args.legend_title;
            data = data['items'];

            switch (args.type){
                case "Bar Chart" : //x_type == 'STRING' && y_type == 'none'
                    visualization = generate_bar_chart(margin, args.plot_selector, height, width, args.x, data, units);
                    break;
                case "Histogram" : //((x_type == 'INTEGER' || x_type == 'FLOAT') && y_type == 'none') {
                    visualization = generate_histogram(margin, args.plot_selector, height, width, args.x, data, units, args.logTransform);
                    break;
                case 'Scatter Plot': //((x_type == 'INTEGER' || x_type == 'FLOAT') && (y_type == 'INTEGER'|| y_type == 'FLOAT')) {
                    visualization = generate_scatter_plot(margin, args.plot_selector, args.legend_selector, { 'title': legend_title, 'type': args.legend_type }, height, width, args.x, args.y, cohort_map, data, units, args.logTransform);
                    break;
                case "Violin Plot": //(x_type == 'STRING' && (y_type == 'INTEGER'|| y_type == 'FLOAT')) {
                    margin = {top: 15, bottom: 100, left: 110, right: 10};
                    visualization = generate_violin_plot(margin, args.plot_selector, args.legend_selector, { 'title': legend_title, 'type': args.legend_type }, height, width, args.x, args.y, cohort_map, data, units, args.logTransform);
                    break;
                // case 'Violin Plot with axis swap'://(y_type == 'STRING' && (x_type == 'INTEGER'|| x_type == 'FLOAT')) {
                //     visualization = generate_violin_plot_axis_swap(margin, args.plot_selector, args.legend_selector, legend_title, args.legend_type, height, width, args.x, args.y, args.color_by,  cohort_map, data, units, args.logTransform);
                //     break;
                case 'Cubby Hole Plot' : //(x_type == 'STRING' && y_type == 'STRING') {
                    visualization = generate_cubby_hole_plot(args.plot_selector, args.legend_selector, height, width, args.x, args.y, data, units);
                    break;
                default :
                    break;
            }

            // Data was not valid
            if(!visualization.plot) {

                $(args.plot_selector).empty().prepend('<div id="log-scale-alert" class="alert alert-warning alert-dismissable">'
                    + '<button type="button" class="close" data-dismiss="alert"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>'
                    + 'No valid data was returned for this plot. Double-check your plot type, '
                    + 'axis variables, and cohorts to make sure they can return valid data. Please note, some data types '
                    + 'cannot be log transformed due to negative values.</div>');

                // Hide the legend
                $(args.legend_selector).hide();
                return;
            }

            if(visualization.svg) {
                $(visualization.svg[0]).parents('.plot').find('.toggle-selection').unbind('click');
                $(visualization.svg[0]).parents('.plot').find('.toggle-selection').on('click', function () {
                    $(this).toggleClass('active');
                    visualization.plot.check_selection_state($(this).hasClass('active'));
                });
            }

            //establish marquee sample selection
            visualization.plot.check_selection_state($(visualization.svg[0]).parents('.plot').find('.toggle-selection').hasClass('active'));

            //store data
            //establish resize call to data

            // d3.select(window).on('resize', visualization.plot.resize);
            (args.type == "Cubby Hole Plot"|| args.legend_title) && $(args.legend_selector).show();

        } else if (args.type == "SeqPeek" && !data.message) {
            visualization = generate_seqpeek_plot(args.plot_selector, args.legend_selector, data);
        } else if (args.type == "OncoPrint" && !data.message) {
            visualization =  generate_oncoprint_plot(args.plot_selector, data);
        } else if (args.type == "OncoGrid" && !data.message) {
            visualization = generate_oncogrid_plot(args.plot_selector, data);
        } else {
            // No data returned
            d3.select(args.plot_selector)
                .append('svg')
                .attr('width', width)
                .attr('height', height)
                .append('text')
                .attr('fill', 'black')
                .style('font-size', 20)
                .attr('text-anchor', 'middle')
                .attr('transform', 'translate(' + (width/2) + ',' + (height/6) + ')')
                .text((data.message ? data.message : 'No samples were found for this combination of plot type, cohort, and axis variables.'));

            // Hide the legend
            $(args.legend_selector).hide();
        }
        if(visualization){
            $('.worksheet.active .plot-args').data('plot-json', (visualization.plot && visualization.plot.get_json) ? visualization.plot.get_json : null);
            $('.worksheet.active .plot-args').data('plot-csv', (visualization.plot && visualization.plot.get_csv) ? visualization.plot.get_csv : null);
            $('.worksheet.active .plot-args').data('plot-svg', (visualization.svg) ? visualization.svg[0][0] : (visualization.plot && visualization.plot.get_svg) ?  visualization.plot.get_svg : null);
            $('.worksheet.active .plot-args').data('plot-redraw', (visualization.plot && visualization.plot.redraw) ? visualization.plot.redraw : null);
        }
    }

    function get_plot_settings(plot_type, as_map){
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
        }

        if(as_map) {
            var map_settings = {};
            settings.axis.map(function(axis){
                map_settings[axis.name] = {
                    type: axis.type
                };
            });
            return map_settings;
        }

        return settings;
    }

    function generate_plot(args, callback){ //plot_selector, legend_selector, pairwise_element, type, x_attr, y_attr, color_by, cohorts, cohort_override, callback) {
        var plot_data_url;
        if (args.type == "SeqPeek") {
            plot_data_url = get_seqpeek_data_url(BASE_URL, args.cohorts, args.gene_label, VERSION);
        }
        else if(args.type == "OncoPrint" || args.type == "OncoGrid"){
            plot_data_url = get_onco_data_url(BASE_URL, args.type, args.cohorts, args.gene_list, VERSION);
        }
        else {
            plot_data_url = get_data_url(BASE_URL, args.cohorts, args.x, args.y, args.color_by.url_code, args.logTransform, VERSION);
        }

        $.ajax({
            type: 'GET',
            url: plot_data_url,
            success: function(data, status, xhr) {
                var plot_args = {plot_selector    : args.plot_selector,
                             legend_selector  : args.legend_selector,
                             pairwise_element : args.pairwise_element,
                             type             : args.type,
                             x                : args.x,
                             y                : args.y,
                             logTransform     : args.logTransform,
                             legend_title     : args.color_by.title,
                             legend_type      : args.color_by.var_type,
                             data             : data};
                //store plot args in jquery data for each worksheet
                $('.worksheet.active .plot-args').data('plot-args', plot_args);
                select_plot(plot_args);
                callback({bq_tables: data.bq_tables});

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
    }

    //clears the previous plot and re-draws the plot using the stored worksheet plot args
    function redraw_plot(){

        var redraw = $('.worksheet.active .plot-args').data('plot-redraw');
        if (redraw != null) {
            redraw();
        }
        else {
            var plot_loader = $('.worksheet.active .plot-loader');
            var plot_args = $('.worksheet.active .plot-args').data('plot-args');
            $(plot_args.plot_selector).empty();
            $(plot_args.legend_selector).empty();
            select_plot(plot_args);
        }
    }

    function svg_download(){
        var plot_args = $('.worksheet.active .plot-args').data('plot-args');
        var plot_svg = $('.worksheet.active .plot-args').data('plot-svg');
        var img_svg;
        if (plot_args.type === 'OncoGrid' || plot_args.type === 'OncoPrint') {
            img_svg = plot_svg();
        }
        else {
            img_svg = getPlotSvgNode(plot_svg, $(plot_args.legend_selector).find('svg'));
        }
        var xmlSerializer = new XMLSerializer();
        var content = xmlSerializer.serializeToString(img_svg);
        var blob = new Blob([content], {type: 'application/svg+xml'});
        saveAs(blob, 'plot.svg');
    }

    function png_download(){
        var plot_args = $('.worksheet.active .plot-args').data('plot-args');
        var plot_svg = $('.worksheet.active .plot-args').data('plot-svg');
        var img_svg;
        if (plot_args.type === 'OncoGrid' || plot_args.type === 'OncoPrint') {
            img_svg = plot_svg();
        }
        else {
            img_svg = getPlotSvgNode(plot_svg, $(plot_args.legend_selector).find('svg'));
        }
        var xmlSerializer = new XMLSerializer();
        var content = xmlSerializer.serializeToString(img_svg);
        var width = img_svg.getAttribute('width') || 1495;
        var height = img_svg.getAttribute('height') || 650;
        svgString2Image(content, width, height, function (dataBlob) {
            saveAs(dataBlob, 'plot.png')
        });
    }

    function svgString2Image(svgString, width, height, callback) {
        //convert SVG string to data URL
        var imgsrc = 'data:image/svg+xml;base64,'+ btoa(decodeURIComponent(encodeURIComponent(svgString)));
        var canvas = document.createElement('canvas');
        var context = canvas.getContext("2d");
        canvas.width = width;
        canvas.height = height;
        var image = new Image();
        image.onload = function() {
            context.clearRect (0, 0, width, height);
            context.drawImage(image, 0, 0, width, height);
            canvas.toBlob( function(blob) {
                if (callback) callback(blob);
            });
        };
        image.src = imgsrc;
    }

    var setFullscreen = function(isFullscreen){
        fullscreen = isFullscreen;
    };

    var toggleFullscreen = function(){
        fullscreen ? closeFullscreen(): openFullscreen();
    };

    var openFullscreen = function() {
        var plot_div = document.querySelector('.worksheet.active .plot-container');
        if (plot_div.requestFullscreen) {
            plot_div.requestFullscreen();
        } else if (plot_div.mozRequestFullScreen) { /* Firefox */
            plot_div.mozRequestFullScreen();
        } else if (plot_div.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
            plot_div.webkitRequestFullscreen();
        } else if (plot_div.msRequestFullscreen) { /* IE/Edge */
            plot_div.msRequestFullscreen();
        }
    };

    var closeFullscreen = function() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) { /* Firefox */
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) { /* Chrome, Safari and Opera */
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { /* IE/Edge */
            document.msExitFullscreen();
        }
    };

    var display_no_gene_mut_mssg = function(plot_selector, hugo_symbol_list) {
        $(plot_selector).html('<p> The selected cohorts have no somatic mutations in the gene <b>' + hugo_symbol_list.join(', ') + '</b></p>');
    };

    return {
        generate_plot     : generate_plot,
        svg_download: svg_download,
        png_download: png_download,
        redraw_plot : redraw_plot,
        toggleFullscreen: toggleFullscreen,
        setFullscreen: setFullscreen,
        get_plot_settings : get_plot_settings
    };
});
/**
 * Created by rossbohner on 12/20/15.
 */
