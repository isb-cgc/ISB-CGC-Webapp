define   (
[
    '../util/data_adapters',
    '../util/gene_region_utils',
    '../seqpeek_scaling',

    './track_prototype'
],
function(
    DataAdapters,
    GeneRegionUtils,
    ScalingFunctions,

    SeqPeekTrackPrototype
) {
    var BarPlotTrackPrototype = {
        setHeightFromStatistics: function() {
            var bar_heights = [];
            DataAdapters.apply_to_variant_types(this.location_data, function(type_data, memo) {
                var total_bar_height_in_location = d3.sum(type_data.render_data.array, function(bar_data) {
                    return bar_data.height;
                });

                bar_heights.push(total_bar_height_in_location);
            });
            var max_local_bar_height = d3.max(bar_heights);
            this.dimensions.height = max_local_bar_height + this.config.stem_height;

            return this;
        },

        _applyStackedBarRenderData: function(data) {
            var self = this,
                scaling_function = ScalingFunctions.getScalingFunctionByType(this.config.scaling.type),
                category_totals = this.config.category_totals,
                render_info = _.extend(self.config.scaling, {
                    category_colors: self.config.color_scheme
                });

            if (this.config.max_samples_in_location !== undefined) {
                render_info.max_samples_in_location = this.config.max_samples_in_location;
            }

            DataAdapters.apply_to_variant_types(data, function(type_data, memo) {
                type_data.render_data = scaling_function(type_data.statistics.by_category, self.statistics, category_totals, render_info, type_data);
            });
        },

        _updateVisibleData: function() {
            var visible_coordinates = this._getRenderingContext().getVisibleCoordinates(),
                start = visible_coordinates[0],
                stop = visible_coordinates[1];

            this.visible_data = _.chain(this.location_data)
                .filter(function(data) {
                    return start <= data.coordinate && data.coordinate <= stop;
                })
                .value();
        },

        _buildBarRenderData: function() {
            var self = this,
                ctx = this._getRenderingContext(),
                variant_layout = this.getVariantLayout(),
                viewport_x = ctx.getViewportPosition().x,
                bar_rendering_data = [],
                bar_base_y = this.dimensions.height - this.config.stem_height;

            DataAdapters.apply_to_variant_types(this.visible_data, function(type_data, memo, data_by_location)  {
                var coordinate = data_by_location.coordinate,
                    current_y = bar_base_y;

                _.each(type_data.render_data.array, function(bar_data) {
                    current_y = bar_base_y - bar_data.height;
                    bar_rendering_data.push(_.extend(bar_data, {
                        coordinate: coordinate,
                        statistics: type_data.statistics,
                        type: type_data.type,
                        y: current_y,
                        screen_x: variant_layout.getScreenLocationForVariant(coordinate, type_data) + viewport_x - self.config.bar_width / 2.0
                    }));
                });
            }, {});

            this.render_data.bars = bar_rendering_data;
        },

        _buildStemRenderData: function() {
            var self = this,
                ctx = this._getRenderingContext(),
                variant_layout = this.getVariantLayout(),
                viewport = ctx.getViewport(),
                viewport_x = ctx.getViewportPosition().x;

            var stem_rendering_data = [];

            GeneRegionUtils.iterateDataWithRegions(this.region_data, this.visible_data, 'coordinate', function(d) {
                DataAdapters.apply_to_variant_types([d.data], function(type_data, memo, location_data) {
                    var coordinate = location_data.coordinate,
                        stem_start_x = viewport._getScreenLocationFromCoordinate(coordinate) + viewport_x,
                        stem_end_x = variant_layout.getScreenLocationForVariant(coordinate, type_data) + viewport_x;

                    stem_rendering_data.push({
                        sx: stem_start_x,
                        sy: self.dimensions.height,
                        tx: stem_end_x,
                        ty: self.dimensions.height - self.config.stem_height,
                        coordinate: coordinate
                    });
                });
            });

            this.render_data.stems = stem_rendering_data;
        },

        getVariantLayout: function() {
            return this.config.variant_layout;
        },

        hovercard_config: function(value) {
            this.config.hovercard.config = value;

            return this;
        },

        hovercard_content: function(value) {
            this.config.hovercard.enable = true;
            this.config.hovercard.content = value;

            return this;
        },

        //////////////
        // Data API //
        //////////////
        data: function(data, data_key) {
            this.location_data = data;
            DataAdapters.apply_track_statistics(this, 'location_data');

            return this;
        },

        regions: function(region_data, param_coordinate_getter) {
            this.region_data = region_data;

            return this;
        },

        color_scheme: function(value) {
            this.config.color_scheme = value;

            return this;
        },

        bar_width: function(value) {
            this.config.bar_width = value;

            return this;
        },

        stem_height: function(height) {
            this.config.stem_height = height;

            return this;
        },

        variant_layout: function(layout_object) {
            this.config.variant_layout = layout_object;

            return this;
        },

        //////////////
        // Plot API //
        //////////////
        category_totals: function() {
            this.config.category_totals = arguments[0];

            return this;
        },

        max_samples_in_location: function() {
            this.config.max_samples_in_location = arguments[0];

            return this;
        },

        scaling: function(config) {
            this.config.scaling = config;

            return this;
        },

        //////////////////////////////////
        // Internal rendering functions //
        //////////////////////////////////
        _buildHovercardHandler: function() {
            var handler_params = _.extend(this.config.hovercard.config, {
                canvas_id: this.config.guid,
                data_config: this.config.hovercard.content
            });

            return vq.hovercard(handler_params);
        },

        _renderBars: function() {
            var self = this,
                ctx = this._getRenderingContext();

            ctx.svg
                .selectAll(".variant")
                .remove();

            var bars = ctx.svg
                .selectAll(".variant")
                .data(self.render_data.bars)
                .enter()
                    .append("svg:rect")
                    .attr("class", "variant")
                    .attr("x", function(d) {
                        return d.screen_x;
                    })
                    .attr("y", function(d) {
                        return d.y;
                    })
                    .attr("width", self.config.bar_width)
                    .attr("height", function(d) {
                        return d.height;
                    })
                    .style("fill", function(d) {
                        return d.color;
                    });

            if (this.config.hovercard.enable) {
                var handler = this._buildHovercardHandler();

                bars
                    .each(function() {
                        d3.select(this).on("mouseover", function(d) {
                            handler.call(this, d);
                        });
                    });
            }
        },

        _renderStems: function() {
            var ctx = this._getRenderingContext();

            var diagonal = d3.svg.diagonal()
                .projection(function(d) {
                    return [d.x, d.y];
                })
                .source(function(d) {
                    return {
                        x: d.sx,
                        y: d.sy
                    };
                })
                .target(function(d) {
                    return {
                        x: d.tx,
                        y: d.ty
                    };
                });

            ctx.svg
                .selectAll(".stem")
                .remove();

            ctx.svg.selectAll(".stem")
                .data(this.render_data.stems)
                .enter()
                .append("svg:path")
                .attr("class", "stem")
                .style("fill", "none")
                .style("stroke", "gray")
                .attr("d", diagonal);
        },

        ///////////////////
        // Rendering API //
        ///////////////////
        createStaticRenderData: function() {
            this._applyStackedBarRenderData(this.location_data);
        },

        draw: function() {

            this.render();
        },

        render: function() {
            this._updateVisibleData();

            this._buildStemRenderData();
            this._renderStems();

            this._buildBarRenderData();
            this._renderBars();
        }
    };

    var track_proto = Object.create(SeqPeekTrackPrototype);
    _.extend(track_proto, BarPlotTrackPrototype);

    return {
        create: function(config) {
            var track = Object.create(track_proto, {});
            track.config = {
                hovercard: {
                    enable: false
                }
            };
            track.render_data = {};
            return track;
        }
    }
});
