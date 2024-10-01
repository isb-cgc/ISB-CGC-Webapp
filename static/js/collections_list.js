require.config({
    baseUrl: STATIC_FILES_URL + 'js/',
    paths: {
        jquery: 'libs/jquery-3.7.1.min',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        'datatables.net': 'libs/jquery.dataTables.min',
        base: 'base'
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'datatables.net': ['jquery']
    }
});


require(['jquery', 'datatables.net','jqueryui', 'bootstrap', 'base'],
    function($) {
        var collex_data_table = $('#collections-table').DataTable({
            "dom": '<"dataTables_controls"i<>lpf>rt<"bottom"><"clear">',
            "pageLength": 100,
            'order': [[ 2, 'desc' ], [ 1, 'asc' ]]
        });

        $('#collections-table tbody').on('click', 'td.details-control', function () {
            var tr = $(this).parents('tr');
            var row = collex_data_table.row(tr);
            if (row.child.isShown()) {
                // This row is already open - close it
                row.child.hide();
                tr.removeClass('shown');
                $(this).prop('title', 'Click to display collection description.');
            } else {
                $(this).prop('title', 'Click to hide collection description.');
                let collex_info = $(this).siblings('.collection-explore');
                let type = collex_info.data('collex-type');
                let desc = collection_descs[$(this).data('collex-id')];
                if(type === 'Analysis'){
                    desc += `<p><b>Collections:</b> `+collex_info.data('collex-collex').replaceAll(",", ", ")+`</p>`;
                }
                let sources = $(this).data('doi').split(" ").map(function(i){
                    return  `<a class="external-link" data-toggle="modal" data-target="#external-web-warning" href="" url="https://doi.org/${i}">https://doi.org/${i} <i class="fa-solid fa-external-link external-link-icon" aria-hidden="true"></i></a>`;
                });
                let source_location = `<b>Source(s): </b>${sources.join(" &nbsp; ")}`;
                (row.child() && row.child().length) ? row.child.show() : row.child($(`<tr><td></td><td class="description" colspan="8">`+
                    `<p>${source_location}</p>${desc}</td></tr>`)).show();
                tr.addClass('shown');
            }
        });

        $('#collections-table tbody').on('click', 'td.collection-explore', function () {
            let url = '/explore/filters/?'
                + ($(this).data('collex-type') === 'Analysis' ? "analysis_results_id" : "collection_id")
                + "=" + $(this).data('collex-id');

            window.location.href = url;
        });

        $(document).ready(function () {
            $('.collex-panel, .site-footer').removeClass('hidden');
        });
});