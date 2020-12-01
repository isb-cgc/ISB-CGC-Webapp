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
            "dom": '<"dataTables_controls"ilpf>rt<"bottom"><"clear">'
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
                var desc = collection_descs[$(this).data('collex-id')];
                var doi = $(this).data('doi');
                (row.child() && row.child().length) ? row.child.show() : row.child($(`<tr><td></td><td colspan="7"><p><b>DOI: </b><a href="https://doi.org/${doi}" target="_blank">${doi}</a></p>${desc}</td></tr>`)).show();
                tr.addClass('shown');
            }
        });

        $('#collections-table tbody').on('click', 'td.collection-explore', function () {
            console.log($(this).attr('data-collex-id'));

            var tcia_id_map = {};
            tcia_id_map['10.7937/TCIA.2018.h7umfurq'] = ['lidc_idri'];

            // Lung Phantom, LIDC-IDRI, QIN LUNG CT, RIDER Lung CT
            tcia_id_map['10.7937/K9/TCIA.2015.1BUVFJR7'] = ['lidc_idri'];
            // TCGA-BRCA, BREAST-DIAGNOSIS, ISPY1, Breast-MRI-NACT-Pilot
            tcia_id_map['10.7937/TCIA.2019.wgllssg1'] = ['tcga_brca', 'ispy1'];

            tcia_id_map['10.7937/K9/TCIA.2014.FAB7YRPZ'] = ['tcga_gbm'];
            tcia_id_map['10.7937/TCIA.2018.ow6ce3ml'] = ['tcga_gbm', 'tcga_lgg'];

            var groups = [];
            var filters = [];
            var values = [];

            var collection_id = $(this).attr('data-collex-id');
            if (collection_id in tcia_id_map) {
                values = tcia_id_map[collection_id];
            }
            else {
                values.push(collection_id);
            }

            filters.push(
            {
                'id': '120',
                'values': values,
            });
            groups.push({'filters': filters});
            var filterStr = JSON.stringify(groups);

            let url = '/explore/?filters_for_load=' + filterStr;
            url = encodeURI(url);

            window.location.href = url;
        });

        $(document).ready(function () {
            $('.collex-panel').removeClass('hidden');

            $('.collection-explore').each(function() {
                var collection_id = $(this).attr('data-collex-id');
                if (collection_id == "10.7937/K9/TCIA.2015.1BUVFJR7")
                {
                    $(this).html('<a role="button">' +
                        'LIDC-IDRI, </a>' +
                        '<span class="gray-out-text"">*Lung Phantom, QIN LUNG CT, RIDER Lung CT</span>');
                }
                else if (collection_id == "10.7937/TCIA.2019.wgllssg1")
                {
                    $(this).html('<a role="button">' +
                        'TCGA-BRCA, ISPY1, </a>' +
                        '<span class="gray-out-text"">*BREAST-DIAGNOSIS, Breast-MRI-NACT-Pilot</span>');
                }
            });

            var table_bottom = $('#collections-table_wrapper').find('.bottom');
            table_bottom.html('<span class="gray-out-text">' +
                    '* Gray text collections are part of the analysis, ' +
                    'but not currently hosted by IDC.');
        });
});