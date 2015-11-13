require.config({
    baseUrl: '/static/js/seqpeek_view',

    paths: {
        domReady: 'vendor/domReady',
        select2: '../libs/select2.min',
        jquery: '../libs/jquery-1.11.1.min',
        bootstrap: '../libs/bootstrap.min',
        helpers: '../helpers/vis_helpers'
    },

    shim: { }
});


require([
    'domReady',
    './view',
    'helpers',
    'select2',
    'bootstrap'

], function(
    domReady,
    SeqPeekViewFactory,
    helpers
) {
    var vizhelpers = Object.create(helpers, {});

    domReady(function() {

        // Show hide settings
        $('.show-flyout').on('click', function() { vizhelpers.show_flyout_callback(this); });
        $('.hide-flyout').on('click', function() { vizhelpers.hide_flyout_callback(this); });

        // Cohort Editing
        $('.add-cohort').on('click', function() { vizhelpers.show_cohort_panel(this); });
        $('.close-cohort-search').on('click', function() { vizhelpers.hide_cohort_panel(this); });
        $('a.remove-cohort').on('click', function() { vizhelpers.remove_cohort_callback(this); });
        $('a.select-cohort').on('click', function() {
            vizhelpers.select_cohort_callback(this, $(this).attr('value'), $(this).html());
        });

        // Create Comment
        $('.add-comment').on('submit', function(event) {
            event.preventDefault();
            vizhelpers.add_comment_callback(this);
            return false;
        });

        var select2_formatting = function(item) {
            return '<option value="'+item['id']+'">'+item['text']+'</option>';
        };

        var feature_search_url = base_api_url + '/_ah/api/feature_type_api/v1/feature_field_search?datatype=GNAB&field=gene_name';
//        console.log(feature_search_url);
        $('#genes').select2({
            ajax: {
                url: feature_search_url,
                dataType: 'json',
                data: function (params) {
                    return { keyword: params.term, page: params.page };
                },
                processResults: function (data, page) {
                    var items = $.map(data['values'], function (item) {
                        var obj = {};
                        obj.id = item;
                        obj.text = item;
                        return obj;
                    });
                    return {results: items};
                }
            },
            id: function (item) { return item['id']; },
            escapeMarkup: function (markup) { return markup; },
            minimumInputLength: 1,
            templateResult: select2_formatting,
            templateSelection: select2_formatting
        });

        // Update Plot
        $('.update-plot').on('click', function() {
            var settings = $(this).parents('.main-settings');
            var gene = settings.find('#genes').val();
            var seqpeek_api_url = base_api_url + '/_ah/api/seqpeek_data_api/v1/view_data?hugo_symbol=' + gene;
            var cohort_ids = $.map(settings.find('.cohort-listing div'), function(d) { return $(d).attr('value'); });
            for (var i = 0; i < cohort_ids.length; i++) {
                seqpeek_api_url += '&cohort_id=' + cohort_ids[i];
            }
            $('.plot').find('.plot-loader').show();
            reload_data(seqpeek_api_url);
        });

        // Hijack and insert more values into to save visualization POST
        $('#save-viz').on('submit', function() {
            var form = this;
            $('input.plot-attr').remove();
            $('.plot').each(function(index) {
                var plot_id = $(this).attr('id');
                var x = $(this).find('#genes').val();
                var type = 'seqpeek';
                var cohort_ids = $.map($(this).find('.cohort-listing div'), function(d) { return $(d).attr('value'); });
                var name = $(this).find('input[name="name"]').val();

                $(form).append('<input name="' + plot_id + '-name" value="' + name + '" type="hidden" class="plot-attr" />');
                $(form).append('<input name="' + plot_id + '-x_axis" value="' + x + '" type="hidden" class="plot-attr" />');
                $(form).append('<input name="' + plot_id + '-plot_type" value="' + type + '" type="hidden" class="plot-attr" />');
                $(form).append('<input name="' + plot_id + '-cohort_ids" value="' + cohort_ids + '" type="hidden" class="plot-attr" />')
            });
        });


        var selection_count_el = $(document).find("#number_selected_samples");
        var set_selection_count_text = function(text) {
            $(selection_count_el).text(text);
        };

        var reset_seqpeek_table = function() {
            $('#seqpeek-table').find('tbody').empty();
        };

        var render_seqpeek = function(data_bundle, status, jqXHR) {
            var plot_data = data_bundle['plot_data'];
            var tracks = plot_data['tracks'];

            reset_seqpeek_table();
            var table_body = $('#seqpeek-table').find('tbody');
            for (var i = 0; i < tracks.length; i++) {
                var new_tr = '<tr>' +
                    '<td>' + tracks[i]['label'] + '</td>' +
                    '<td>' + tracks[i]['number_of_samples'] + '</td>' +
                    '<td id="' + tracks[i]['row_id'] + '"></td>' +
                    '</tr>';
                table_body.append(new_tr);
            }

            table_body.append('<tr><td></td><td></td><td id="seqpeek-tick-element"></td></tr>');

            var target_table = $("#seqpeek-table")[0];
            var tableView = SeqPeekViewFactory.create(target_table, plot_data);
            tableView.render();

            var selection_handler = function (sample_id_list) {
                set_selection_count_text(_.unique(sample_id_list).length);
            };
            tableView.set_selection_handler(selection_handler);

            var select_toggle_button = $(document).find("#seqpeek_selection_toggle");
            $(select_toggle_button).on("click", function () {
                $(this).toggleClass('active');
                tableView.toggle_interaction_mode();

                /*
                 If zoom/scroll mode was toggled, set the unique selected samples counter to zero
                 */
                if (tableView.get_interaction_mode() == 'zoom') {
                    set_selection_count_text(0);
                }
            });
            $('.plot').find('.plot-loader').hide();
        };

        var reload_data = function(data_uri) {
            $.ajax({
                url: data_uri,
                dataType: "json",
                success: render_seqpeek
            });
        };

        if (initial_gene != '') {
            $('.update-plot').click();
        }
    });
});
