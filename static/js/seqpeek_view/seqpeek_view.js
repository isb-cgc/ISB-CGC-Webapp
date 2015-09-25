require.config({
    baseUrl: '/static/js/seqpeek_view',

    paths: {
        domReady: 'vendor/domReady'
    },

    shim: { }
});


require([
    'domReady',
    './view'

], function(
    domReady,
    SeqPeekViewFactory
) {
    domReady(function() {
        if (typeof __data_bundle == "undefined" || __data_bundle === "undefined") {
            console.log("SeqPeek plot data bundle is undefined");
            return;
        }

        var set_selection_count_text = function(text) {
            $(selection_count_el).text(text);
        };

        var target_table = $(document).find("#seqpeek-table")[0];
        var tableView = SeqPeekViewFactory.create(target_table, __data_bundle);
        tableView.render();

        var selection_count_el = $(document).find("#number_selected_samples");
        var selection_handler = function(sample_id_list) {
            set_selection_count_text(_.unique(sample_id_list).length);
        };
        tableView.set_selection_handler(selection_handler);

        var select_toggle_button = $(document).find("#seqpeek_selection_toggle");
        $(select_toggle_button).on("click", function() {
            $(this).toggleClass('active');
            tableView.toggle_interaction_mode();

            /*
             If zoom/scroll mode was toggled, set the unique selected samples counter to zero
             */
            if (tableView.get_interaction_mode() == 'zoom') {
                set_selection_count_text(0);
            }
        });
    });
});
