define([

], function(

) {
    ///////////////////////////////////////////////////////////
    //
    // Module for grouping and coloring by amino acid,
    // as defined in Lesk, Introduction to Bioinformatics:
    //
    // http://www.bioinformatics.nl/~berndb/aacolour.html
    //
    //


    var UNKNOWN_TYPE_COLOR = "rgba(170,170,170,1.0)";

    var AMINO_ACID_MUTATION_FIELD_NAME = "amino_acid_mutation";

    ///////////////////////////////////////////////////////////
    // Mapping of amino acids to the groups
    //
    var LESK_AMINO_ACID_SMALL_NONPOLAR = "SMALL_NONPOLAR";
    var LESK_AMINO_ACID_HYDROPHOBIC = "HYDROPHOBIC";
    var LESK_AMINO_ACID_POLAR = "POLAR";
    var LESK_AMINO_ACID_NEGATIVELY_CHARGED = "NEGATIVELY_CHARGED";
    var LESK_AMINO_ACID_POSITIVELY_CHARGED = "POSITIVELY_CHARGED";

    var AMINO_ACID_MAPPING = {
        // Small nonpolar - G, A, S, T
        "G": LESK_AMINO_ACID_SMALL_NONPOLAR,
        "A": LESK_AMINO_ACID_SMALL_NONPOLAR,
        "S": LESK_AMINO_ACID_SMALL_NONPOLAR,
        "T": LESK_AMINO_ACID_SMALL_NONPOLAR,

        // Hydrophobic - C, V, I, L, P, F, Y, M, W
        "C": LESK_AMINO_ACID_HYDROPHOBIC,
        "V": LESK_AMINO_ACID_HYDROPHOBIC,
        "I": LESK_AMINO_ACID_HYDROPHOBIC,
        "L": LESK_AMINO_ACID_HYDROPHOBIC,
        "P": LESK_AMINO_ACID_HYDROPHOBIC,
        "F": LESK_AMINO_ACID_HYDROPHOBIC,
        "Y": LESK_AMINO_ACID_HYDROPHOBIC,
        "M": LESK_AMINO_ACID_HYDROPHOBIC,
        "W": LESK_AMINO_ACID_HYDROPHOBIC,

        // Polar - N, Q, H
        "N": LESK_AMINO_ACID_POLAR,
        "Q": LESK_AMINO_ACID_POLAR,
        "H": LESK_AMINO_ACID_POLAR,

        // Negatively charged - D, E
        "D": LESK_AMINO_ACID_NEGATIVELY_CHARGED,
        "E": LESK_AMINO_ACID_NEGATIVELY_CHARGED,

        // Positively charged - K, R
        "K": LESK_AMINO_ACID_POSITIVELY_CHARGED,
        "R": LESK_AMINO_ACID_POSITIVELY_CHARGED
    };

    var UNKNOWN = 0;

    ///////////////////////////////////////////////////////////
    // Mapping of the groups to colors
    //
    var AMINO_ACID_COLOR_MAP = { };
    AMINO_ACID_COLOR_MAP[LESK_AMINO_ACID_SMALL_NONPOLAR] = {label: "Small Nonpolar", color: "orange"};
    AMINO_ACID_COLOR_MAP[LESK_AMINO_ACID_HYDROPHOBIC] = {label: "Hydrophobic", color: "green"};
    AMINO_ACID_COLOR_MAP[LESK_AMINO_ACID_POLAR] = {label: "Polar", color: "magenta"};
    AMINO_ACID_COLOR_MAP[LESK_AMINO_ACID_NEGATIVELY_CHARGED] = {label: "Negatively Charged", color: "red"};
    AMINO_ACID_COLOR_MAP[LESK_AMINO_ACID_POSITIVELY_CHARGED] = {label: "Positively Charged", color: "blue"};

    var prototype = {
        _amino_acid_mutation_field_name: AMINO_ACID_MUTATION_FIELD_NAME,
        _amino_acid_mapping: AMINO_ACID_MAPPING,
        _amino_acid_color_map: AMINO_ACID_COLOR_MAP,
        _unknown_type_color: UNKNOWN_TYPE_COLOR,
        getKey: function(data_point) {
            return data_point[this._amino_acid_mutation_field_name];
        },
        getGroup: function(data_point) {
            var key = data_point[this._amino_acid_mutation_field_name];

            if (_.has(this._amino_acid_mapping, key)) {
                return this._amino_acid_mapping[key];
            }
            else {
                return UNKNOWN;
            }
        },
        getGroupLabel: function(data_point) {
            var key = data_point[this._amino_acid_mutation_field_name];
            var group = this.getGroup(data_point);
            if (_.has(this._amino_acid_color_map, group)) {
                return this._amino_acid_color_map[group].label;
            }
            else {
                return key;
            }
        },
        getColor: function (data_point) {
            var group = this.getGroup(data_point);
            if (_.has(this._amino_acid_color_map, group)) {
                return this._amino_acid_color_map[group];
            }
            else {
                return {label: group, color: this._unknown_type_color};
            }
        }
    };

    return {
        create: function() {
            return Object.create(prototype);
        }
    }
});
