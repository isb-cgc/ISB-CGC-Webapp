$(document).on('ready', function() {

    $('#genes').autocomplete({
        source: gene_list
    });

    $('#disease-types').tokenfield({
        autocomplete:{
            source: disease_codes
        },
        showAutocompleteOnFocus: true
    });

//    $('#genes').tokenfield({
//        autocomplete:{
//            source: gene_list
//        },
//        limit,
//        showAutocompleteOnFocus: true
//    })
});