define   (
[
],
function(
) {
    var BRUSH_COLOR = "#EEEEEE";
    var BRUSH_STROKE_COLOR = "red";

    var SeqPeekContextPrototype = {
        _getVisualizationSize: function() {
            return {
                width: this.config.dimensions.width,
                height: this.data.track.getHeight()
            }
        },

        init: function() {
            this.data = {};

            this.vis = {
                viewport_pos: [0, 0],
                viewport_scale: [1, 1]
            };
        },

        initDiv: function(target_div) {
            var self = this;
            this.init();

            target_div.innerHTML = "";

            this.vis.root = d3.select(target_div)
                .append("svg")
                .style("pointer-events", "none");

            this.set_svg_size = _.once(function() {
                self.vis.root
                    .attr("width", self.vis.size_info.width)
                    .attr("height", self.vis.size_info.height);
            });
        },

        initSVG: function(target_svg) {
            this.init();

            this.vis.root = target_svg;

            this.set_svg_size = function() {};
        },

        draw: function() {
            var self = this;

            this.vis.size_info = this._getVisualizationSize();
            this.vis.viewport_size = [this.config.dimensions.width, this.vis.size_info.height];

            // Set the width and height attributes of the SVG element, if the createIntoDiv function
            // was used to create this object.
            this.set_svg_size();

            this.vis.zoom = d3.behavior.zoom()
                .translate(this.vis.viewport_pos)
                .scaleExtent([0.5, Infinity])
                .scale(this.vis.viewport_scale[0])
                .on("zoom", function() {
                    _.bind(self._zoomEventHandler, self, {}, true)();
                });

            // Area for graphical elements with clipping
            this.vis.data_area = this.vis.root
                .append("svg:svg")
                .attr("class", "data-area")
                .attr("width", this.vis.viewport_size[0])
                .attr("height", this.vis.viewport_size[1])
                .style("pointer-events", "all");

            // Rectangle for mouse events
            this.vis.zoom_rect = this.vis.root
                .selectAll(".data-area")
                .append("svg:rect")
                .attr("class", "zoom-rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", this.vis.viewport_size[0])
                .attr("height", this.vis.viewport_size[1])
                .style("fill-opacity", 0.0)
                .call(this.vis.zoom);

            this.render();
        },

        _zoomEventHandler: function() {
            var e = d3.event;

            if (this._scrollHandler !== undefined && _.isFunction(this._scrollHandler)) {
                _.bind(this._scrollHandler, this)({
                    translate: e.translate,
                    scale: e.scale
                });
            }
        },

        _buildRenderStateInfo: function() {
            var self = this;
            return {
                getRegionLayout: function() {
                    return self.config.region_layout;
                },
                getViewport: function() {
                    return self.config.viewport;
                },
                getViewportDimensions: function() {
                    return {
                        width: self.vis.viewport_size[0],
                        height: self.vis.viewport_size[1]
                    };
                },
                getViewportPosition: function() {
                    var viewport_pos = self.config.viewport.getViewportPosition();

                    return {
                        x: viewport_pos.x,
                        y: viewport_pos.y
                    };
                },
                getViewportScale: function() {
                    return self.config.viewport.getViewportScale();
                },
                getVisibleCoordinates: function() {
                    return self.config.viewport._getVisibleCoordinates();
                },
                getVariantLayout: function() {
                    return self.config.variant_layout;
                }
            }
        },

        _buildRenderingContext: function(svg) {
            return _.extend(this._buildRenderStateInfo(), {
                svg: svg
            });
        },

        _updateViewportTranslation: function() {
            this.vis.viewport_pos = this.config.viewport.getViewportPosition();
            this.vis.viewport_scale = this.config.viewport.getViewportScale();

            this.vis.zoom.scale(this.vis.viewport_scale);
            this.vis.zoom.translate([this.vis.viewport_pos.x, this.vis.viewport_pos.y]);

            this.data.track.render();
        },

        //////////////
        // Data API //
        //////////////
        region_layout: function(value) {
            this.config.region_layout = value;

            return this;
        },

        viewport: function(param_viewport) {
            this.config.viewport = param_viewport;

            return this;
        },

        scroll_handler: function(scrollHandlerFN) {
            this._scrollHandler = scrollHandlerFN;

            return this;
        },

        width: function(width) {
            this.config.dimensions = {
                width: width
            };

            return this;
        },

        track: function(track) {
            var self = this;

            track._getRenderingContext = function() {
                return self._buildRenderingContext(self.track_g);
            };

            this.data.track = track;

            return this;
        },

        brush_callback: function(value) {
            this.config.brush_callback = value;

            return this;
        },

        /////////////////////////////
        // Brush / Selection logic //
        /////////////////////////////
        _setupBrush: function() {
            var self = this,
                brush_height = this.vis.size_info.height;

            if (! this.data.track.supportsSelection()) {
                return;
            }

            this.brush = d3.svg.brush()
                .x(d3.scale.identity().domain([0, this.config.dimensions.width]))
                .on("brushstart", function() {
                    // "this" refers to the brush g-element
                    _.bind(self._brushStart, self)(this);
                })
                .on("brush", function() {
                    // "this" refers to the brush g-element
                    _.bind(self._brushMove, self)(this);
                })
                .on("brushend", function() {
                    // "this" refers to the brush g-element
                    _.bind(self._brushEnd, self)(this);
                });

            this.vis.brush_g = this.vis.root.append("g")
                .attr("class", "brush");

            this.vis.brush_g
                .call(this.brush)
                .selectAll("rect")
                    .attr("height", brush_height);

            this.toggleZoomMode();
        },


        _updateBrushExtent: function(extent) {
            var brush = this.brush;

            if (! this.config.brush_update_enabled ||
                ! this.data.track.supportsSelection()) {
                return;
            }

            this.vis.brush_g.call(brush.extent([extent["x0"], extent["x1"]]));
        },

        _brushStart: function() {
            this.config.brush_update_enabled = false;
        },

        _brushMove: function(brush_g) {
            var extent = d3.event.target.extent();
            var x0 = extent[0];
            var x1 = extent[1];

            if (this.config.brush_callback != null) {
                this.config.brush_callback({
                    x0: x0,
                    x1: x1
                });
            }
        },

        _brushEnd: function() {
            this.config.brush_update_enabled = true;
        },

        ///////////////////
        // Rendering API //
        ///////////////////
        getCurrentViewport: function() {
            return this._buildRenderStateInfo();
        },

        render: function() {
            this.track_g = this.vis.data_area
                .append("g")
                .attr("class", "seqpeek-track");

            this.data.track.draw();

            this._setupBrush();
        },

        /////////////////////////////////
        // Zoom / Selection toggle API //
        /////////////////////////////////

        toggleZoomMode: function() {
            if (this.data.track.supportsSelection()) {
                this.brush.clear();
                this.vis.brush_g.call(this.brush);

                this.vis.brush_g
                    .style("pointer-events", "none");
            }

            this.vis.zoom_rect
                .style("pointer-events", "all");
        },

        toggleSelectionMode: function() {
            // Disable zoom events
            this.vis.zoom_rect
                .style("pointer-events", "none");

            if (this.data.track.supportsSelection()) {
                this.vis.brush_g
                    .style("pointer-events", "all");
            }
        }
    };

    return {
        createIntoDiv: function(target_el) {
            var obj = Object.create(SeqPeekContextPrototype, {});

            obj.config = {
                target_el: target_el
            };

            obj.initDiv(target_el);

            return obj;
        },

        createIntoSVG: function(target_svg) {
            var obj = Object.create(SeqPeekContextPrototype, {});

            obj.config = {
                brush_callback: null,
                brush_update_enabled: true
            };

            obj.initSVG(target_svg);

            return obj;
        }
    };
});
