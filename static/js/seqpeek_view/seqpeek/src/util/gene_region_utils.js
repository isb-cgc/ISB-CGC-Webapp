define([
    './data_adapters'
],
function(
    DataAdapters
) {
    var build_region_common = function(start, end) {
        var region = {};

        if (start === null) {
            region = _.extend(region, {
                end: end,
                belongs: function(coordinate) {
                    return coordinate <= end;
                },
                data: []
            });
        }
        else if (end === null) {
            region = _.extend(region, {
                start: start,
                belongs: function(coordinate) {
                    return coordinate >= start;
                },
                data: []
            });
        }
        else {
            region = _.extend(region, {
                start: start,
                end: end,
                belongs: function(coordinate) {
                    return start <= coordinate && coordinate <= end;
                },
                data: []
            });
        }

        return region;
    };

    var build_noncoding_region = function(start, end) {
        var region = build_region_common(start, end);

        return _.extend(region, {
            type: 'noncoding'
        });
    };

    var build_exon_region = function(start, end) {
        var region = build_region_common(start, end);

        return _.extend(region, {
            type: 'exon'
        });
    };

    return {
        buildRegionsFromArrayWithNonCoding: function(param_regions, extra_fields) {
            var region_info = _.reduce(param_regions, function(memo, region) {
                if (region.start - memo.last_end > 1) {
                    memo.region_array.push(build_noncoding_region(memo.last_end + 1, region.start - 1));
                }
                
                var region_obj = build_exon_region(region.start, region.end);

                _.each(extra_fields, function(field) {
                    if (_.has(region, field)) {
                        region_obj[field] = region[field];
                    }
                });

                memo.region_array.push(region_obj);

                memo.last_start = region.start;
                memo.last_end = region.end;
                
                return memo;
            }, {
                region_array: [],
                last_start: null,
                last_end: null
            });

            return region_info.region_array;
        },

        buildRegionsFromArray: function(param_regions) {
            var RESERVED_FIELDS = ['type', 'data', 'start', 'end', 'belongs'];

            return _.map(param_regions, function(region_info) {
                var region;
                if (region_info.type == 'noncoding') {
                    region = build_noncoding_region(region_info.start, region_info.end);
                }
                else if (region_info.type == 'exon') {
                    region = build_exon_region(region_info.start, region_info.end);
                }

                _.extend(region, _.omit(region_info, RESERVED_FIELDS));

                return region;
            });
        },

        fillDataIntoRegions: function(gene_regions, data_points, param_coordinate_getter) {
            var discarded = 0,
                coordinate_iter = DataAdapters.make_accessor(param_coordinate_getter);

            _.each(data_points, function(d) {
                var bin = _.find(gene_regions, function(region) {
                    return region.belongs(coordinate_iter(d));
                });

                if (bin === undefined) {
                    discarded = discarded + 1;
                }
                else {
                    bin.data.push(d);
                }
            });

            if (discarded > 0) {
                console.warn(discarded + " data points do not match into any region");
            }
        },

        iterateDataWithRegions: function(gene_regions, data_points, param_coordinate_getter, handler, context) {
            var discarded = 0,
                coordinate_iter = DataAdapters.make_accessor(param_coordinate_getter);

            _.each(data_points, function(d) {
                var bin = _.find(gene_regions, function(region) {
                    return region.belongs(coordinate_iter(d));
                });

                if (bin === undefined) {
                    discarded = discarded + 1;
                }
                else {
                    //bin.data.push(d);

                    handler({
                        region: bin,
                        data: d
                    });
                }
            });

            if (discarded > 0) {
                console.warn(discarded + " data points do not match into any region");
            }
        }
    };

// end define
});
