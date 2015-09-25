/*
This handles having 2 scatter plots on one page.

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
        science: 'libs/science.min',
        stats: 'libs/science.stats.min',
        vizhelpers: 'helpers/vis_helpers'
    },
    shim: {
        'session_security': ['jquery']
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

    'assetscore',
    'assetsresponsive'
], function($, jqueryui, bootstrap, session_security, d3, d3tip, helpers, scatter_plot, cubby_plot, violin_plot, histogram, bar_graph) {
    A11y.Core();
    var scatter_plot_obj = Object.create(scatter_plot, {});
    var cubby_plot_obj = Object.create(cubby_plot, {});
    var violin_plot_obj = Object.create(violin_plot, {});
    var histogram_obj = Object.create(histogram, {});
    var bar_graph_obj = Object.create(bar_graph, {});

    $('#save-search').on('submit', function() {
        var content = '';
        $('svg circle.selected').each(function(){
            // TODO: This removes the extra character on the end of the id because search page is using a different dataset
            content += this.id.slice(0, this.id.length -1) + ',';
        });
        console.log(content);
        $('#save-search').append('<input type="hidden" name="search_samples" value="' + content + '" />');
        console.log($('#save-search input[name="search-samples"]'));
    });

    var cubby_tip = d3.tip()
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


    var generate_plot = function(plot, x_attr, y_attr, color_by, cohort) {
        var width = 800,
            height = 600,
            margin = {top: 0, bottom: 50, left: 50, right: 10},
            x_type = '',
            y_type = '';

        if (numerical_attributes.indexOf(x_attr) != -1) {
            x_type = 'numerical';
        } else if (categorical_attributes.indexOf(x_attr) != -1) {
            x_type = 'categorical';
        }

        if (numerical_attributes.indexOf(y_attr) != -1) {
            y_type = 'numerical';
        } else if (categorical_attributes.indexOf(y_attr) != -1) {
            y_type = 'categorical';
        } else {
            y_type = 'none';
        }

        plot.find('.plot-div').empty();
        plot.find('.legend').empty();

        var api_url = '';
        if (window.location.origin.indexOf('stage') != -1) {
            api_url = 'https://stage-dot-isb-cgc.appspot.com/_ah/api/egfr_api/v1/plot1?';
        }
        else if (window.location.origin.indexOf('cgcdemo') != -1  || (window.location.origin.indexOf('isb-cgc.appspot.com') != -1)){
            api_url = 'https://isb-cgc.appspot.com/_ah/api/egfr_api/v1/plot1?';
        } else {
            api_url = window.location.origin + '/_ah/api/egfr_api/v1/plot1?';
        }

        if (cohort) {
            api_url += 'searchid=' + cohort
        }
        api_url += '&selectors=sample';
        var selectors = [x_attr, y_attr, color_by];
        for (var i = 0; i < selectors.length; i++) {
            if (selectors[i] && selectors[i] != 'none') {
                api_url += '&selectors=' + selectors[i];
            }
        }

        var plot_selector = '#' + plot.prop('id') + ' .plot-div';
        var legend_selector = '#' + plot.prop('id') + ' .legend';
        plot.find('.plot-loader').show();
        $.ajax({
            type: 'GET',
            url: api_url,
            success: function(data, status, xhr) {
                if (data.hasOwnProperty('items')) {

                    data = data['items'];

                    if (x_attr == 'none') {
                        // X is none and that cannot be
                        // No plot type to fit
                        d3.select(plot_selector)
                            .append('svg')
                            .attr('width', width)
                            .attr('height', height)
                            .append('text')
                            .attr('fill', 'black')
                            .style('font-size', 20)
                            .attr('text-anchor', 'middle')
                            .attr('transform', 'translate(' + (width/2) + ',' + (height/2) + ')')
                            .text('X-axis cannot be empty. Please select an attribute for the x-axis.');

                    } else if (x_type == 'categorical' && y_type == 'none') {
                        // Bar Chart

                        margin = {top: 0, bottom: 100, left: 50, right: 10};
                        var svg = d3.select(plot_selector)
                            .append('svg')
                            .attr('width', width + 10)
                            .attr('height', height);
                        var bar_width = 20;
                        bar_graph_obj.createBarGraph(
                            svg,
                            data,
                            width,
                            height,
                            bar_width,
                            x_attr,
                            friendly_name_map[x_attr],
                            cubby_tip,
                            margin);

                    } else if (x_type == 'numerical' && y_type == 'none') {
                        // Histogram
                        var svg = d3.select(plot_selector)
                            .append('svg')
                            .attr('width', width + 10)
                            .attr('height', height);
                        var vals = values_only(data, x_attr);

                        histogram_obj.createHistogramPlot(
                            svg,
                            data,
                            vals,
                            width,
                            height,
                            x_attr,
                            friendly_name_map[x_attr],
                            cubby_tip,
                            margin);

                    } else if (x_type == 'numerical' && y_type == 'numerical') {
                        // Scatter plot
                        var domain = get_min_max(data, x_attr);
                        var range = get_min_max(data, y_attr);

                        var legend = d3.select(legend_selector)
                            .append('svg')
                            .attr('width', 200);
                        svg = d3.select(plot_selector)
                            .append('svg')
                            .attr('width', width + 10)
                            .attr('height', height);
                        scatter_plot_obj.create_scatterplot( svg,
                            data,
                            domain,
                            range,
                            friendly_name_map[x_attr],  // xLabel
                            friendly_name_map[y_attr],  // yLabel
                            x_attr,                     // xParam
                            y_attr,                     // yParam
                            color_by,
                            legend,
                            width,
                            height);

                    } else if (x_type == 'categorical' && y_type == 'numerical') {
                        // Violin plot
                        var violin_width = 200;
                        var tmp = get_min_max(data, y_attr);
                        var min_n = tmp[0];
                        var max_n = tmp[1];
                        var legend = d3.select(legend_selector)
                            .append('svg')
                            .attr('width', 200);

                        svg = d3.select(plot_selector)
                            .append('svg')
                            .attr('width', width + 10)
                            .attr('height', height);
                        violin_plot_obj.createViolinPlot(svg,
                            data,
                            height,
                            violin_width,
                            max_n,
                            min_n,
                            friendly_name_map[x_attr],
                            friendly_name_map[y_attr],
                            x_attr,
                            y_attr,
                            color_by,
                            legend
                        );

                    } else if (x_type == 'categorical' && y_type == 'categorical') {
                        // Cubby hole plot
                        var cubby_size = 100;
                        var xdomain = data_domains[x_attr];
                        var ydomain = data_domains[y_attr];

                        var cubby_width = xdomain.length * cubby_size + margin.left + margin.right;
                        var cubby_height = ydomain.length * cubby_size + margin.top + margin.bottom;

                        svg = d3.select(plot_selector)
                            .append('svg')
                            .attr('width', cubby_width + 10)
                            .attr('height', cubby_height);

                        cubby_plot_obj.create_cubbyplot(
                            svg,
                            data,
                            xdomain,
                            ydomain,
                            friendly_name_map[x_attr],
                            friendly_name_map[y_attr],
                            x_attr,
                            y_attr,
                            color_by,
                            legend,
                            cubby_width,
                            cubby_height,
                            cubby_size
                        );

                    } else if (x_type == 'numerical' && y_type == 'categorical') {
                        // Flip then Violin plot
                        var holder = y_attr;
                        y_attr = x_attr;
                        x_attr = holder;
                        plot.find('.x-selector option[value="' + x_attr + '"]').attr('selected', 'selected');
                        plot.find('.y-selector option[value="' + y_attr + '"]').attr('selected', 'selected');

                        var violin_width = 200;
                        var tmp = get_min_max(data, y_attr);
                        var min_n = tmp[0];
                        var max_n = tmp[1];
                        var legend = d3.select(legend_selector)
                            .append('svg')
                            .attr('width', 200);

                        svg = d3.select(plot_selector)
                            .append('svg')
                            .attr('width', width + 10)
                            .attr('height', height);
                        violin_plot_obj.createViolinPlot(svg,
                            data,
                            height,
                            violin_width,
                            max_n,
                            min_n,
                            friendly_name_map[x_attr],
                            friendly_name_map[y_attr],
                            x_attr,
                            y_attr,
                            color_by,
                            legend
                        );

                    } else {
                        // No plot type to fit
                        d3.select(plot_selector)
                            .append('svg')
                            .attr('width', width)
                            .attr('height', height)
                            .append('text')
                            .attr('fill', 'black')
                            .style('font-size', 20)
                            .attr('text-anchor', 'middle')
                            .attr('transform', 'translate(' + (width/2) + ',' + (height/2) + ')')
                            .text('There is no plot that fit the selected axes.');
                    }
                } else {
                    // No samples provided
                    d3.select(plot_selector)
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
                plot.find('.plot-loader').hide();
            },
            error: function(xhr, status, error) {
                console.log(error);
            }
        });



    };

    $('.plot-config .x-selector').on('change', function() {
        var plot = $(this).parents('.plot');
        var x_attr = plot.find('.x-selector').val();
        var y_attr = plot.find('.y-selector').val();
        var color_by = plot.find('.color-selector').val();
        var cohort = plot.find('input[name="cohort"]').val();

        generate_plot(plot, x_attr, y_attr, color_by, cohort)
    });

    $('.plot-config .y-selector').on('change', function() {
        var plot = $(this).parents('.plot');
        var x_attr = plot.find('.x-selector').val();
        var y_attr = plot.find('.y-selector').val();
        var color_by = plot.find('.color-selector').val();
        var cohort = plot.find('input[name="cohort"]').val();

        generate_plot(plot, x_attr, y_attr, color_by, cohort)

    });

    $('.plot-config .color-selector').on('change', function() {
        var plot = $(this).parents('.plot');
        var x_attr = plot.find('.x-selector').val();
        var y_attr = plot.find('.y-selector').val();
        var color_by = plot.find('.color-selector').val();
        var cohort = plot.find('input[name="cohort"]').val();

        generate_plot(plot, x_attr, y_attr, color_by, cohort)

    });

    for (var i = 0; i < plots_data.length; i++) {
        var plot = $('#plot-' + plots_data[i]['plot_index']);
        plot.find('.x-selector option[value="' + plots_data[i]['x_attr'] + '"]').attr('selected', 'selected');
        plot.find('.y-selector option[value="' + plots_data[i]['y_attr'] + '"]').attr('selected', 'selected');
        plot.find('.color-selector option[value="' + plots_data[i]['color_by'] + '"]').attr('selected', 'selected');
        var x_attr = plot.find('.x-selector').val();
        var y_attr = plot.find('.y-selector').val();
        var color_by = plot.find('.color-selector').val();
        var cohort = plot.find('input[name="cohort"]').val();
        generate_plot(plot, x_attr, y_attr, color_by, cohort);
    }

    // Hijack and insert more values into to save visualization POST
    $('#save-viz').on('submit', function() {
        var form = this;
        $('input.plot-attr').remove();
        $('.plot').each(function(index) {
            var x = $(this).find('.x-selector').val();
            var y = $(this).find('.y-selector').val();
            var color_by = $(this).find('.color-selector').val();
            var type = $(this).find('input[name="type"]').val();
            var cohort_id = $(this).find('input[name="cohort"]').val();

            $(form).append('<input name="plot-' + index + '-x_axis" value="' + x + '" type="hidden" class="plot-attr" />');
            $(form).append('<input name="plot-' + index + '-y_axis" value="' + y + '" type="hidden" class="plot-attr" />');
            $(form).append('<input name="plot-' + index + '-color_by" value="' + color_by + '" type="hidden" class="plot-attr" />');
            $(form).append('<input name="plot-' + index + '-plot_type" value="' + type + '" type="hidden" class="plot-attr" />');
            $(form).append('<input name="plot-' + index + '-cohort" value="' + cohort_id + '" type="hidden" class="plot-attr" />')
        });
    });

    $('button[data-target="#save-search-modal"]').on('click', function() {
        var form = $('#save-search');
        var sample_list = [];
        $('.plot').each(function() {
            var samples = $(this).find('.selected-points-count').attr('value');
            if (!samples) { // undefined
                samples = []
            } else if (samples.indexOf(',') != -1) { // 1+ samples
                samples = samples.split(',');
            } else { // one sample
                samples = [samples];
            }
            for (var i = 0; i < samples.length; i++) {
                // Stripping out last character to be friendly to fmdata samples
                samples[i] = samples[i].slice(0, samples[i].length -1);
                if (sample_list.indexOf(samples[i]) == -1) {
                    sample_list.push(samples[i]);
                }
            }
        });

        $(form).find('.modal-body h5').html('Total number of unique samples: ' + sample_list.length);
        $(form).find('input[name="barcodes"]').remove();
        $(form).append('<input name="barcodes" value="' + sample_list + '" type="hidden" />')
    })

});
