$(document).on('ready', function() {

    $('#genes').autocomplete({
        source: gene_list
    });

    $('#disease-types').tokenfield({
        autocomplete:{
            source: track_id_list
        },
        showAutocompleteOnFocus: true
    });
});