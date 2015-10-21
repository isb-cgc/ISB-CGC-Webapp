define   (
[
    '../util/data_adapters',

    './track_prototype'
],
function(
    DataAdapters,
    SeqPeekTrackPrototype
) {
    var RegionTrackPrototype = {
        _getHandlerData: function(datum) {
            return _.pick(datum, 'start', 'end', 'type');
        },

        _applySVG: function() {
            var self = this,
                ctx = this._getRenderingContext();

            var regions_g = ctx.svg.selectAll("g.region")
                .data(self.region_data)
                .enter()
                    .append("g")
                    .attr("class", function(d) {
                        return "region " + d.type
                    });

            if (this.config.mouseover.handler !== null) {
                regions_g
                    .each(function() {
                        d3.select(this).on("mouseover", function(d) {
                            self.config.mouseover.handler(this, self._getHandlerData(d));
                        });
                    });
            }
        },

        _renderExon: function() {
            var self = this,
                ctx = this._getRenderingContext();

            ctx.svg.selectAll(".region.exon")
                .each(function() {
                    d3.select(this)
                        .append("svg:rect")
                        .attr("class", "x-scale")
                        .attr("x", function(d) {
                            return self.region_layout.getScaleLocationFromCoordinate(d.start);
                        })
                        .attr("width", function(d) {
                            var screen_start_x = self.region_layout.getScaleLocationFromCoordinate(d.start);
                            var screen_end_x = self.region_layout.getScaleLocationFromCoordinate(d.end);
                            return screen_end_x - screen_start_x;
                        })
                        .attr("y", function(d) {
                            return 0.0;
                        })
                        .attr("height", self.getHeight())
                        .style("fill", self.config.color_scheme('exon'))
                        .style("stroke-width", 0);
                });
        },

        _renderNonCoding: function() {
            var self = this,
                ctx = this._getRenderingContext();

            ctx.svg.selectAll(".region.noncoding")
                .each(function() {
                    d3.select(this)
                        .append("svg:rect")
                        .attr("class", "x-scale")
                        .attr("x", function(d) {
                            return self.region_layout.getScaleLocationFromCoordinate(d.start);
                        })
                        .attr("width", function(d) {
                            var screen_start_x = self.region_layout.getScaleLocationFromCoordinate(d.start);
                            var screen_end_x = self.region_layout.getScaleLocationFromCoordinate(d.end);
                            return screen_end_x - screen_start_x;
                        })
                        .attr("y", function(d) {
                            return self.getHeight() / 2.0 - 2.5;
                        })
                        .attr("height", 5.0)
                        .style("fill", self.config.color_scheme('noncoding'))
                        .style("stroke-width", 0);
                });
        },

        //////////////
        // Data API //
        //////////////
        data: function(region_data) {
            this.region_data = region_data;

            return this;
        },

        color_scheme: function(value) {
            if (typeof(value) == "function") {
                this.config.color_scheme = value;
            }
            else if (typeof(value) == "string") {
                this.config.color_scheme = DataAdapters.make_accessor(color_scheme);
            }
            else if (typeof(value) == "object") {
                var color_map = _.clone(value);
                this.config.color_scheme = function(d) {
                    return color_map[d];
                }
            }

            return this;
        },

        region_layout: function(region_layout) {
            this.region_layout = region_layout;

            return this;
        },

        ///////////////
        // Event API //
        ///////////////
        mouseover_handler: function(value) {
            this.config.mouseover.handler = value;
        },

        ///////////////
        // Brush API //
        ///////////////
        supportsSelection: function() {
            return false;
        },

        ///////////////////
        // Rendering API //
        ///////////////////
        draw: function() {
            this._applySVG();
            this._renderExon();
            this._renderNonCoding();
        },

        render: function() {
            var ctx = this._getRenderingContext();

            ctx.svg.attr("transform", function() {
                var trs =
                    "translate(" + ctx.getViewportPosition().x + ",0)" +
                    "scale(" + ctx.getViewportScale() + ",1)";

                return trs;
            });
        }
    };

    var track_proto = Object.create(SeqPeekTrackPrototype);
    _.extend(track_proto, RegionTrackPrototype);

    return {
        create: function() {
            var track = Object.create(track_proto, {});
            track.config = {
                mouseover: {
                    handler: null
                }
            };
            return track;
        }
    }
});
