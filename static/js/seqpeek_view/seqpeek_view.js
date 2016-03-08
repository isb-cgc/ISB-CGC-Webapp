define([
    'seqpeek_view/view'

], function(
    SeqPeekViewFactory
) {
    return {
        render_seqpeek_table: function(target_element, tracks) {
            var table = $('<table></table>').appendTo(target_element);
            var header_row = $('<tr></tr>').appendTo($('<thead></thead>').appendTo(table));

            $('<th>Cohort</th><th>Samples (#)</th>').appendTo(header_row);
            var locator_column = $('<th style="text-align: center;"><canvas id="seqpeek-mini-locator" width="400" height="24"></canvas></th>').appendTo(header_row);
            var locator_svg = $('<svg height="24"></svg>').appendTo(locator_column);

            locator_svg.append('<rect x="5" y="1" height="21" width="10" style="stroke: red; fill-opacity: 0.0;"></rect>')
                .append('<text x="20" y="15" font-size="10">current view</text>')
                .append('<rect x="85" y="7" height="10" width="30" style="fill: rgb(170,170,170); stroke-opacity: 0.0;"></rect>')
                .append('<text x="120" y="15" font-size="10">whole protein</text>');

            var table_body = $('<tbody></tbody>').appendTo(table);
            for (var i = 0; i < tracks.length; i++) {
                var new_tr = '<tr>' +
                    '<td>' + tracks[i]['label'] + '</td>' +
                    '<td>' + tracks[i]['number_of_samples'] + '</td>' +
                    '<td id="' + tracks[i]['row_id'] + '"></td>' +
                    '</tr>';
                table_body.append(new_tr);
            }

            table_body.append('<tr><td></td><td></td><td id="seqpeek-tick-element"></td></tr>');
            return table;
        },

        render_seqpeek: function(target_table_selector, data_bundle) {
            var plot_data = data_bundle['plot_data'];
            var tracks = plot_data['tracks'];

            var target_table = $(target_table_selector)[0];
            var tableView = SeqPeekViewFactory.create(target_table, plot_data);
            tableView.render();
        }
    };
});
