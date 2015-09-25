define   (
[
    '../util/data_adapters',
    '../util/gene_region_utils',

    './track_prototype'
],
function(
    DataAdapters,
    GeneRegionUtils,

    SeqPeekTrackPrototype
) {
    var SamplePlotTrackPrototype = {
        setHeightFromStatistics: function() {
            var height = this.statistics.max_samples_in_location * this.config.glyph_width + this.config.stem_height;
            this.dimensions.height = height;

            return this;
        },

        _applySampleBasedRenderData: function(data) {
            var self = this,
                radius = this.config.glyph_width / 2.0;

            DataAdapters.apply_to_variant_types(data, function(type_data, memo) {
                var render_data = {
                        array: []
                    };

                _.each(type_data.data, function(data_point, index) {
                    render_data.array.push(_.extend(data_point, {
                        color: self.config.color_scheme(data_point),
                        r: radius
                    }));
                });

                type_data.render_data = render_data;
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

        _buildSampleRenderData: function() {
            var self = this,
                ctx = this._getRenderingContext(),
                variant_layout = this.getVariantLayout(),
                viewport_x = ctx.getViewportPosition().x,
                sample_rendering_data = [],
                sample_base_y = this.dimensions.height - this.config.stem_height,
                radius = this.config.glyph_width / 2.0;

            DataAdapters.apply_to_variant_types(this.visible_data, function(type_data, memo, data_by_location)  {
                var coordinate = data_by_location.coordinate,
                    current_y = sample_base_y + radius;

                _.each(type_data.render_data.array, function(sample_data_point) {
                    current_y = current_y - self.config.glyph_width;
                    sample_rendering_data.push(_.extend(sample_data_point, {
                        y: current_y,
                        screen_x: variant_layout.getScreenLocationForVariant(coordinate, type_data) + viewport_x
                    }));
                });
            }, {});

            this.render_data.samples = sample_rendering_data;
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

        color_scheme: function(color_scheme) {
            this.config.color_scheme = DataAdapters.make_accessor(color_scheme);

            return this;
        },

        glyph_width: function(value) {
            this.config.glyph_width = value;

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
        // Plot API //
        //////////////
        category_totals: function() {
            this.config.category_totals = arguments[0];

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

        _renderSampleGlyphs: function() {
            var self = this,
                ctx = this._getRenderingContext();

            ctx.svg
                .selectAll(".variant")
                .remove();

            ctx.svg
                .selectAll(".variant")
                .data(self.render_data.samples)
                .enter()
                .append("svg:circle")
                .attr("class", "variant")
                .attr("cx", function(d) {
                    return d.screen_x;
                })
                .attr("cy", function(d) {
                    return d.y;
                })
                .attr("r",  function(d) {
                    return d.r;
                })
                .style("fill", function(d) {
                    return d.color;
                });

            if (this.config.hovercard.enable) {
                var handler = this._buildHovercardHandler();

                ctx.svg
                    .selectAll(".variant")
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
        draw: function() {
            this._applySampleBasedRenderData(this.location_data);

            this.render();
        },

        render: function() {
            this._updateVisibleData();

            this._buildStemRenderData();
            this._renderStems();

            this._buildSampleRenderData();
            this._renderSampleGlyphs();
        }
    };

    var track_proto = Object.create(SeqPeekTrackPrototype);
    _.extend(track_proto, SamplePlotTrackPrototype);

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
