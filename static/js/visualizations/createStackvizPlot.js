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

function sort_data(sub_list, attr) {
    return sub_list.sort(function(a, b) {
        if (a[attr] > b[attr]) {
            return 1;
        } else if (a[attr] < b[attr]) {
            return -1;
        }
        return 0;
    })
}

function createStackvizPlot(svg, data, height, width, view_width, row_height, row_margin, bar_width, bar_margin, x_attr, y_attr, margin, tip, legend, friendly_map) {
    var color = d3.scale.category20();

//    var row_domain = data_domains[y_attr];


    // TODO: Generalize, but using set genes for now
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

    var sorted = sort_data(data, row_domain[0]);
//    var plot_area = svg.append('g')
//        .attr('clip-path', 'url(#plot_area_clip)');

    svg.selectAll('.stack-row')
        .data(row_domain)
        .enter().append('svg')
        .attr('class', 'stack-row')
        .attr('height', row_height + 5)
        .attr('width', view_width)
        .attr('y', function(d,i) { return i * (row_height + row_margin); })
        .attr('id', function(d) { return d; });

    svg.selectAll('.stack-row').append('text')
        .attr('transform', function(d, i) { return 'translate(0,' + (row_height/2 + 3) + ')';})
        .text(function(d){return d;});

    var plot_areas = svg.selectAll('.stack-row').append('g')
        .attr('clip-path', function(d, i) { return 'url(#plot_area_clip_'+i+')'});

    plot_areas.append('clipPath')
        .attr('class', 'clipper')
        .attr('id', function(d, i) { return 'plot_area_clip_' + i; })
        .append('rect')
        .attr('height', row_height)
        .attr('width', view_width - margin.left)
        .attr('transform', 'translate(' + margin.left + ',0)');

    var stacks = plot_areas.append('svg');

    stacks.selectAll('.stack-bar').data(sorted)
        .enter().append('rect')
        .attr('class', 'stack-bar')
        .attr('x', function(d, i) { return i * (bar_width+bar_margin) + margin.left; })
        .attr('y', 0)
        .attr('height', row_height)
        .attr('width', bar_width)
        .attr('fill', function(d) {
            return color(d[d3.select(this.parentNode).datum()]);
        })
        .attr('data-samples', function(d) { return d['sample']; })
        .on('mouseover.tip', tip.show)
        .on('mouseout.tip', tip.hide);

    stacks.call(tip);

    var x2 = d3.scale.linear()
        .domain([0, view_width-margin.left])
        .range([margin.left, view_width]);
    var zoom_func = function() {
        plot_areas.selectAll('.stack-bar').attr('transform', 'translate(' + d3.event.translate[0] + ',0) scale(' + d3.event.scale + ',1)');
//        plot_area.selectAll('text').attr('transform', 'translate(' + d3.event.translate[0] + ',0)');
    };
    var zoom = d3.behavior.zoom()
            .x(x2)
            .on('zoom', zoom_func);

    var zoom_area;
//    zoom_area.call(zoom);

    // Highlight the selected rectangles.
    var brushmove = function(p) {
        var total = 0;
        var list = [];
        var e = brush.extent();
        svg.select('.stack-row:first-child').selectAll('.stack-bar').classed('selected', function(d, i) {
            return e[0] <= i && i <= e[1];
            });
        $('.stack-bar.selected').each(function() {
//            var samples = $(this).attr('data-samples');
            total += 1;
            list = list.concat($(this).attr('data-samples'));
        });
        $(svg[0]).parents('.plot').find('.selected-points-count').html('Total Number of Samples Selected: ' + total);
        $(svg[0]).parents('.plot').find('.selected-points-count').attr('value', list);
    };

    // If the brush is empty, select all circles.
    var brushend = function() {
        if (brush.empty()) svg.selectAll(".hidden").classed("hidden", false);
    };

    var brush = d3.svg.brush()
        .x(x2)
        .on('brush', brushmove)
        .on('brushend', brushend);

    legend = legend.attr('height', 20 * color.domain().length);
    legend = legend.selectAll('.legend')
        .data(color.domain())
        .enter().append('g')
        .attr('class', 'legend')
        .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

    legend.append('rect')
        .attr('width', 20)
        .attr('height', 20)
        .style('fill', color);

    legend.append('text')
        .attr('x', 25)
        .attr('y', 15)
        .text(function(d) { if (d != null) { return friendly_map[d]; } else { return 'NA'; } });

    var check_selection_state = function(obj) {
        if (obj) {

            // Remove zoom area
            svg.selectAll('.zoom_area').remove();

            if (svg.select('.brush').empty()){
                // Append new brush area
                svg.append('g')
                    .attr('class', 'brush')
                    .call(brush)
                    .selectAll('rect')
                    .attr('y', 0)
                    .attr('height', height);
            }

        } else {

            // Clear selections
            $(svg[0]).parents('.plot').find('.selected-points-count').html('Total Number of Samples Selected: ' + 0);
            $(svg[0]).parents('.plot').find('.selected-points-count').attr('value', []);
            svg.selectAll('.selected').classed('selected', false);

            // Remove brush event listener plot area
            svg.selectAll('.brush').remove();

            if (svg.select('.zoom_area').empty()) {
                // Append new zoom area
                zoom_area = svg.append('g')
                    .attr('class', 'zoom_area')
                    .append('rect')
                    .attr('width', view_width - margin.left)
                    .attr('height', height)
                    .style('opacity', 0);

                zoom_area.call(zoom);
            }

        }
    };

    $(svg[0]).parents('.plot').find('.toggle-selection').on('click', function () {
        $(this).toggleClass('active');

        check_selection_state($(this).hasClass('active'));
    });

    check_selection_state($(svg[0]).parents('.plot').find('.toggle-selection'));
}