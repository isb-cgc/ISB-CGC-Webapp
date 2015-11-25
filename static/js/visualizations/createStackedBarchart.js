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

define (['jquery', 'd3', 'd3tip', 'vis_helpers'],
function($, d3, d3tip, vis_helpers) {
    return {
        draw_stacked_mutations: function(data) {
            var gene_list = [
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

            var width = 600,
                height = 375,
                margin = {top: 0, bottom: 75, left: 0, right: 0};
            var processed = [];
            var order = ["1", "0", "None"];
            var friendly_map = {
                "1": 'Mutant',
                "0": 'Wild Type',
                "None": 'NA'
            };

            // Terrible data-munging
            for (var i = 0; i < gene_list.length; i++) {
                var gene = data[gene_list[i]];
                var gene_array = [];
                for (var j = 0; j < order.length; j++) {
                    for (var k = 0; k < gene.length; k++) {
                        if (order[j] == gene[k]['value']) {
                            var tmp = { name: friendly_map[order[j]],
                                value: parseInt(gene[k]['count']),
                                y: parseInt(gene[k]['count']),
                                x: gene_list[i]};
                            gene_array.push(tmp);
                        }

                    }
                }
                for (var j = gene_array.length - 1; j > 0; j--) {
                    gene_array[j - 1]['y'] += gene_array[j]['y'];
                }
                processed.push(gene_array);
            }

            var x = d3.scale.ordinal()
                .rangeRoundBands([0, width])
                .domain(gene_list);


            var max = processed[0][0]['y'];
            var y = d3.scale.linear()
                .range([0, height - margin.bottom])
                .domain([0, max]);

            var color = d3.scale.category20();

            var xAxis = d3.svg.axis()
                .scale(x)
                .orient('bottom')
                .tickSize(0);

            d3.select("#stacked-barchart svg").remove();
            var svg = d3.select('#stacked-barchart')
                .append('svg')
                .attr('width', width)
                .attr('height', height);

            svg.append('g')
                .attr('class', 'x axis')
                .attr('transform', 'translate(0,' + (height - margin.bottom) + ')')
                .call(xAxis)
                .selectAll('text')
                .style('text-anchor', 'end')
                .attr('dx', '-5')
                .attr('dy', '0')
                .attr('transform', 'rotate(-90)');

            var gene = svg.selectAll('g.gene')
                .data(processed)
                .enter().append('g')
                .attr('class', 'gene')
                .attr('transform', function (d, i) {
                    return 'translate(' + (i * x.rangeBand()) + ', 0)';
                });

            var tip = d3tip()
                .attr('class', 'd3-tip')
                .direction('n')
                .offset([0, 0])
                .html(function (d) {
                    var str = "";
                    if (d.x == "0") {
                        str = "";
                    }
                    return '<span>' + d.name + ': ' + d.value + '</span>';
                });

            var rect = gene.selectAll('rect')
                .data(Object)
                .enter().append('rect')
                .attr('y', 0)
                .attr('height', function (d) {
                    return y(d.y);
                })
                .attr('width', x.rangeBand())
                .style('fill', function (d, i) {
                    return color(d.name);
                })
                .style('stroke', function (d, i) {
                    return d3.rgb(color(d.name)).darker();
                })
                .on('mouseover.tip', tip.show)
                .on('mouseout.tip', tip.hide);

            svg.call(tip);
        }
    };
});
