require.config({
    baseUrl: STATIC_FILES_URL + 'js/',
    paths: {
        jquery: 'libs/jquery-3.5.1',
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
                let desc = (type !== 'Analysis') ? collection_descs[$(this).data('collex-id')] : `<b>Collections:</b> `+collex_info.data('collex-collex');
                let doi = $(this).data('doi');
                (row.child() && row.child().length) ? row.child.show() : row.child($(`<tr><td></td><td colspan="7">`+
                    `<p><b>DOI: </b><a href="https://doi.org/${doi}" target="_blank" rel="noopener noreferrer">${doi}</a></p>${desc}</td></tr>`)).show();
                tr.addClass('shown');
            }
        });

        $('#collections-table tbody').on('click', 'td.collection-explore', function () {
            let collection_id = $(this).data('collex-type') === 'Analysis' ?
                $(this).data('collex-collex').split(', ').map(
                    function n(x, i, a ){
                    return ((x == 'SPIE-AAPM-NCI PROSTATEx Challenges (Prostate-X-Challenge)') ? 'prostatex' : x).toLowerCase().replaceAll("-","_");
                })
                : [$(this).data('collex-id')];
            let filterStr = JSON.stringify([{'filters': [{
                'id': '120',
                'values': collection_id,
            }]}]);

            let url = '/explore/?filters_for_load=' + filterStr;
            url = encodeURI(url);

            window.location.href = url;
        });

        $(document).ready(function () {
            $('.collex-panel').removeClass('hidden');
        });
});