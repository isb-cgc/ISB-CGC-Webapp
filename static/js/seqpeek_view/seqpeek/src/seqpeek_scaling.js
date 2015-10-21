define(
[

],
function(
) {
    var _getColor = function(group_name, type_name, color_info) {
        if (_.isFunction(color_info)) {
            return color_info(group_name, type_name);
        }
        else {
            return color_info[group_name];
        }

    };

    var _createFractionalBars = function(samples_by_categories, render_info, type_data) {
        var total_samples = _.reduce(samples_by_categories, function(memo, value, key) {
            return memo + value;
        }, 0);

        return _.reduce(_.keys(samples_by_categories, function(memo, group_name) {
            var number = samples_by_categories[group_name],
                fract = number / total_samples,
                height = fract * render_info.max_height;

            memo.array.push({
                height: height,
                y: memo.current_y,
                color: _getColor(group_name, type_data.type, render_info.category_colors)
            });

            memo.current_y += height;

            return memo;
        }, {
            array: [],
            current_y: 0
        }));
    };

    var _createLinearBars = function(samples_by_categories, param_statistics, render_info, type_data) {
        var pixels_per_sample = 1,
            category_max_height = render_info.max_height / _.keys(samples_by_categories).length;

        var log_scale = d3.scale
            .log().base([2])
            .domain([1.0, param_statistics.max_samples_in_location])
            .range([5, category_max_height]);

        return _.reduce(_.keys(samples_by_categories, function(memo, group_name) {
            var number = samples_by_categories[group_name],
                height = log_scale(d3.max([1.0, number]));

            if (number > 0) {
                memo.array.push({
                    height: height,
                    y: memo.current_y,
                    color: _getColor(group_name, type_data.type, render_info.category_colors)
                });

                memo.current_y += height;
            }

            return memo;
        }, {
            array: [],
            current_y: 0
        }));
    };

    var _createLog2Bars = function(samples_by_categories, track_statistics, category_totals, render_info, type_data) {
        var category_max_height = render_info.max_height / _.keys(samples_by_categories).length;
        var max_samples_in_location = render_info.max_samples_in_location || track_statistics.max_samples_in_location;

        var log_scale = d3.scale
            .log().base([2])
            .domain([1.0, max_samples_in_location])
            .range([5, category_max_height]);

        var bars = _.reduce(_.keys(samples_by_categories), function(memo, group_name) {
            var number = samples_by_categories[group_name],
                height = log_scale(d3.max([1.0, number]));

            if (number > 0) {
                memo.array.push({
                    height: height,
                    y: memo.current_y,
                    color: _getColor(group_name, type_data.type, render_info.category_colors)
                });

                memo.current_y += height;
            }

            return memo;
        }, {
            array: [],
            current_y: 0
        });

        return bars;
    };

    var _createNormalizedLinearBars = function(samples_by_categories, track_statistics, category_totals, render_info, type_data) {
        var min_height = render_info.min_height,
            max_height = render_info.max_height,
            pixels_per_sample = render_info.scaling_factor;

        var bars = _.reduce(_.keys(samples_by_categories), function(memo, group_name) {
            if (_.has(samples_by_categories, group_name)) {
                var number = samples_by_categories[group_name],
                    cat_size = category_totals[group_name],
                    height;

                if (cat_size !== undefined && cat_size > 0) {
                    height = pixels_per_sample * (number / cat_size)
                }
                else {
                    height = 0;
                }

                if (number > 0) {
                    memo.array.push({
                        height: height,
                        y: memo.current_y,
                        color: _getColor(group_name, type_data.type, render_info.category_colors)
                    });

                    memo.current_y += height;
                }
            }

            return memo;
        }, {
            array: [],
            current_y: 0
        });

        // Scale if needed
        if (bars.current_y <= min_height || max_height <= bars.current_y) {
            var total_height = d3.min([d3.max([bars.current_y, min_height]), max_height]),
                k = total_height / bars.current_y;

            return _.reduce(bars.array, function(memo, bar) {
                var height = k * bar.height;

                memo.array.push({
                    height: height,
                    y: memo.current_y,
                    color: bar.color
                });

                memo.current_y += height;

                return memo;
            },{
                array: [],
                current_y: 0
            });
        }
        else {
            return bars;
        }
    };

    var _function_id_to_impl = {
        'fract': _createFractionalBars,
        'log2nabs': _createLog2Bars,
        'linear': _createLinearBars,
        'linnorm': _createNormalizedLinearBars
    };

    return {
        createFractionalBars: _createFractionalBars,

        createLinearBars: _createLinearBars,

        createLog2Bars: _createLog2Bars,

        createNormalizedLinearBars: _createNormalizedLinearBars,

        isValidScalingType: function(scaling_type) {
            return _.has(_function_id_to_impl, scaling_type);
        },

        getScalingFunctionByType: function(scaling_type) {
            return _function_id_to_impl[scaling_type];
        }
    }
});