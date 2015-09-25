define   (
[
    './gene_region_utils'
],
function (
    GeneRegionUtils
) {
    _generate_test_data = function(data_array, fields) {
        return _.map(data_array, function(data_row) {
            var result = {};

            _.each(_.keys(fields), function(key) {
                var val = fields[key];

                // The value is an index to the data row
                if (_.isNumber(parseInt(val)) && val >= 0) {
                    result[key] = data_row[val];
                }
                // The value is an index to the data row
                if (_.isString(val) && _.isNumber(parseInt(val))) {
                    if (val >= 0) {
                        result[key] = data_row[val];
                    }
                }
                // The value is an accessor function
                else if (_.isFunction(val)) {
                    result[key] = val(data_row);
                }
            });

            return result;
        });
    };

    return {
        generate_test_data: _generate_test_data,

        generate_region: function(transcript, type, start, end) {
            return {
                type: type,
                start: start,
                end: end
            }
        },

        build_protein_test_track: function(config) {
            var display_labels = {
                'true': 'true',
                'false': 'false',
                'na': 'NA'
            };

            var tooltip_items = {
                "Location": function(d) {
                    return d.location;
                },
                "Samples": function(d) {
                    return d.sample_ids.length;
                }
            };

            var data = config.data;

            var category_sizes = _.countBy(data, function(d) {
                return d.value;
            });

            _.each(['true', 'false', 'na'], function(group_label) {
                var display_label = display_labels[group_label];

                tooltip_items[display_label] = function(d) {
                    var category_counts = d.processed_samples.color_by.category_counts,
                        count = 0;

                    if (_.has(category_counts, group_label)) {
                        count = category_counts[group_label];
                    }

                    return count;
                };
            });

            return {
                type: 'protein',
                color_by: {
                    category_sizes: category_sizes
                },

                mutations: data,
                tooltips: {
                    items: tooltip_items
                }
            };
        },

        build_genomic_test_track: function(config, param_regions, data_points) {
            var display_labels = {
                'true': 'true',
                'false': 'false',
                'na': 'NA'
            };

            var variant_tooltip_items = {
                "Location": function(d) {
                    return d.location;
                },
                "Samples": function(d) {
                    return d.sample_ids.length;
                }
            };

            var region_hovercard_items = {
                "Type": function(d) {
                    return d.type;
                },
                "Coordinates": function(d) {
                    return d.start + ":" + d.end;
                }
            };

            var data = config.data;

            var category_sizes = _.countBy(data, function(d) {
                return d.value;
            });

            _.each(['true', 'false', 'na'], function(group_label) {
                var display_label = display_labels[group_label];

                variant_tooltip_items[display_label] = function(d) {
                    var category_counts = d.processed_samples.color_by.category_counts,
                        count = 0;

                    if (_.has(category_counts, group_label)) {
                        count = category_counts[group_label];
                    }

                    return count;
                };
            });

            var region_data = config.regions;
            GeneRegionUtils.fillDataIntoRegions(region_data, data, 'coordinate');

            return {
                type: 'genomic',
                color_by: {
                    category_sizes: category_sizes
                },
                variants: data,
                variant_coordinate_field: 'coordinate',
                variant_id_field: 'mutation_id',
                region_data: region_data,
                tooltips: {
                    variants: {
                        items: variant_tooltip_items
                    },
                    regions: {
                        items: region_hovercard_items
                    }
                }
            };
        }
    }
// end define
});