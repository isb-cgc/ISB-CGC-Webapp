define(
[

],
function (
) {
    var _basic_layout_prototype = {
        getMetadata: function() {
            return this.metadata;
        },

        intron_width: function(value) {
            this.options.noncoding_region_width = value;

            return this;
        },

        exon_width: function(value) {
            this.options.coding_region_width = value;

            return this;
        },

        getCoordinateFromScaleLocation: function(screen_x) {
            return this.screen_location_to_coordinate_scale(screen_x);
        },

        getScaleLocationFromCoordinate: function(coordinate) {
            return this.coordinate_to_screen_location_scale(coordinate);
        },

        process: function(region_data) {
            var self = this,
                current_loc = 0,
                width_config = this.options.coding_region_width,
                screen_location_to_coordinate_domain = [0],
                screen_location_to_coordinate_range = [];

            _.each(region_data, function(region, index, region_array) {
                var start = isNaN(region.start) ? 0 : region.start,
                    region_end = region.end;

                if (screen_location_to_coordinate_range.length == 0) {
                    screen_location_to_coordinate_range.push(start);
                }

                var width;

                if (region.type == 'exon') {
                    if (width_config === undefined) {
                        width = region_end - start;
                    }
                    else if (_.isFunction(width_config)) {
                        width = width_config(region, index, region_array);
                    }
                    else {
                        width = width_config;
                    }
                }
                else {
                    width = self.options.noncoding_region_width;
                }

                region.layout = {
                    screen_x: current_loc,
                    screen_width: width,
                    screen_height: 10.0
                };

                current_loc = current_loc + width + 1;

                screen_location_to_coordinate_domain.push(current_loc);
                screen_location_to_coordinate_range.push(region_end);
            });

            this.screen_location_to_coordinate_scale = d3.scale
                .linear()
                .domain(screen_location_to_coordinate_domain)
                .range(screen_location_to_coordinate_range);

            this.coordinate_to_screen_location_scale = d3.scale
                .linear()
                .domain(screen_location_to_coordinate_range)
                .range(screen_location_to_coordinate_domain);

            this.metadata = {
                start_coordinate: region_data[0].start,
                end_coordinate: _.last(region_data).end,
                total_width: current_loc - 1
            };
        }
    };

    return {
        BasicLayoutFactory: {
            create: function(config) {
                var obj = Object.create(_basic_layout_prototype, {});
                obj.options = {
                    noncoding_region_width: config.noncoding_region_width !== undefined ? config.noncoding_region_width : 10
                };
                obj.metadata = {
                    start_coordinate: null,
                    end_coordinate: null,
                    total_width: null
                };

                return obj;
            }
        }
    };
});
