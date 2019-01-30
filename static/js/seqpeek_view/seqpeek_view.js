define([
    'seqpeek_view/view',
    'd3'

], function(
    SeqPeekViewFactory,
    d3
) {
    return {
        render_no_data_message: function(target_element, gene_label) {
            var message = 'The selected cohorts have no somatic mutations in the gene ' + gene_label;

            $('<h3>' + message + '</h3>').appendTo(target_element);
        },

        render_seqpeek_legend: function(target_element) {
            var MUTATION_TYPE_COLOR_MAP = {
                Nonsense_Mutation: "#71C560",
                Silent: "#9768C4",
                Frame_Shift_Del: "#98B8B8",
                Frame_Shift_Ins: "#98B8B8",
                Missense_Mutation: "#4F473D",
                In_Frame_Ins: "#C1B14C",
                In_Frame_Del: "#C1B14C"
            };
            var color = function(key){ return MUTATION_TYPE_COLOR_MAP[key]; };
            var color_domain = Object.keys(MUTATION_TYPE_COLOR_MAP);
            var legend_line_height = 20;
            var legend_column_length = Math.ceil(color_domain.length/3);

            var legend = d3.select(target_element)
            .append('svg')
            .attr('width', 850);

            legend = legend.attr('height', legend_line_height * legend_column_length);

            legend = legend.selectAll('.legend')
                .data(color_domain)
                .enter().append('g')
                .attr('class', 'legend')
                .attr("transform", function(d, i)
                { return "translate("+(Math.floor(i/legend_column_length)*legend.attr('width')/3)+"," + (i%legend_column_length * legend_line_height) + ")"; });

            legend.append('rect')
                .attr('width', legend_line_height - 6)
                .attr('height', legend_line_height - 6)
                .attr("transform", function(d, i) { return "translate(3, 3)"; })
                .attr('class', 'selected')
                .style('stroke', function(d){ return color(d); })
                .style('stroke-width', 1)
                .style('fill', function(d){ return color(d); });

            legend.append('text')
                .attr('x', legend_line_height + 2)
                .attr('y', legend_line_height - 5)
                .text(function(d) { return d; });
        },

        render_seqpeek_template: function(target_element, gene_label, tracks) {
            var table = $('<table></table>').appendTo(target_element);
            var header_row = $('<tr></tr>').appendTo($('<thead></thead>').appendTo(table));

            $('<th>Cohort</th><th></th>').appendTo(header_row);
            var locator_column = $('<th style="text-align: center;"><canvas id="seqpeek-mini-locator" width="400" height="24"></canvas></th>').appendTo(header_row);
            var locator_svg = $('<svg height="24"></svg>').appendTo(locator_column);

            locator_svg.append('<rect x="5" y="1" height="21" width="10" style="stroke: red; fill-opacity: 0.0;"></rect>')
                .append('<text x="20" y="15" font-size="10">current view</text>')
                .append('<rect x="85" y="7" height="10" width="30" style="fill: rgb(170,170,170); stroke-opacity: 0.0;"></rect>')
                .append('<text x="120" y="15" font-size="10">whole protein</text>');

            var table_body = $('<tbody></tbody>').appendTo(table);
            var track, new_tr;

            for (var i = 0; i < tracks.length; i++) {
                track = tracks[i];
                new_tr = '<tr>' +
                    '<td colspan="2">' + track['label'] + '</td>' +
                    '<td rowspan="4" id="' + track['render_info']['row_id'] + '"></td>' +
                    '</tr>';
                table_body.append(new_tr);

                if (track['type'] == 'tumor') {
                    new_tr =
                        '<tr style="font-size: 8pt">' +
                            '<td>Patients:</td><td>' + track['statistics']['cohort_size'] + '</td>' +
                        '</tr>' +
                        '<tr style="font-size: 8pt">' +
                            '<td>Mutants:</td><td>' + track['statistics']['samples']['numberOf'] + '</td>' +
                        '</tr>' +
                        '<tr style="font-size: 8pt">' +
                            '<td>Unique pos:</td><td>' + track['statistics']['samples']['mutated_positions'] + '</td>' +
                        '</tr>';
                }
                // "COMBINED" track
                else {
                    new_tr =
                        '<tr style="font-size: 8pt">' +
                            '<td>Mutants:</td><td>' + track['statistics']['samples']['numberOf'] + '</td>' +
                        '</tr>' +
                        '<tr style="font-size: 8pt">' +
                            '<td>Unique pos:</td><td>' + track['statistics']['samples']['mutated_positions'] + '</td>' +
                        '</tr>' +
                        '<tr><td></td><td></td></tr>';
                }

                table_body.append(new_tr);

            }

            table_body.append('<tr><td></td><td></td><td id="seqpeek-tick-element"></td></tr>');

            // Display gene label
            $('<div><h4>Gene</h4><label>' + gene_label + '</label></div>').appendTo(target_element);

            return {
                'table': table
            };
        },

        render_seqpeek: function(target_table_selector, gene_element, data_bundle) {
            var plot_data = data_bundle['plot_data'];
            var target_table = $(target_table_selector)[0];
            var tableView = SeqPeekViewFactory.create(target_table, plot_data);
            tableView.render();
            return {
                plot_data: function(){ return plot_data; }
            }
        }
    };
});
