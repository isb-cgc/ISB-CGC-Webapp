define([
    'seqpeek_view/view'

], function(
    SeqPeekViewFactory
) {
    return {
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
                    '<td rowspan="2" id="' + track['row_id'] + '"></td>' +
                    '</tr>';
                table_body.append(new_tr);

                if (track['type'] == 'tumor') {
                    new_tr = '<tr>' +
                        '<td style="font-size: 8pt">C: ' + track['cohort_size'] + '</td>' +
                        '<td style="font-size: 8pt">S: ' + track['number_of_samples'] + '</td>' +
                        '</tr>';
                }
                // "COMBINED" track
                else {
                    new_tr = '<tr>' +
                        '<td colspan="2" style="font-size: 8pt">S: ' + track['number_of_samples'] + '</td>' +
                        '</tr>';
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
            var tracks = plot_data['tracks'];

            var target_table = $(target_table_selector)[0];
            var tableView = SeqPeekViewFactory.create(target_table, plot_data);
            tableView.render();
        }
    };
});
