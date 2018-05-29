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
    'select2',
    'fileSaver',
    'cbio_util',
    'download_util',

], function($, jqueryui, bootstrap, session_security, d3, d3tip, d3textwrap, vizhelpers, scatter_plot, cubby_plot, violin_plot, histogram, bar_graph, seqpeek_view, oncoprint_plot, mock_histogram_data ) {

    var VERSION = $('#workbook-build :selected').data('plot-version') || $('.workbook-build-display').data('plot-version');

    var scatter_plot_obj = Object.create(scatter_plot, {});
    var cubby_plot_obj   = Object.create(cubby_plot, {});
    var violin_plot_obj  = Object.create(violin_plot, {});
    var histogram_obj    = Object.create(histogram, {});
    var bar_graph_obj    = Object.create(bar_graph, {});
    var oncoprint_obj    = Object.create(oncoprint_plot, {});
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
                return '<span>Mean: ' + mean.toFixed(2) + '</span><br /><span>' + (d.y * 100).toFixed(2) + '%</span>';
            });

    function generate_axis_label(attr, isLogTransform, units) {
        if(isLogTransform) {
            return $('option[value="' + attr + '"]:first').html() + " - log("+(units && units.length > 0 ? units : 'n')+"+1)";
        }
        return $('option[value="' + attr + '"]:first').html() + (units && units.length > 0 ? " - " + units : '')
    }

    /*
        Generate bar chart
     */
    function generate_bar_chart(margin, plot_selector, height, width, x_attr, data, units){
        // Bar Chart
        var svg = d3.select(plot_selector)
            .append('svg')
            .attr('width', width + 10)
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
            cubby_tip,
            margin);

        return  {plot : plot, svg : svg}
    }

    /*
        Generate Histogram
     */
    function generate_histogram(margin, plot_selector, height, width, x_attr, data, units, logTransform){
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
                generate_axis_label(x_attr, logTransform.x, units.x),
                cubby_tip,
                margin);

        return  {plot : plot, svg : svg}
    }

    /*
        Generate scatter plot
    */
    function generate_scatter_plot(margin, plot_selector, legend_selector, height, width, x_attr, y_attr, color_by, cohort_set, data, units, logTransform) {
         var domain = helpers.get_min_max(data, 'x');
         var range = helpers.get_min_max(data, 'y');

         var legend = d3.select(legend_selector)
             .append('svg')
             .attr('width', 850);
         var svg = d3.select(plot_selector)
             .append('svg')
             .attr('width', width + 10)
             .attr('height', height);
         var plot = scatter_plot_obj.create_scatterplot(svg,
             data,
             domain,
             range,
             generate_axis_label(x_attr, logTransform.x, units.x),  // xLabel
             generate_axis_label(y_attr, logTransform.y, units.y),  // yLabel
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
    function generate_violin_plot(margin, plot_selector, legend_selector, height, width, x_attr, y_attr, color_by, cohort_set, data, units, logTransform) {
        var violin_width = 200;
        var tmp = helpers.get_min_max(data, 'y');
        var min_n = tmp[0];
        var max_n = tmp[1];
        var legend = d3.select(legend_selector)
            .append('svg')
            .attr('width', 850);

        var svg = d3.select(plot_selector)
            .append('svg')
            //.attr('width', width + 10)
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
            color_by,
            legend,
            cohort_set
        );

        return  {plot : plot, svg : svg}
    }

    /*
        Generate violin plot with axis swap
     */
    function generate_violin_plot_axis_swap(margin, plot_selector, legend_selector, height, width, x_attr, y_attr, color_by, cohort_set, data, units, logTransform) {
        var violin_width = 200;
        var tmp = helpers.get_min_max(data, 'x');
        var min_n = tmp[0];
        var max_n = tmp[1];
        var legend = d3.select(legend_selector)
            .append('svg')
            .attr('width', 800);

        var svg = d3.select(plot_selector)
            .append('svg')
            //.attr('width', width + 10)
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
            color_by,
            legend,
            cohort_set
        );

        return  {plot : plot, svg : svg}
    }

    function generate_cubby_hole_plot(plot_selector, legend_selector, height, width, x_attr, y_attr, color_by, cohort_set, data, units) {
        var margin = {top: 10, bottom: 115, left: 140, right: 0};
        var cubby_size = 115;
        var xdomain = vizhelpers.get_domain(data, 'x');
        var ydomain = vizhelpers.get_domain(data, 'y');

        var cubby_width = xdomain.length * cubby_size + margin.left + margin.right;
        var cubby_height = ydomain.length * cubby_size + margin.top + margin.bottom;

        var svg = d3.select(plot_selector)
            .append('svg')
            .attr('width', cubby_width + 10)
            .attr('height', cubby_height)
            .style('padding-left','10px');

        var plot = cubby_plot_obj.create_cubbyplot(
            svg,
            margin,
            data,
            xdomain,
            ydomain,
            generate_axis_label(x_attr, false, units.x),
            generate_axis_label(y_attr, false, units.y),
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
            $(legend_selector).show();
        }
        else {
            // No data was found for the gene and cohorts
            seqpeek_view.render_no_data_message(plot_selector, hugo_symbol);
            $(legend_selector).hide();
        }
    }

    function generate_oncoprint_plot(plot_selector, view_data) {
        var plot_data = view_data['plot_data'];
        //console.log()
        /*var plot_data = "TCGA-25-2393-01	TP53	FUSION	FUSION\n\
TCGA-04-1331-01	PTEN	HOMDEL	CNA\n\
TCGA-04-1365-01	PTEN	HOMDEL	CNA\n\
TCGA-04-1648-01	TP53	HOMDEL	CNA\n\
TCGA-09-1666-01	PTEN	AMP	CNA\n\
TCGA-13-0720-01	PTEN	HOMDEL	CNA\n\
TCGA-13-0801-01	BRCA1	HOMDEL	CNA\n\
TCGA-13-0801-01	PTEN	HOMDEL	CNA\n\
TCGA-13-0905-01	PTEN	HOMDEL	CNA\n\
TCGA-13-0924-01	PTEN	HOMDEL	CNA\n\
TCGA-13-1405-01	PTEN	HOMDEL	CNA\n\
TCGA-13-1408-01	TP53	HOMDEL	CNA\n\
TCGA-13-1488-01	PTEN	HOMDEL	CNA\n\
TCGA-23-1023-01	PTEN	HOMDEL	CNA\n\
TCGA-23-1032-01	PTEN	HOMDEL	CNA\n\
TCGA-23-1107-01	PTEN	HOMDEL	CNA\n\
TCGA-23-1114-01	BRCA2	HOMDEL	CNA\n\
TCGA-23-1118-01	PTEN	AMP	CNA\n\
TCGA-23-1121-01	PTEN	AMP	CNA\n\
TCGA-23-2084-01	TP53	HOMDEL	CNA\n\
TCGA-24-0968-01	PTEN	HOMDEL	CNA\n\
TCGA-24-0970-01	BRCA2	AMP	CNA\n\
TCGA-24-1103-01	PTEN	HOMDEL	CNA\n\
TCGA-24-1474-01	TP53	AMP	CNA\n\
TCGA-24-1567-01	PTEN	HOMDEL	CNA\n\
TCGA-24-2030-01	PTEN	HOMDEL	CNA\n\
TCGA-24-2036-01	PTEN	HOMDEL	CNA\n\
TCGA-24-2262-01	PTEN	HOMDEL	CNA\n\
TCGA-24-2297-01	PTEN	HOMDEL	CNA\n\
TCGA-25-1322-01	BRCA2	AMP	CNA\n\
TCGA-25-2391-01	PTEN	HOMDEL	CNA\n\
TCGA-25-2401-01	BRCA2	HOMDEL	CNA\n\
TCGA-29-1697-01	PTEN	AMP	CNA\n\
TCGA-29-1702-01	TP53	AMP	CNA\n\
TCGA-29-1761-01	PTEN	HOMDEL	CNA\n\
TCGA-30-1860-01	PTEN	HOMDEL	CNA\n\
TCGA-31-1951-01	PTEN	HOMDEL	CNA\n\
TCGA-31-1959-01	BRCA1	HOMDEL	CNA\n\
TCGA-31-1959-01	PTEN	HOMDEL	CNA\n\
TCGA-36-1570-01	PTEN	HOMDEL	CNA\n\
TCGA-57-1586-01	BRCA1	HOMDEL	CNA\n\
TCGA-61-1728-01	PTEN	HOMDEL	CNA\n\
TCGA-61-1895-01	PTEN	HOMDEL	CNA\n\
TCGA-61-1907-01	BRCA2	HOMDEL	CNA\n\
TCGA-61-2012-01	TP53	AMP	CNA\n\
TCGA-61-2094-01	PTEN	HOMDEL	CNA\n\
TCGA-61-2097-01	BRCA2	HOMDEL	CNA\n\
TCGA-29-1702-01	TP53	UP	EXP\n\
TCGA-61-2012-01	TP53	UP	EXP\n\
TCGA-36-1570-01	PTEN	DOWN	EXP\n\
TCGA-57-1586-01	BRCA1	DOWN	EXP\n\
TCGA-61-1728-01	PTEN	DOWN	EXP\n\
TCGA-61-1895-01	PTEN	DOWN	EXP\n\
TCGA-61-1907-01	BRCA2	DOWN	EXP\n\
TCGA-25-1625-01	BRCA1	E116*	TRUNC\n\
TCGA-04-1357-01	BRCA1	Q1538A	MISSENSE\n\
TCGA-13-0893-01	BRCA1	K503fs	TRUNC\n\
TCGA-61-2109-01	BRCA1	K654fs	TRUNC\n\
TCGA-13-0761-01	BRCA1	R1495_splice	TRUNC\n\
TCGA-23-1118-01	BRCA1	E23fs	TRUNC\n\
TCGA-29-2427-01	BRCA1	L431*	TRUNC\n\
TCGA-23-1122-01	BRCA1	Q1756fs	TRUNC\n\
TCGA-25-2392-01	BRCA1	E1345fs	TRUNC\n\
TCGA-23-1027-01	BRCA1	E23fs	TRUNC\n\
TCGA-25-1632-01	BRCA1	L1216fs	TRUNC\n\
TCGA-23-1026-01	BRCA1	G813fs	TRUNC\n\
TCGA-13-0804-01	BRCA1	C47W	MISSENSE\n\
TCGA-24-2298-01	BRCA1	Q1395fs	TRUNC\n\
TCGA-61-2008-01	BRCA1	W1815*	TRUNC\n\
TCGA-09-2045-01	BRCA1	Q1779fs	TRUNC\n\
TCGA-04-1356-01	BRCA1	V722fs	TRUNC\n\
TCGA-25-1630-01	BRCA1	K519fs	TRUNC\n\
TCGA-24-1470-01	BRCA1	L1676fs	TRUNC\n\
TCGA-13-0730-01	BRCA1	R1835*	TRUNC\n\
TCGA-13-0883-01	BRCA1	Q1756fs	TRUNC\n\
TCGA-25-2401-01	BRCA1	Q1756fs	TRUNC\n\
TCGA-13-0903-01	BRCA1	R504fs	TRUNC\n\
TCGA-13-0887-01	BRCA1	E23fs	TRUNC\n\
TCGA-13-1494-01	BRCA1	K45_splice	TRUNC\n\
TCGA-09-2051-01	BRCA1	Q1756fs	TRUNC\n\
TCGA-23-2078-01	BRCA1	E23fs	TRUNC\n\
TCGA-23-2079-01	BRCA1	E23fs	TRUNC\n\
TCGA-10-0931-01	BRCA1	E23fs	TRUNC\n\
TCGA-59-2348-01	BRCA1	E797*	TRUNC\n\
TCGA-23-2077-01	BRCA1	Q1756fs	TRUNC\n\
TCGA-09-1669-01	BRCA1	E1345fs	TRUNC\n\
TCGA-23-2081-01	BRCA1	Q1756fs	TRUNC\n\
TCGA-13-1408-01	BRCA1	E23fs	TRUNC\n\
TCGA-13-1489-01	BRCA1	N1265fs	TRUNC\n\
TCGA-25-1318-01	BRCA2	L1491fs	TRUNC\n\
TCGA-13-0793-01	BRCA2	T3085fs	TRUNC\n\
TCGA-24-1463-01	BRCA2	G602fs	TRUNC\n\
TCGA-13-0913-01	BRCA2	E1857fs	TRUNC\n\
TCGA-04-1367-01	BRCA2	E294*	TRUNC\n\
TCGA-24-1562-01	BRCA2	K3326*	TRUNC\n\
TCGA-04-1331-01	BRCA2	C711*	TRUNC\n\
TCGA-24-1103-01	BRCA2	K1638E	MISSENSE\n\
TCGA-13-0885-01	BRCA2	K1406fs	TRUNC\n\
TCGA-13-0890-01	BRCA2	V1229fs	TRUNC\n\
TCGA-13-1512-01	BRCA2	K3326*	TRUNC\n\
TCGA-23-1030-01	BRCA2	T1354M	MISSENSE\n\
TCGA-23-1026-01	BRCA2	K3326*	TRUNC\n\
TCGA-25-1634-01	BRCA2	E2878_splice	TRUNC\n\
TCGA-24-1555-01	BRCA2	T2607fs	TRUNC\n\
TCGA-13-0886-01	BRCA2	S1982fs	TRUNC\n\
TCGA-13-0792-01	BRCA2	E1143D	MISSENSE\n\
TCGA-24-2293-01	BRCA2	R2520*	TRUNC\n\
TCGA-23-1120-01	BRCA2	L3277fs	TRUNC\n\
TCGA-57-1584-01	BRCA2	Q1782fs	TRUNC\n\
TCGA-13-0900-01	BRCA2	T256fs	TRUNC\n\
TCGA-24-2280-01	BRCA2	S1982fs	TRUNC\n\
TCGA-24-0975-01	BRCA2	V211_splice	TRUNC\n\
TCGA-24-2288-01	BRCA2	T219fs	TRUNC\n\
TCGA-24-1417-01	BRCA2	R1704fs	TRUNC\n\
TCGA-13-1498-01	BRCA2	S1982fs	TRUNC\n\
TCGA-13-1499-01	BRCA2	S1982fs	TRUNC\n\
TCGA-13-0726-01	BRCA2	R2394*	TRUNC\n\
TCGA-25-2404-01	BRCA2	E342fs	TRUNC\n\
TCGA-13-1481-01	BRCA2	L2696fs	TRUNC\n\
TCGA-10-0930-01	PTEN	V175L	MISSENSE\n\
TCGA-13-1492-01	PTEN	R233fs	TRUNC\n\
TCGA-24-0968-01	TP53	H193R	MISSENSE\n\
TCGA-13-1505-01	TP53	P75fs	TRUNC\n\
TCGA-04-1336-01	TP53	R248W	MISSENSE\n\
TCGA-24-2261-01	TP53	Y163C	MISSENSE\n\
TCGA-13-0912-01	TP53	S261_splice	TRUNC\n\
TCGA-36-1580-01	TP53	R273C	MISSENSE\n\
TCGA-59-2352-01	TP53	G266V	MISSENSE\n\
TCGA-25-2409-01	TP53	R248W	MISSENSE\n\
TCGA-61-1919-01	TP53	I195T	MISSENSE\n\
TCGA-13-0919-01	TP53	V157F	MISSENSE\n\
TCGA-09-2051-01	TP53	P222fs	TRUNC\n\
TCGA-09-2050-01	TP53	L257Q	MISSENSE\n\
TCGA-25-1626-01	TP53	G245V	MISSENSE\n\
TCGA-09-2049-01	TP53	G245S	MISSENSE\n\
TCGA-24-1417-01	TP53	R248W	MISSENSE\n\
TCGA-24-1422-01	TP53	R248W	MISSENSE\n\
TCGA-13-0924-01	TP53	F270L	MISSENSE\n\
TCGA-61-2109-01	TP53	R306fs	TRUNC\n\
TCGA-24-1416-01	TP53	R282W	MISSENSE\n\
TCGA-24-1564-01	TP53	G187_splice	TRUNC\n\
TCGA-61-2088-01	TP53	MCN237del	INFRAME\n\
TCGA-10-0934-01	TP53	R248Q	MISSENSE\n\
TCGA-61-2003-01	TP53	R175H	MISSENSE\n\
TCGA-10-0934-01	TP53	R273H	MISSENSE\n\
TCGA-09-1666-01	TP53	Y126_splice	TRUNC\n\
TCGA-13-0714-01	TP53	S127F	MISSENSE\n\
TCGA-13-1510-01	TP53	R213*	TRUNC\n\
TCGA-36-1576-01	TP53	R337fs	TRUNC\n\
TCGA-25-1329-01	TP53	P47fs	TRUNC\n\
TCGA-13-1481-01	TP53	P177R	MISSENSE\n\
TCGA-04-1337-01	TP53	C135R	MISSENSE\n\
TCGA-24-1428-01	TP53	I195N	MISSENSE\n\
TCGA-24-1567-01	TP53	R282W	MISSENSE\n\
TCGA-04-1332-01	TP53	R181P	MISSENSE\n\
TCGA-04-1349-01	TP53	S241F	MISSENSE\n\
TCGA-61-2008-01	TP53	G117fs	TRUNC\n\
TCGA-13-0791-01	TP53	R273L	MISSENSE\n\
TCGA-09-1669-01	TP53	Q331_splice	TRUNC\n\
TCGA-24-2019-01	TP53	I232N	MISSENSE\n\
TCGA-24-1425-01	TP53	Y234C	MISSENSE\n\
TCGA-24-1423-01	TP53	P191del	INFRAME\n\
TCGA-10-0926-01	TP53	Y163C	MISSENSE\n\
TCGA-13-0760-01	TP53	L265P	MISSENSE\n\
TCGA-24-1556-01	TP53	A307_splice	TRUNC\n\
TCGA-24-1558-01	TP53	R273H	MISSENSE\n\
TCGA-25-2404-01	TP53	H214R	MISSENSE\n\
TCGA-24-1616-01	TP53	Y236C	MISSENSE\n\
TCGA-13-0720-01	TP53	A159V	MISSENSE\n\
TCGA-24-2280-01	TP53	Q192*	TRUNC\n\
TCGA-13-0793-01	TP53	C124fs	TRUNC\n\
TCGA-24-1604-01	TP53	A307_splice	TRUNC\n\
TCGA-09-1659-01	TP53	E294*	TRUNC\n\
TCGA-24-1413-01	TP53	E198*	TRUNC\n\
TCGA-09-1662-01	TP53	C176Y	MISSENSE\n\
TCGA-13-0724-01	TP53	V157F	MISSENSE\n\
TCGA-24-2030-01	TP53	G187_splice	TRUNC\n\
TCGA-13-1484-01	TP53	Y234N	MISSENSE\n\
TCGA-24-2254-01	TP53	S241F	MISSENSE\n\
TCGA-61-2101-01	TP53	P85fs	TRUNC\n\
TCGA-09-0366-01	TP53	K132N	MISSENSE\n\
TCGA-04-1365-01	TP53	Y126_splice	TRUNC\n\
TCGA-09-2053-01	TP53	Y163H	MISSENSE\n\
TCGA-24-2024-01	TP53	V272M	MISSENSE\n\
TCGA-23-1120-01	TP53	R110L	MISSENSE\n\
TCGA-24-0970-01	TP53	G187_splice	TRUNC\n\
TCGA-13-1489-01	TP53	R342*	TRUNC\n\
TCGA-24-1103-01	TP53	A307_splice	TRUNC\n\
TCGA-57-1993-01	TP53	R248Q	MISSENSE\n\
TCGA-25-1322-01	TP53	Y205C	MISSENSE\n\
TCGA-13-0751-01	TP53	L348fs	TRUNC\n\
TCGA-04-1356-01	TP53	Y220C	MISSENSE\n\
TCGA-10-0928-01	TP53	G105S	MISSENSE\n\
TCGA-23-2077-01	TP53	R175H	MISSENSE\n\
TCGA-13-0890-01	TP53	Y126_splice	TRUNC\n\
TCGA-04-1525-01	TP53	R282fs	TRUNC\n\
TCGA-23-1022-01	TP53	K164E	MISSENSE\n\
TCGA-13-0905-01	TP53	R273P	MISSENSE\n\
TCGA-30-1862-01	TP53	E224_splice	TRUNC\n\
TCGA-13-0765-01	TP53	AMP64_264L>LSSGNL	INFRAME\n\
TCGA-31-1953-01	TP53	V97fs	TRUNC\n\
TCGA-04-1514-01	TP53	Y126_splice	TRUNC\n\
TCGA-13-1509-01	TP53	L330fs	TRUNC\n\
TCGA-24-1419-01	TP53	R248Q	MISSENSE\n\
TCGA-25-1321-01	TP53	R273C	MISSENSE\n\
TCGA-20-0987-01	TP53	G105R	MISSENSE\n\
TCGA-23-1024-01	TP53	G108fs	TRUNC\n\
TCGA-24-2290-01	TP53	V274G	MISSENSE\n\
TCGA-23-1124-01	TP53	R156P	MISSENSE\n\
TCGA-61-2094-01	TP53	L130V	MISSENSE\n\
TCGA-25-1625-01	TP53	V216M	MISSENSE\n\
TCGA-61-1736-01	TP53	G245R	MISSENSE\n\
TCGA-13-0800-01	TP53	K132M	MISSENSE\n\
TCGA-24-1555-01	TP53	H179Q	MISSENSE\n\
TCGA-25-2391-01	TP53	E51fs	TRUNC\n\
TCGA-24-1434-01	TP53	L344fs	TRUNC\n\
TCGA-04-1517-01	TP53	R65*	TRUNC\n\
TCGA-09-1661-01	TP53	G187_splice	TRUNC\n\
TCGA-61-1995-01	TP53	C238Y	MISSENSE\n\
TCGA-31-1959-01	TP53	C238F	MISSENSE\n\
TCGA-24-1614-01	TP53	V157F	MISSENSE\n\
TCGA-36-1569-01	TP53	W53*	TRUNC\n\
TCGA-24-2271-01	TP53	K321*	TRUNC\n\
TCGA-23-1123-01	TP53	C176Y	MISSENSE\n\
TCGA-13-1507-01	TP53	T140fs	TRUNC\n\
TCGA-13-0913-01	TP53	P278R	MISSENSE\n\
TCGA-13-0899-01	TP53	Q317*	TRUNC\n\
TCGA-23-1110-01	TP53	C176Y	MISSENSE\n\
TCGA-25-1319-01	TP53	Y220C	MISSENSE\n\
TCGA-24-1548-01	TP53	Y220C	MISSENSE\n\
TCGA-13-0910-01	TP53	C275Y	MISSENSE\n\
TCGA-04-1346-01	TP53	H179R	MISSENSE\n\
TCGA-04-1350-01	TP53	H179R	MISSENSE\n\
TCGA-25-1326-01	TP53	E286K	MISSENSE\n\
TCGA-24-1549-01	TP53	V225_splice	TRUNC\n\
TCGA-13-0891-01	TP53	Y220C	MISSENSE\n\
TCGA-10-0931-01	TP53	Q136*	TRUNC\n\
TCGA-13-1411-01	TP53	C277F	MISSENSE\n\
TCGA-13-1498-01	TP53	I332_splice	TRUNC\n\
TCGA-24-2260-01	TP53	R248Q	MISSENSE\n\
TCGA-23-1030-01	TP53	R175H	MISSENSE\n\
TCGA-04-1342-01	TP53	N288fs	TRUNC\n\
TCGA-13-0723-01	TP53	T150fs	TRUNC\n\
TCGA-24-2289-01	TP53	R196*	TRUNC\n\
TCGA-61-1728-01	TP53	Y220C	MISSENSE\n\
TCGA-13-0883-01	TP53	C238fs	TRUNC\n\
TCGA-23-1026-01	TP53	K132R	MISSENSE\n\
TCGA-61-2097-01	TP53	R342*	TRUNC\n\
TCGA-59-2354-01	TP53	Y220C	MISSENSE\n\
TCGA-59-2350-01	TP53	Y220C	MISSENSE\n\
TCGA-59-2363-01	TP53	Y220C	MISSENSE\n\
TCGA-23-1122-01	TP53	R175H	MISSENSE\n\
TCGA-13-0887-01	TP53	R213*	TRUNC\n\
TCGA-13-0762-01	TP53	H193R	MISSENSE\n\
TCGA-59-2351-01	TP53	T140fs	TRUNC\n\
TCGA-25-2398-01	TP53	154_154G>GTDSTPPPG	INFRAME\n\
TCGA-25-1315-01	TP53	R273H	MISSENSE\n\
TCGA-24-2298-01	TP53	V225_splice	TRUNC\n\
TCGA-13-1497-01	TP53	R333fs	TRUNC\n\
TCGA-13-0792-01	TP53	C238fs	TRUNC\n\
TCGA-13-0903-01	TP53	Y205C	MISSENSE\n\
TCGA-30-1853-01	TP53	G245D	MISSENSE\n\
TCGA-57-1582-01	TP53	Y236C	MISSENSE\n\
TCGA-24-0966-01	TP53	G245V	MISSENSE\n\
TCGA-24-1557-01	TP53	Y126_splice	TRUNC\n\
TCGA-59-2355-01	TP53	Q331_splice	TRUNC\n\
TCGA-23-1023-01	TP53	D281G	MISSENSE\n\
TCGA-10-0927-01	TP53	P36fs	TRUNC\n\
TCGA-09-2044-01	TP53	G187_splice	TRUNC\n\
TCGA-13-0906-01	TP53	F134V	MISSENSE\n\
TCGA-25-1627-01	TP53	Y220C	MISSENSE\n\
TCGA-13-1482-01	TP53	R280I	MISSENSE\n\
TCGA-24-2281-01	TP53	R175H	MISSENSE\n\
TCGA-13-0889-01	TP53	R273C	MISSENSE\n\
TCGA-24-1562-01	TP53	S33_splice	TRUNC\n\
TCGA-13-1488-01	TP53	R306*	TRUNC\n\
TCGA-61-2016-01	TP53	E204*	TRUNC\n\
TCGA-04-1362-01	TP53	V225_splice	TRUNC\n\
TCGA-13-0717-01	TP53	AMP44_246GGM>V	INFRAME\n\
TCGA-61-2104-01	TP53	Y163N	MISSENSE\n\
TCGA-13-0885-01	TP53	W146*	TRUNC\n\
TCGA-24-2288-01	TP53	P250L	MISSENSE\n\
TCGA-13-0726-01	TP53	R282W	MISSENSE\n\
TCGA-10-0938-01	TP53	Q331_splice	TRUNC\n\
TCGA-24-2035-01	TP53	S315fs	TRUNC\n\
TCGA-13-1492-01	TP53	G187_splice	TRUNC\n\
TCGA-24-1105-01	TP53	V157F	MISSENSE\n\
TCGA-13-1494-01	TP53	G105C	MISSENSE\n\
TCGA-24-0979-01	TP53	R248Q	MISSENSE\n\
TCGA-04-1361-01	TP53	Y234C	MISSENSE\n\
TCGA-25-1628-01	TP53	E51*	TRUNC\n\
TCGA-13-1491-01	TP53	C275Y	MISSENSE\n\
TCGA-25-1635-01	TP53	D259Y	MISSENSE\n\
TCGA-13-1506-01	TP53	M66fs	TRUNC\n\
TCGA-24-1560-01	TP53	G244C	MISSENSE\n\
TCGA-13-1410-01	TP53	L130fs	TRUNC\n\
TCGA-13-0804-01	TP53	R273H	MISSENSE\n\
TCGA-24-1464-01	TP53	N239S	MISSENSE\n\
TCGA-10-0935-01	TP53	G187_splice	TRUNC\n\
TCGA-23-1032-01	TP53	R248Q	MISSENSE\n\
TCGA-25-1630-01	TP53	V173L	MISSENSE\n\
TCGA-61-2012-01	TP53	Y220C	MISSENSE\n\
TCGA-36-1568-01	TP53	G245S	MISSENSE\n\
TCGA-23-2072-01	TP53	Q331_splice	TRUNC\n\
TCGA-13-1487-01	TP53	M237K	MISSENSE\n\
TCGA-24-1426-01	TP53	R273C	MISSENSE\n\
TCGA-24-1470-01	TP53	S260fs	TRUNC\n\
TCGA-13-0920-01	TP53	Q100*	TRUNC\n\
TCGA-13-0761-01	TP53	R273H	MISSENSE\n\
TCGA-25-1320-01	TP53	C124fs	TRUNC\n\
TCGA-23-1021-01	TP53	A159V	MISSENSE\n\
TCGA-04-1348-01	TP53	G266R	MISSENSE\n\
TCGA-23-1027-01	TP53	E198*	TRUNC\n\
TCGA-04-1338-01	TP53	G245S	MISSENSE\n\
TCGA-23-1117-01	TP53	Q144fs	TRUNC\n\
TCGA-36-1578-01	TP53	R273H	MISSENSE\n\
TCGA-36-1575-01	TP53	R273H	MISSENSE\n\
TCGA-36-1574-01	TP53	R273H	MISSENSE\n\
TCGA-25-2399-01	TP53	R175H	MISSENSE\n\
TCGA-25-1634-01	TP53	A70fs	TRUNC\n\
TCGA-30-1891-01	TP53	L194R	MISSENSE\n\
TCGA-36-1577-01	TP53	E224_splice	TRUNC\n\
TCGA-13-0900-01	TP53	R273H	MISSENSE\n\
TCGA-24-1466-01	TP53	R249G	MISSENSE\n\
TCGA-61-2092-01	TP53	D208V	MISSENSE\n\
TCGA-04-1347-01	TP53	S215R	MISSENSE\n\
TCGA-20-0990-01	TP53	Q144*	TRUNC\n\
TCGA-13-1499-01	TP53	R273C	MISSENSE\n\
TCGA-24-1104-01	TP53	I195T	MISSENSE\n\
TCGA-24-1418-01	TP53	S227fs	TRUNC\n\
TCGA-57-1583-01	TP53	C229fs	TRUNC\n\
TCGA-29-2427-01	TP53	G244D	MISSENSE\n\
TCGA-13-1499-01	TP53	R248Q	MISSENSE\n\
TCGA-13-0795-01	TP53	C135Y	MISSENSE\n\
TCGA-13-1496-01	TP53	R248Q	MISSENSE\n\
TCGA-09-2045-01	TP53	H179R	MISSENSE\n\
TCGA-23-2081-01	TP53	G262V	MISSENSE\n\
TCGA-24-1474-01	TP53	Q192*	TRUNC\n\
TCGA-25-1623-01	TP53	R282W	MISSENSE\n\
TCGA-24-1551-01	TP53	R248W	MISSENSE\n\
TCGA-24-1431-01	TP53	Q192*	TRUNC\n\
TCGA-13-2060-01	TP53	H179R	MISSENSE\n\
TCGA-25-1631-01	TP53	T125_splice	TRUNC\n\
TCGA-13-0893-01	TP53	G245D	MISSENSE\n\
TCGA-13-1495-01	TP53	I195F	MISSENSE\n\
TCGA-24-1603-01	TP53	S315fs	TRUNC\n\
TCGA-04-1530-01	TP53	R273H	MISSENSE\n\
TCGA-04-1542-01	TP53	R273H	MISSENSE\n\
TCGA-24-1471-01	TP53	E271*	TRUNC\n\
TCGA-61-2102-01	TP53	G266R	MISSENSE\n\
TCGA-24-1469-01	TP53	I195T	MISSENSE\n\
TCGA-57-1584-01	TP53	C176Y	MISSENSE\n\
TCGA-13-1407-01	TP53	F109C	MISSENSE\n\
TCGA-13-1512-01	TP53	R273L	MISSENSE\n\
TCGA-23-1028-01	TP53	P250L	MISSENSE\n\
TCGA-13-0894-01	TP53	H193Y	MISSENSE\n\
TCGA-13-1409-01	TP53	S261_splice	TRUNC\n\
TCGA-24-0982-01	TP53	R248W	MISSENSE\n\
TCGA-36-1570-01	TP53	R248fs	TRUNC\n\
TCGA-13-0730-01	TP53	H178fs	TRUNC\n\
TCGA-61-2000-01	TP53	K132E	MISSENSE\n\
TCGA-61-2110-01	TP53	S127Y	MISSENSE\n\
TCGA-31-1950-01	TP53	I195T	MISSENSE\n\
TCGA-24-1424-01	TP53	I195T	MISSENSE\n\
TCGA-25-1632-01	TP53	R248G	MISSENSE\n\
TCGA-24-1427-01	TP53	V272fs	TRUNC\n\
TCGA-61-1998-01	TP53	S215R	MISSENSE\n\
TCGA-13-0904-01	TP53	G279E	MISSENSE\n\
TCGA-13-0923-01	TP53	G187_splice	TRUNC\n\
TCGA-24-1563-01	TP53	I195T	MISSENSE\n\
TCGA-13-1504-01	TP53	I251S	MISSENSE\n\
TCGA-25-1324-01	TP53	Y126_splice	TRUNC\n\
TCGA-13-0897-01	TP53	R283fs	TRUNC\n\
TCGA-04-1331-01	TP53	R306*	TRUNC\n\
TCGA-10-0937-01	TP53	R282W	MISSENSE\n\
TCGA-13-1405-01	TP53	R196*	TRUNC\n\
TCGA-04-1364-01	TP53	R248Q	MISSENSE\n\
TCGA-20-0991-01	TP53	S241F	MISSENSE\n\
TCGA-24-2267-01	TP53	T284fs	TRUNC\n\
TCGA-13-1404-01	TP53	C176Y	MISSENSE\n\
TCGA-13-0911-01	TP53	L43fs	TRUNC\n\
TCGA-25-1313-01	TP53	L145R	MISSENSE\n\
TCGA-36-1571-01	TP53	R337C	MISSENSE\n\
TCGA-13-0884-01	TP53	R342*	TRUNC\n\
TCGA-23-2078-01	TP53	T256del	INFRAME\n\
TCGA-13-1412-01	TP53	M237I	MISSENSE\n\
TCGA-24-1545-01	TP53	S241Y	MISSENSE\n\
TCGA-25-2401-01	TP53	L194R	MISSENSE\n\
TCGA-24-1436-01	TP53	Q331_splice	TRUNC\n\
TCGA-25-2400-01	TP53	E224_splice	TRUNC\n\
TCGA-04-1357-01	TP53	P223fs	TRUNC\n\
TCGA-13-1403-01	TP53	T125_splice	TRUNC\n\
TCGA-13-0886-01	TP53	V272M	MISSENSE\n\
TCGA-25-1318-01	TP53	R175H	MISSENSE\n\
TCGA-23-1116-01	TP53	S261_splice	TRUNC\n\
TCGA-10-0925-01\n\
TCGA-10-0926-01\n\
TCGA-10-0927-01\n\
TCGA-10-0928-01\n\
TCGA-10-0930-01\n\
TCGA-10-0931-01\n\
TCGA-10-0933-01\n\
TCGA-10-0934-01\n\
TCGA-20-1684-01\n\
TCGA-20-1685-01\n\
TCGA-20-1686-01\n\
TCGA-20-1687-01\n\
TCGA-23-1021-01\n\
TCGA-23-1022-01\n\
TCGA-23-1023-01\n\
TCGA-23-1024-01\n\
TCGA-23-1026-01\n\
TCGA-23-1027-01\n\
TCGA-23-1028-01\n\
TCGA-23-1029-01\n\
TCGA-23-1030-01\n\
TCGA-23-1031-01\n\
TCGA-23-1032-01\n\
TCGA-23-1107-01\n\
TCGA-23-1109-01\n\
TCGA-23-1110-01\n\
TCGA-23-1111-01\n\
TCGA-23-1113-01\n\
TCGA-23-1114-01\n\
TCGA-23-1116-01\n\
TCGA-23-1117-01\n\
TCGA-23-1118-01\n\
TCGA-23-1119-01\n\
TCGA-23-1120-01\n\
TCGA-23-1121-01\n\
TCGA-23-1122-01\n\
TCGA-23-1123-01\n\
TCGA-23-1124-01\n\
TCGA-23-1809-01\n\
TCGA-23-2072-01\n\
TCGA-23-2077-01\n\
TCGA-23-2078-01\n\
TCGA-23-2079-01\n\
TCGA-23-2081-01\n\
TCGA-23-2084-01\n\
TCGA-23-2641-01\n\
TCGA-23-2643-01\n\
TCGA-23-2645-01\n\
TCGA-23-2647-01\n\
TCGA-23-2649-01\n\
TCGA-24-0966-01\n\
TCGA-24-0968-01\n\
TCGA-24-0970-01\n\
TCGA-24-0975-01\n\
TCGA-24-0979-01\n\
TCGA-24-0980-01\n\
TCGA-24-0981-01\n\
TCGA-24-0982-01\n\
TCGA-24-1103-01\n\
TCGA-24-1104-01\n\
TCGA-24-1105-01\n\
TCGA-24-1413-01\n\
TCGA-24-1416-01\n\
TCGA-24-1417-01\n\
TCGA-24-1418-01\n\
TCGA-24-1419-01\n\
TCGA-24-1422-01\n\
TCGA-24-1423-01\n\
TCGA-24-1424-01\n\
TCGA-24-1425-01\n\
TCGA-24-1426-01\n\
TCGA-24-1427-01\n\
TCGA-24-1428-01\n\
TCGA-24-1430-01\n\
TCGA-24-1431-01\n\
TCGA-24-1434-01\n\
TCGA-24-1435-01\n\
TCGA-24-1436-01\n\
TCGA-24-1463-01\n\
TCGA-24-1464-01\n\
TCGA-24-1466-01\n\
TCGA-24-1467-01\n\
TCGA-24-1469-01\n\
TCGA-24-1470-01\n\
TCGA-24-1471-01\n\
TCGA-24-1474-01\n\
TCGA-24-1544-01\n\
TCGA-24-1545-01\n\
TCGA-24-1546-01\n\
TCGA-24-1548-01\n\
TCGA-24-1549-01\n\
TCGA-24-1550-01\n\
TCGA-24-1551-01\n\
TCGA-24-1552-01\n\
TCGA-24-1553-01\n\
TCGA-24-1555-01\n\
TCGA-24-1556-01\n\
TCGA-24-1557-01\n\
TCGA-24-1558-01\n\
TCGA-24-1560-01\n\
TCGA-24-1562-01\n\
TCGA-24-1563-01\n\
TCGA-24-1564-01\n\
TCGA-24-1565-01\n\
TCGA-24-1567-01\n\
TCGA-24-1603-01\n\
TCGA-24-1604-01\n\
TCGA-24-1614-01\n\
TCGA-24-1616-01\n\
TCGA-24-1842-01\n\
TCGA-24-1843-01\n\
TCGA-24-1844-01\n\
TCGA-24-1845-01\n\
TCGA-24-1846-01\n\
TCGA-24-1847-01\n\
TCGA-24-1849-01\n\
TCGA-24-1850-01\n\
TCGA-24-1852-01\n\
TCGA-24-1920-01\n\
TCGA-24-1923-01\n\
TCGA-24-1924-01\n\
TCGA-24-1927-01\n\
TCGA-24-1928-01\n\
TCGA-24-1930-01\n\
TCGA-24-2019-01\n\
TCGA-24-2020-01\n\
TCGA-24-2023-01\n\
TCGA-24-2024-01\n\
TCGA-24-2026-01\n\
TCGA-24-2027-01\n\
TCGA-24-2029-01\n\
TCGA-24-2030-01\n\
TCGA-24-2033-01\n\
TCGA-24-2035-01\n\
TCGA-24-2036-01\n\
TCGA-24-2038-01\n\
TCGA-24-2254-01\n\
TCGA-24-2260-01\n\
TCGA-24-2261-01\n\
TCGA-24-2262-01\n\
TCGA-24-2267-01\n\
TCGA-24-2271-01\n\
TCGA-24-2280-01\n\
TCGA-24-2281-01\n\
TCGA-24-2288-01\n\
TCGA-24-2289-01\n\
TCGA-24-2290-01\n\
TCGA-24-2293-01\n\
TCGA-24-2295-01\n\
TCGA-24-2297-01\n\
TCGA-24-2298-01\n\
TCGA-25-1312-01\n\
TCGA-25-1313-01\n\
TCGA-25-1314-01\n\
TCGA-25-1315-01\n\
TCGA-25-1316-01\n\
TCGA-25-1317-01\n\
TCGA-25-1318-01\n\
TCGA-25-1319-01\n\
TCGA-25-1320-01\n\
TCGA-25-1321-01\n\
TCGA-25-1322-01\n\
TCGA-25-1323-01\n\
TCGA-25-1324-01\n\
TCGA-25-1325-01\n\
TCGA-25-1326-01\n\
TCGA-25-1328-01\n\
TCGA-25-1329-01\n\
TCGA-25-1623-01\n\
TCGA-25-1625-01\n\
TCGA-25-1626-01\n\
TCGA-25-1627-01\n\
TCGA-25-1628-01\n\
TCGA-25-1630-01\n\
TCGA-25-1631-01\n\
TCGA-25-1632-01\n\
TCGA-25-1633-01\n\
TCGA-25-1634-01\n\
TCGA-25-1635-01\n\
TCGA-25-1870-01\n\
TCGA-25-1871-01\n\
TCGA-25-1877-01\n\
TCGA-25-1878-01\n\
TCGA-25-2042-01\n\
TCGA-25-2390-01\n\
TCGA-25-2391-01\n\
TCGA-25-2396-01\n\
TCGA-25-2397-01\n\
TCGA-25-2398-01\n\
TCGA-25-2399-01\n\
TCGA-25-2400-01\n\
TCGA-25-2401-01\n\
TCGA-25-2392-01\n\
TCGA-25-2393-01\n\
        ";*/
        var gene_list = view_data['gene_list'];
        var element = $(plot_selector)[0];
        $(element).append('<div id="oncoprint_controls"></div>')
            .append('<script type="text/template" id="main-controls-template">'+
                            '<style>' +
                                '.onco-customize {color:#2153AA; font-weight: bold; cursor: pointer;}' +
                                '.onco-customize:hover { text-decoration: underline; }' +
                            '</style>'+
                            '<div id="main" style="display:inline;"></div>'+
                            '</script>')
            .append('<div id="oncoprint"></div>');
        $('#oncoprint').html(
            "<div class=\"cbioportal_logo\">" +
            "   <img src=\"/static/img/cbioportal_logo.png\">\n"+
            "</div>\n"+
            "<div class=\"btn-group btn-group-sm\" id=\"oncoprint-diagram-toolbar-buttons\">\n" +
            "   <button type=\"button\" class=\"btn\" id=\"oncoprint_diagram_showmutationcolor_icon\"data-hasqtip=\"5\"><img checked=\"0\" src=\"/static/img/colormutations.svg\" alt=\"icon\"></button>\n" +
            "   <button type=\"button\" class=\"btn\" id=\"oncoprint-diagram-removeUCases-icon\" data-hasqtip=\"3\"><img class=\"oncoprint-diagram-removeUCases-icon\" checked=\"0\" src=\"/static/img/unremoveUCases.svg\" alt=\"icon\"></button>\n" +
            "   <button type=\"button\" class=\"btn\" id=\"oncoprint-diagram-removeWhitespace-icon\" data-hasqtip=\"2\"><img class=\"oncoprint-diagram-removeWhitespace-icon\" checked=\"0\" src=\"/static/img/unremoveWhitespace.svg\" alt=\"icon\"></button>\n" +
            "   <button type=\"button\" class=\"btn\" id=\"oncoprint-diagram-downloads-icon\" data-hasqtip=\"6\"><img class=\"oncoprint-diagram-downloads-icon\" src=\"/static/img/in.svg\" alt=\"icon\"></button>\n" +
            "   <button type=\"button\" class=\"btn\" id=\"oncoprint_zoomout\" class=\"btn\" data-hasqtip=\"0\"><img src=\"/static/img/zoom-out.svg\" alt=\"icon\"></button>\n" +
            "   <div class=\"btn\" id=\"oncoprint_diagram_slider_icon\"></div>\n" +
            "   <button type=\"button\" class=\"btn\" id=\"oncoprint_zoomin\" class=\"btn\" data-hasqtip=\"1\"><img src=\"/static/img/zoom-in.svg\" alt=\"icon\"></button>\n" +
            "   <button type=\"button\" class=\"btn\" id=\"oncoprint_zoomtofit\" class=\"btn\" data-hasqtip=\"4\"><img src=\"/static/img/fitalteredcases.svg\" alt=\"icon\" preserveaspectratio=\"none\"></button>\n" +
            "</div><br/><br/>" +
            "<div id=\"oncoprint_body\"></div>");
        plot_data = plot_data.trim();
        if (plot_data && oncoprint_obj.isInputValid(plot_data)) {
            oncoprint_obj.createOncoprintPlot(plot_data);
        }
        else {
            //oncoprint_view.render_no_data_message(plot_selector, gene_list);
            //TODO: create oncoprint no data to render message
        }
    }
    /*
        Generate url for gathering data
     */
    function get_data_url(base_url, cohorts, x_attr, y_attr, color_by, logTransform){
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
        if(color_by && color_by !== ''){
            api_url += '&c_id=' + color_by;
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
            if (i == 0) {
                cohort_str += 'cohort_id=' + cohorts[i];
            } else {
                cohort_str += '&cohort_id=' + cohorts[i];
            }
        }
        var seqpeek_url = base_url + '/visualizations/seqpeek_data_plot/' + VERSION + '?' + cohort_str;

        seqpeek_url += "&hugo_symbol=" + gene_label
            + (VERSION == 'v2' ? "&genomic_build=" + $('.workbook-build-display').data('build') : '');


        return seqpeek_url;
    }

    // Generate url for gathering data for a OncoPrint plot
    function get_oncoprint_data_url(base_url, cohorts, gene_list){
        var cohort_str = '';
        for (var i = 0; i < cohorts.length; i++) {
            if (i == 0) {
                cohort_str += 'cohort_id=' + cohorts[i];
            } else {
                cohort_str += '&cohort_id=' + cohorts[i];
            }
        }
        var oncoprintUrl = base_url + '/visualizations/oncoprint_data_plot/' + VERSION + '?' + cohort_str;
        oncoprintUrl += "&gene_list=" + gene_list.join(",")
            + (VERSION == 'v2' ? "&genomic_build=" + $('.workbook-build-display').data('build') : '');
        return oncoprintUrl;
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

    function select_plot(args){//plot_selector, legend_selector, pairwise_element, type, x_attr, y_attr, color_by, cohorts, cohort_override, data){
        var width  = $('.worksheet.active .worksheet-panel-body:first').width(), //TODO should be based on size of screen
            height = 725, //TODO ditto
            // Top margin: required to keep top-most Y-axis ticks from being cut off on non-scrolled y axes
            // Bottom margin: takes into account double-wrapped x-axis title and wrapped long-text x-axis labels
            margin = {top: 15, bottom: 150, left: 80, right: 10},
            x_type = '',
            y_type = '';

        var data = args.data;
        if (data.hasOwnProperty('pairwise_result')) {
            configure_pairwise_display(args.pairwise_element, data);
        }
        // The response form the SeqPeek data endpoint has a different schema. This is case is handled in
        // another branch below.
        if (data.hasOwnProperty('items') && data['items'].length > 0) {

            var cohort_set = data['cohort_set'];

            var units = {
                x: data.xUnits,
                y: data.yUnits
            };

            data = data['items'];

            if (args.cohort_override) {
                args.color_by = 'cohort';
            } else {
                args.color_by = 'c';
            }

            var visualization;
            switch (args.type){
                case "Bar Chart" : //x_type == 'STRING' && y_type == 'none'
                    visualization = generate_bar_chart(margin, args.plot_selector, height, width, args.x, data, units);
                    break;
                case "Histogram" : //((x_type == 'INTEGER' || x_type == 'FLOAT') && y_type == 'none') {
                    visualization = generate_histogram(margin, args.plot_selector, height, width, args.x, data, units, args.logTransform);
                    break;
                case 'Scatter Plot': //((x_type == 'INTEGER' || x_type == 'FLOAT') && (y_type == 'INTEGER'|| y_type == 'FLOAT')) {
                    visualization = generate_scatter_plot(margin, args.plot_selector, args.legend_selector, height, width, args.x, args.y, args.color_by, cohort_set, data, units, args.logTransform);
                    break;
                case "Violin Plot": //(x_type == 'STRING' && (y_type == 'INTEGER'|| y_type == 'FLOAT')) {
                    visualization = generate_violin_plot(margin, args.plot_selector, args.legend_selector, height, width, args.x, args.y, args.color_by,  cohort_set, data, units, args.logTransform);
                    break;
                case 'Violin Plot with axis swap'://(y_type == 'STRING' && (x_type == 'INTEGER'|| x_type == 'FLOAT')) {
                    visualization = generate_violin_plot_axis_swap(margin, args.plot_selector, args.legend_selector, height, width, args.x, args.y, args.color_by,  cohort_set, data, units, args.logTransform);
                    break;
                case 'Cubby Hole Plot' : //(x_type == 'STRING' && y_type == 'STRING') {
                    visualization = generate_cubby_hole_plot(args.plot_selector, args.legend_selector, height, width, args.x, args.y, args.color_by,  cohort_set, data, units);
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

            //establish marquee sample selection
            $(visualization.svg[0]).parents('.plot').find('.toggle-selection').unbind();
            $(visualization.svg[0]).parents('.plot').find('.toggle-selection').on('click', function () {
                $(this).toggleClass('active');
                visualization.plot.check_selection_state($(this).hasClass('active'));
            });
            visualization.plot.check_selection_state($(visualization.svg[0]).parents('.plot').find('.toggle-selection').hasClass('active'));

            //establish resize call to data
            d3.select(window).on('resize', visualization.plot.resize);
            args.color_by_sel && $(args.legend_selector).show();

        } else if (args.type == "SeqPeek" && !data.message) {
            visualization = generate_seqpeek_plot(args.plot_selector, args.legend_selector, data);
        } else if (args.type == "OncoPrint" && !data.message) {
            visualization = generate_oncoprint_plot(args.plot_selector, data);
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
    };

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
        };

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
        else if(args.type == "OncoPrint"){
            plot_data_url = get_oncoprint_data_url(BASE_URL, args.cohorts, args.gene_list, VERSION);
        }
        else {
            plot_data_url = get_data_url(BASE_URL, args.cohorts, args.x, args.y, args.color_by, args.logTransform, VERSION);
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
                             logTransform     : args.logTransform,
                             color_by         : args.cohorts,
                             cohort_override  : args.color_override,
                             color_by_sel     : args.color_by_sel,
                             data             : data});
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
    };

    return {
        generate_plot     : generate_plot,
        get_plot_settings : get_plot_settings
    };
});
/**
 * Created by rossbohner on 12/20/15.
 */
