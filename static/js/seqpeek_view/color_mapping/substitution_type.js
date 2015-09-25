define([

], function(

) {
    ///////////////////////////////////////////////////////////
    //
    // Module for grouping and coloring transition
    // and transversion mutations.
    //


    var UNKNOWN_TYPE_COLOR = "rgba(170,170,170,1.0)";

    var DNA_CHANGE_FIELD_NAME = "dna_change";

    var TRANSITION = 0;
    var TRANSVERSION = 1;
    var UNKNOWN = 3;

    var LABEL_MAP = {};
    LABEL_MAP[TRANSITION] = "Transition";
    LABEL_MAP[TRANSVERSION] = "Transversion";

    ///////////////////////////////////////////////////////////
    // Mapping of the groups to colors
    //
    var COLOR_MAP = { };
    COLOR_MAP[TRANSITION] = {color: "rgb(132, 172, 186)", label: LABEL_MAP[TRANSITION]};
    COLOR_MAP[TRANSVERSION] = {color: "rgb(253, 143, 66)", label: LABEL_MAP[TRANSVERSION]};

    var prototype = {
        _dna_change_field_name: DNA_CHANGE_FIELD_NAME,
        _dna_change_splitter: '->',
        _color_map: COLOR_MAP,
        _label_map: LABEL_MAP,
        _unknown_type_color: UNKNOWN_TYPE_COLOR,
        isTransition: function(base_pairs) {
            return (base_pairs[0] == 'A' && base_pairs[1] == 'G') ||
                (base_pairs[0] == 'G' && base_pairs[1] == 'A') ||
                (base_pairs[0] == 'C' && base_pairs[1] == 'T') ||
                (base_pairs[0] == 'T' && base_pairs[1] == 'C');
        },
        isTransversion: function(base_pairs) {
            return (base_pairs[0] == 'A' && base_pairs[1] == 'C') ||
                (base_pairs[0] == 'C' && base_pairs[1] == 'A') ||
                (base_pairs[0] == 'G' && base_pairs[1] == 'T') ||
                (base_pairs[0] == 'T' && base_pairs[1] == 'G') ||
                (base_pairs[0] == 'G' && base_pairs[1] == 'C') ||
                (base_pairs[0] == 'C' && base_pairs[1] == 'G');
        },
        getKey: function(data_point) {
            return data_point[this._dna_change_field_name];
        },
        getBasePairs: function(data_point) {
            var key = this.getKey(data_point);
            return key.split(this._dna_change_splitter);
        },
        getGroup: function(data_point) {
            var base_pairs = this.getBasePairs(data_point);

            if (this.isTransition(base_pairs)) {
                return TRANSITION;
            }
            else if (this.isTransversion(base_pairs)) {
                return TRANSVERSION;
            }
            else {
                return UNKNOWN;
            }
        },
        getGroupLabel: function(data_point) {
            var key = this.getKey(data_point);
            var group = this.getGroup(data_point);
            if (_.has(this._label_map, group)) {
                return this._label_map[group];
            }
            else {
                return key;
            }
        },
        getColor: function (data_point) {
            var group = this.getGroup(data_point);
            if (_.has(this._color_map, group)) {
                return this._color_map[group];
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
