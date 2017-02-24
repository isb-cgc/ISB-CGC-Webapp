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
        assetscore: 'libs/assets.core',
        assetsresponsive: 'libs/assets.responsive',
        d3: 'libs/d3.min',
        d3tip: 'libs/d3-tip',
        science: 'libs/science.min',
        stats: 'libs/science.stats.min',
        vizhelpers: 'helpers/vis_helpers',
        select2: 'libs/select2.min'
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'session_security': ['jquery'],
        'assetscore': ['jquery', 'bootstrap', 'jqueryui'],
        'assetsresponsive': ['jquery', 'bootstrap', 'jqueryui'],
        'select2': ['jquery']
    }
});

require([
    'jquery',
    'jqueryui',
    'bootstrap',
    'session_security',
    'd3',
    'd3tip',
    'vizhelpers',
    'visualizations/createScatterPlot',
    'visualizations/createCubbyPlot',
    'visualizations/createViolinPlot',
    'visualizations/createHistogram',
    'visualizations/createBarGraph',
    'select2',
    'assetscore',
    'assetsresponsive'
], function($, jqueryui, bootstrap, session_security, d3, d3tip, vizhelpers, scatter_plot, cubby_plot, violin_plot, histogram, bar_graph) {
    // A11y.Core();
    //
    // // Resets forms in modals on cancel. Suppressed warning when leaving page with dirty forms
    // $('.modal').on('hide.bs.modal', function() {
    //     $(this).find('form')[0].reset();
    // });
    //
    // var scatter_plot_obj = Object.create(scatter_plot, {});
    // var cubby_plot_obj = Object.create(cubby_plot, {});
    // var violin_plot_obj = Object.create(violin_plot, {});
    // var histogram_obj = Object.create(histogram, {});
    // var bar_graph_obj = Object.create(bar_graph, {});
    // var helpers = Object.create(vizhelpers, {});
    // var cubby_tip = d3tip()
    //         .attr('class', 'd3-tip')
    //         .direction('n')
    //         .offset([0, 0])
    //         .html(function(d) {
    //             var mean = 0;
    //             for (var i = 0; i < d.length; i++) {
    //                 mean += parseFloat(d[i]);
    //             }
    //             mean /= d.length;
    //             return '<span>Mean: ' + mean.toFixed(2) + '</span><br/><span>%: ' + (d.y * 100).toFixed(2) + '%</span>';
    //         });
    //
    // var generate_plot = function(plot, x_attr, y_attr, color_by, cohorts, cohort_override) {
    //     var width = 800,
    //         height = 600,
    //         margin = {top: 0, bottom: 50, left: 50, right: 10},
    //         x_type = '',
    //         y_type = '';
    //
    //     // If x is empty and y is not, swap it
    //     if (x_attr == '' && y_attr != '') {
    //         var tmp = y_attr;
    //         y_attr = x_attr;
    //         x_attr = tmp;
    //     }
    //
    //     plot.find('.plot-div').empty();
    //     plot.find('.legend').empty();
    //     plot.find('.pairwise-result').empty();
    //
    //     var cohort_str = '';
    //     for (var i = 0; i < cohorts.length; i++) {
    //         if (i == 0) {
    //             cohort_str += 'cohort_id=' + cohorts[i];
    //         } else {
    //             cohort_str += '&cohort_id=' + cohorts[i];
    //         }
    //     }
    //     var api_url = BASE_API_URL + '/_ah/api/feature_data_api/v1/feature_data_plot?' + cohort_str;
    //
    //     api_url += '&x_id=' + x_attr + '&c_id=' + color_by;
    //     if (y_attr && y_attr != '') {
    //         api_url += '&y_id=' + y_attr
    //     }
    //     console.log(api_url);
    //     var plot_selector = '#' + plot.prop('id') + ' .plot-div';
    //     var legend_selector = '#' + plot.prop('id') + ' .legend';
    //     plot.find('.plot-loader').show();
    //     $.ajax({
    //         type: 'GET',
    //         url: api_url,
    //         success: function(data, status, xhr) {
    //             if (data.hasOwnProperty('pairwise_result')) {
    //                 var pairwise_div = plot.find('.pairwise-result');
    //                 if (data['pairwise_result'].hasOwnProperty('result_vectors')) {
    //                     var vectors = data['pairwise_result']['result_vectors'];
    //
    //                     var output = $('<table class="table"><thead><tr>' +
    //                         '<th class="feature1">Feature 1</th>' +
    //                         '<th class="feature2">Feature 2</th>' +
    //                         '<th class="logp">logp</th>' +
    //                         '<th class="n">n</th>' +
    //                         '</tr></thead><tbody></tbody></table>');
    //                     for (var i = 0; i < vectors.length; i++) {
    //                         var tr = '<tr><td>' + vectors[i]['feature_1'] + '</td>' +
    //                             '<td>' + vectors[i]['feature_2'] + '</td>' +
    //                             '<td>' + vectors[i]['_logp'] + '</td>' +
    //                             '<td>' + vectors[i]['n'] + '</td></tr>';
    //                         output.find('tbody').append(tr);
    //                     }
    //                     pairwise_div.html(output);
    //                 } else {
    //                     pairwise_div.html('Pairwise returned no results.')
    //                 }
    //             }
    //             if (data.hasOwnProperty('items')) {
    //                 x_type = data['types']['x'];
    //                 if (y_attr && y_attr != '') {
    //                     y_type = data['types']['y'];
    //                 } else {
    //                     y_type = 'none'
    //                 }
    //                 var cohort_set = data['cohort_set'];
    //                 data = data['items'];
    //                 if (cohort_override) {
    //                     color_by = 'cohort';
    //                 } else {
    //                     color_by = 'c';
    //                 }
    //                 if (x_type == 'STRING' && y_type == 'none') {
    //                     // Bar Chart
    //
    //                     margin = {top: 0, bottom: 100, left: 50, right: 10};
    //                     var svg = d3.select(plot_selector)
    //                         .append('svg')
    //                         .attr('width', width + 10)
    //                         .attr('height', height);
    //                     var bar_width = 20;
    //                     bar_graph_obj.createBarGraph(
    //                         svg,
    //                         data,
    //                         width,
    //                         height,
    //                         bar_width,
    //                         'x',
    //                         x_attr,
    //                         cubby_tip,
    //                         margin);
    //
    //                 } else if ((x_type == 'INTEGER' || x_type == 'FLOAT') && y_type == 'none') {
    //                     // Histogram
    //                     var svg = d3.select(plot_selector)
    //                         .append('svg')
    //                         .attr('width', width + 10)
    //                         .attr('height', height);
    //                     var vals = helpers.values_only(data, 'x');
    //
    //                     histogram_obj.createHistogramPlot(
    //                         svg,
    //                         data,
    //                         vals,
    //                         width,
    //                         height,
    //                         'x',
    //                         x_attr,
    //                         cubby_tip,
    //                         margin);
    //
    //                 } else if ((x_type == 'INTEGER' || x_type == 'FLOAT') && (y_type == 'INTEGER'|| y_type == 'FLOAT')) {
    //                     // Scatter plot
    //                     var domain = helpers.get_min_max(data, 'x');
    //                     var range = helpers.get_min_max(data, 'y');
    //
    //                     var legend = d3.select(legend_selector)
    //                         .append('svg')
    //                         .attr('width', 200);
    //                     svg = d3.select(plot_selector)
    //                         .append('svg')
    //                         .attr('width', width + 10)
    //                         .attr('height', height);
    //                     scatter_plot_obj.create_scatterplot( svg,
    //                         data,
    //                         domain,
    //                         range,
    //                         x_attr,  // xLabel
    //                         y_attr,  // yLabel
    //                         'x',                     // xParam
    //                         'y',                     // yParam
    //                         color_by,
    //                         legend,
    //                         width,
    //                         height,
    //                         cohort_set
    //                     );
    //
    //                 } else if (x_type == 'STRING' && (y_type == 'INTEGER'|| y_type == 'FLOAT')) {
    //                     // Violin plot
    //                     var violin_width = 200;
    //                     var tmp = helpers.get_min_max(data, 'y');
    //                     var min_n = tmp[0];
    //                     var max_n = tmp[1];
    //                     var legend = d3.select(legend_selector)
    //                         .append('svg')
    //                         .attr('width', 200);
    //
    //                     svg = d3.select(plot_selector)
    //                         .append('svg')
    //                         .attr('width', width + 10)
    //                         .attr('height', height);
    //                     violin_plot_obj.createViolinPlot(svg,
    //                         data,
    //                         height,
    //                         violin_width,
    //                         max_n,
    //                         min_n,
    //                         x_attr,
    //                         y_attr,
    //                         'x',
    //                         'y',
    //                         color_by,
    //                         legend,
    //                         cohort_set
    //                     );
    //
    //                 } else if (y_type == 'STRING' && (x_type == 'INTEGER'|| x_type == 'FLOAT')) {
    //                     // Violin plot - Requires Axis Swap
    //                     var violin_width = 200;
    //                     var tmp = helpers.get_min_max(data, 'x');
    //                     var min_n = tmp[0];
    //                     var max_n = tmp[1];
    //                     var legend = d3.select(legend_selector)
    //                         .append('svg')
    //                         .attr('width', 200);
    //
    //                     svg = d3.select(plot_selector)
    //                         .append('svg')
    //                         .attr('width', width + 10)
    //                         .attr('height', height);
    //
    //                     violin_plot_obj.createViolinPlot(svg,
    //                         data,
    //                         height,
    //                         violin_width,
    //                         max_n,
    //                         min_n,
    //                         y_attr,
    //                         x_attr,
    //                         'y',
    //                         'x',
    //                         color_by,
    //                         legend,
    //                         cohort_set
    //                     );
    //
    //                     plot.find('.swap').trigger('click');
    //
    //                 } else if (x_type == 'STRING' && y_type == 'STRING') {
    //                     // Cubby hole plot
    //                     var cubby_size = 100;
    //                     var xdomain = vizhelpers.get_domain(data, 'x');
    //                     var ydomain = vizhelpers.get_domain(data, 'y');
    //
    //                     var cubby_width = xdomain.length * cubby_size + margin.left + margin.right;
    //                     var cubby_height = ydomain.length * cubby_size + margin.top + margin.bottom;
    //
    //                     svg = d3.select(plot_selector)
    //                         .append('svg')
    //                         .attr('width', cubby_width + 10)
    //                         .attr('height', cubby_height);
    //
    //                     cubby_plot_obj.create_cubbyplot(
    //                         svg,
    //                         data,
    //                         xdomain,
    //                         ydomain,
    //                         x_attr,
    //                         y_attr,
    //                         'x',
    //                         'y',
    //                         'c',
    //                         legend,
    //                         cubby_width,
    //                         cubby_height,
    //                         cubby_size
    //                     );
    //
    //                 } else {
    //                     // No plot type to fit
    //                     d3.select(plot_selector)
    //                         .append('svg')
    //                         .attr('width', width)
    //                         .attr('height', height)
    //                         .append('text')
    //                         .attr('fill', 'black')
    //                         .style('font-size', 20)
    //                         .attr('text-anchor', 'middle')
    //                         .attr('transform', 'translate(' + (width/2) + ',' + (height/2) + ')')
    //                         .text('There is no plot that fit the selected axes.');
    //                 }
    //             } else {
    //                 // No samples provided
    //                 d3.select(plot_selector)
    //                     .append('svg')
    //                     .attr('width', width)
    //                     .attr('height', height)
    //                     .append('text')
    //                     .attr('fill', 'black')
    //                     .style('font-size', 20)
    //                     .attr('text-anchor', 'middle')
    //                     .attr('transform', 'translate(' + (width/2) + ',' + (height/2) + ')')
    //                     .text('Cohort provided has no samples.');
    //             }
    //             plot.find('.plot-loader').hide();
    //         },
    //         error: function(xhr, status, error) {
    //             plot.find('.plot-loader').hide();
    //             var plot_selector = '#' + plot.prop('id') + ' .plot-div';
    //             d3.select(plot_selector)
    //                         .append('svg')
    //                         .attr('width', width)
    //                         .attr('height', height)
    //                         .append('text')
    //                         .attr('fill', 'black')
    //                         .style('font-size', 20)
    //                         .attr('text-anchor', 'middle')
    //                         .attr('transform', 'translate(' + (width/2) + ',' + (height/2) + ')')
    //                         .text('There was an error retrieving plot data.');
    //         }
    //     });
    //
    //
    // };
    //
    // // Swap X and Y Axes
    // $('.swap').on('click', function() { vizhelpers.swap_axes_callback(this); });
    //
    // // Show hide settings
    // $('.show-flyout').on('click', function() { vizhelpers.show_flyout_callback(this); });
    // $('.hide-flyout').on('click', function() { vizhelpers.hide_flyout_callback(this); });
    //
    // // Cohort Editing
    // $('.add-cohort').on('click', function() { vizhelpers.show_cohort_panel(this); });
    // $('.close-cohort-search').on('click', function() { vizhelpers.hide_cohort_panel(this); });
    // $('a.remove-cohort').on('click', function() { vizhelpers.remove_cohort_callback(this); });
    // $('a.select-cohort').on('click', function() {
    //     vizhelpers.select_cohort_callback(this, $(this).attr('value'), $(this).html());
    // });
    //
    // // Field Editing
    // $('.x-edit-field, .y-edit-field, .color-edit-field').on('click', function() { vizhelpers.show_field_search_panel(this); });
    // $('.datatype-selector').on('change', function() { vizhelpers.datatype_selector_change_callback(this); });
    // $('.field-options').on('change', function() { vizhelpers.field_option_change_callback(this); });
    // $('.feature-search').on('change', function() { vizhelpers.field_search_change_callback(this); });
    // $('.select-field').on('click', function() { vizhelpers.select_field_callback(this); });
    // $('.close-field-search').on('click', function() { vizhelpers.close_field_search_callback(this); });
    //
    // // Create Comment
    // $('.add-comment').on('submit', function(event) {
    //     event.preventDefault();
    //     vizhelpers.add_comment_callback(this);
    //     return false;
    // });
    //
    // // Update Plot
    // $('.update-plot').on('click', function() {
    //     var plot = $(this).parents('.plot');
    //     var x_attr = plot.find('.x-selector').attr('value');
    //     var y_attr = plot.find('.y-selector').attr('value');
    //     var color_by = plot.find('.color-selector').attr('value');
    //     var cohort_override = false;
    //     if (plot.find('.color-by-cohort').is(':checked')) {
    //         cohort_override = true;
    //     }
    //     var cohorts = $.map(plot.find('.cohort-listing div'), function(d) { return $(d).attr('value'); });
    //     generate_plot(plot, x_attr, y_attr, color_by, cohorts, cohort_override);
    // });
    //
    // // Delete Plot
    // $('form[action="/visualizations/delete_plot/"]').on('submit', function(event) {
    //     event.preventDefault();
    //     vizhelpers.delete_plot_callback(this);
    //     return false;
    // });
    //
    // // Add Plot
    // $('#add-plot-btn').on('click', function() {
    //     $.ajax({
    //         type: 'GET',
    //         url: '/visualizations/add_plot/?viz_id='+$(this).attr('data-value'),
    //         success: function(data) {
    //             var plot_id = $(data).attr('id').split('-')[1];
    //             $('.plot-container').append(data);
    //             var obj = $('#plot-'+plot_id);
    //
    //             // Show hide settings
    //             obj.find('.show-flyout').on('click', function() { vizhelpers.show_flyout_callback(this); });
    //             obj.find('.hide-flyout').on('click', function() { vizhelpers.hide_flyout_callback(this); });
    //
    //             // Cohort Editing
    //             obj.find('.add-cohort').on('click', function() { vizhelpers.show_cohort_panel(this); });
    //             obj.find('.close-cohort-search').on('click', function() { vizhelpers.hide_cohort_panel(this); });
    //             obj.find('a.remove-cohort').on('click', function() { vizhelpers.remove_cohort_callback(this); });
    //             obj.find('a.select-cohort').on('click', function() {
    //                 vizhelpers.select_cohort_callback(this, $(this).attr('value'), $(this).html());
    //             });
    //
    //             // Delete Plot
    //             obj.find('form[action="/visualizations/delete_plot/"]').on('submit', function(event) {
    //                 event.preventDefault();
    //                 vizhelpers.delete_plot_callback(this);
    //                 return false;
    //             });
    //
    //             // Field Editing
    //             obj.find('.x-edit-field, .y-edit-field, .color-edit-field').on('click', function() { vizhelpers.show_field_search_panel(this); });
    //             obj.find('.datatype-selector').on('change', function() { vizhelpers.datatype_selector_change_callback(this); });
    //             obj.find('.field-options').on('change', function() { vizhelpers.field_option_change_callback(this); });
    //             obj.find('.feature-search').on('change', function() { vizhelpers.field_search_change_callback(this); });
    //             obj.find('.select-field').on('click', function() { vizhelpers.select_field_callback(this); });
    //             obj.find('.close-field-search').on('click', function() { vizhelpers.close_field_search_callback(this); });
    //
    //             // Swap Axes
    //             obj.find('.swap').on('click', function() { vizhelpers.swap_axes_callback(this); });
    //
    //             // Create Comment
    //             obj.find('.add-comment').on('submit', function(event) {
    //                 event.preventDefault();
    //                 vizhelpers.add_comment_callback(this);
    //                 return false;
    //             });
    //
    //             // Saving cohorts from plot
    //             obj.find('form[action="/cohorts/save_cohort_from_plot/"]').on('submit', function(event) {
    //                 event.preventDefault();
    //                 var form = this;
    //                 $.ajax({
    //                     type: 'POST',
    //                     url: BASE_URL + '/cohorts/save_cohort_from_plot/',
    //                     data: $(this).serialize(),
    //                     success: function(data) {
    //                         $('.modal').modal('hide');
    //                         $('#visualizations').prepend(data);
    //                         form.reset();
    //                     },
    //                     error: function(data) {
    //                         $('#visualizations').prepend(data);
    //                         form.reset();
    //                     }
    //                 });
    //                 return false;
    //             });
    //
    //             // Update Plot
    //             obj.find('.update-plot').on('click', function() {
    //                 var plot = $(this).parents('.plot');
    //                 var x_attr = plot.find('.x-selector').attr('value');
    //                 var y_attr = plot.find('.y-selector').attr('value');
    //                 var color_by = plot.find('.color-selector').attr('value');
    //                 var cohort_override = false;
    //                 if (plot.find('.color-by-cohort').is(':checked')) {
    //                     cohort_override = true;
    //                 }
    //                 var cohorts = $.map(plot.find('.cohort-listing div'), function(d) { return $(d).attr('value'); });
    //                 generate_plot(plot, x_attr, y_attr, color_by, cohorts, cohort_override);
    //             });
    //
    //             obj.find('.update-plot').trigger('click');
    //
    //         },
    //         error: function() {
    //             console.log('failed create plot')
    //         }
    //
    //     });
    // });
    //
    // // Hijack and insert more values into to save visualization POST
    // $('#save-viz').on('submit', function() {
    //     var form = this;
    //     $('input.plot-attr').remove();
    //     $('.plot').each(function(index) {
    //         var plot_id = $(this).attr('id').split('-')[1];
    //         var x = $(this).find('.x-selector').attr('value');
    //         var y = $(this).find('.y-selector').attr('value');
    //         var color_by = $(this).find('.color-selector').attr('value');
    //         var type = $(this).find('input[name="type"]').val();
    //         var cohort_ids = $.map($(this).find('.cohort-listing div'), function(d) { return $(d).attr('value'); });
    //         var name = $(this).find('input[name="name"]').val();
    //
    //         $(form).append('<input name="plot-' + plot_id + '-name" value="' + name + '" type="hidden" class="plot-attr" />');
    //         $(form).append('<input name="plot-' + plot_id + '-x_axis" value="' + x + '" type="hidden" class="plot-attr" />');
    //         $(form).append('<input name="plot-' + plot_id + '-y_axis" value="' + y + '" type="hidden" class="plot-attr" />');
    //         $(form).append('<input name="plot-' + plot_id + '-color_by" value="' + color_by + '" type="hidden" class="plot-attr" />');
    //         $(form).append('<input name="plot-' + plot_id + '-plot_type" value="' + type + '" type="hidden" class="plot-attr" />');
    //         $(form).append('<input name="plot-' + plot_id + '-cohort_ids" value="' + cohort_ids + '" type="hidden" class="plot-attr" />')
    //     });
    // });
    //
    // // Save Cohort from plot
    // $('form[action="/cohorts/save_cohort_from_plot/"]').on('submit', function(event) {
    //     event.preventDefault();
    //     var form = this;
    //     $.ajax({
    //         type: 'POST',
    //         url: BASE_URL + '/cohorts/save_cohort_from_plot/',
    //         data: $(this).serialize(),
    //         success: function(data) {
    //             $('.modal').modal('hide');
    //             $('#visualizations').prepend(data);
    //             form.reset();
    //         },
    //         error: function(data) {
    //             $('#visualizations').prepend(data);
    //             form.reset();
    //         }
    //     });
    //     return false;
    // });
    //
    // for (var i = 0; i < plots_data.length; i++) {
    //     var plot = $('#plot-' + plots_data[i]['plot_id']);
    //     plot.find('.x-selector').val(plots_data[i]['x_attr']);
    //     plot.find('.y-selector').val(plots_data[i]['y_attr']);
    //     plot.find('.color-selector').val(plots_data[i]['color_by']);
    //     var x_attr = plots_data[i]['x_attr'];
    //     var y_attr = plots_data[i]['y_attr'];
    //     var color_by = plots_data[i]['color_by'];
    //     var cohorts = $.map(plot.find('.cohort-listing div'), function(d) { return $(d).attr('value'); });
    //     generate_plot(plot, x_attr, y_attr, color_by, cohorts);
    // }
});
