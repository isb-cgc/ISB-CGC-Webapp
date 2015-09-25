define   (
[
    '../util/data_adapters',

    './track_prototype'
],
function(
    DataAdapters,

    SeqPeekTrackPrototype
) {
    var ProteinDomainTrackPrototype = {
        _buildDomainRenderData: function() {
            var self = this,
                data = this.config.domain_data,
                ctx = this._getRenderingContext(),
                source_key = this.config.source_key,
                protein_domain_ids,
                domain_scale,
                render_data = [];

            // Ordinal scale for vertically positioning InterPro signatures
            if (_.has(this.config, 'source_order') && _.isArray(this.config.source_order)) {
                protein_domain_ids = this.config.source_order;
                domain_scale = d3.scale.ordinal()
                    .domain(protein_domain_ids)
                    .rangeBands([0, protein_domain_ids.length * (this.config.domain_height + 1)]);
            }
            else {
                protein_domain_ids = _.uniq(_.pluck(data, this.config.source_key));
                domain_scale = d3.scale.ordinal()
                    .domain(protein_domain_ids)
                    .rangeBands([0, protein_domain_ids.length * (this.config.domain_height + 1)]);
            }

            _.each(data, function(match) {
                _.each(match.locations, function(location) {
                    var screen_x0 = ctx.getRegionLayout().getScaleLocationFromCoordinate(location.start),
                        screen_x1 = ctx.getRegionLayout().getScaleLocationFromCoordinate(location.end);

                    var cloned_match = _.clone(match);
                    render_data.push(_.extend(cloned_match, location, {
                        screen_x0: screen_x0,
                        screen_x1: screen_x1,
                        color: self.config.color_scheme[match[source_key]]
                    }));
                });
            });

            this.render_data = render_data;
            this.vertical_scale = domain_scale;
        },

        _getInternalLabelID: function(label_info) {
            return label_info['index'];
        },

        _buildLabelRenderData: function() {
            var self = this,
                data = this.config.domain_data,
                ctx = this._getRenderingContext(),
                viewport = ctx.getViewport(),
                viewport_x = ctx.getViewportPosition().x,
                label_render_data = [],
                label_id_counter = 0;

            _.each(data, function(match) {
                _.each(match.locations, function(location) {
                    var text = self.config.label(match);
                    label_render_data.push({
                        screen_x: viewport._getScreenLocationFromCoordinate(location.start) + viewport_x,
                        screen_y: self.vertical_scale(match[self.config.source_key]),
                        text: text,
                        index: label_id_counter
                    });

                    label_id_counter += 1;
                });
            });

            this.label_render_data = label_render_data;
        },

        _buildHovercardHandler: function() {
            var handler_params = _.extend(this.config.hovercard.config, {
                canvas_id: this.config.guid,
                data_config: this.config.hovercard.content
            });

            if (this.config.hovercard.enable_tools) {
                handler_params.tool_config = this.config.hovercard.links;
            }

            return vq.hovercard(handler_params);
        },

        _applySVG: function() {
            var self = this,
                ctx = this._getRenderingContext(),
                source_key = this.config.source_key;

            this.domains_g = ctx.svg
                .append("svg:g");

            this.domains_g
                .selectAll("rect.domain")
                .data(this.render_data, function(d) {
                    return d.screen_x0 + "-" + d.screen_x1;
                })
                .enter()
                .append("rect")
                .attr("class", "domain")
                .attr("x", function(d) {
                    return d.screen_x0;
                })
                .attr("width", function(d) {
                    return  d.screen_x1 - d.screen_x0;
                })
                .attr("y", function(d) {
                    return self.vertical_scale(d[source_key]);
                })
                .attr("height", self.config.domain_height)
                .style("fill", function(d) {
                    return d.color;
                });

            if (this.config.hovercard.enable) {
                var handler = this._buildHovercardHandler();

                this.domains_g.selectAll("rect.domain")
                    .each(function() {
                        d3.select(this).on("mouseover", function(d) {
                            handler.call(this, d);
                        });
                    });
            }

            if (this.config.label !== null) {
                this.domain_labels = ctx.svg.selectAll("text.domain-label")
                    .data(this.label_render_data, this._getInternalLabelID)
                    .enter()
                    .append("svg:text")
                    .attr("class", "domain-label")
                    .attr("font-size", 15)
                    .attr("x", function(d) {
                        return d.screen_x;
                    })
                    .attr("y", function(d) {
                        return d.screen_y + 15;
                    })
                    .text(function(d) {
                        return d.text;
                    });
            }
        },

        getVariantLayout: function() {
            return this.config.variant_layout;
        },

        //////////////
        // Data API //
        //////////////
        domain_data: function(data) {
            this.config.domain_data = data;

            return this;
        },

        regions: function(region_data) {
            this.region_data = region_data;

            return this;
        },

        variant_layout: function(layout_object) {
            this.config.variant_layout = layout_object;

            return this;
        },

        domain_height: function(value) {
            this.config.domain_height = value;

            return this;
        },

        label: function(value) {
            if (typeof(value) == "function") {
                this.config.label = value;
            }
            else if (typeof(value) == "string") {
                this.config.label = DataAdapters.make_accessor(color_scheme);
            }

            return this;
        },

        color_scheme: function(color_scheme) {
            this.config.color_scheme = color_scheme;

            return this;
        },

        source_key: function(value) {
            this.config.source_key = value;

            return this;
        },

        source_order: function(value) {
            this.config.source_order = value;

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

        hovercard_links: function(value) {
            this.config.hovercard.enable_tools = true;
            this.config.hovercard.links = value;

            return this;
        },

        ///////////////////
        // Rendering API //
        ///////////////////
        draw: function() {
            this._buildDomainRenderData();

            if (this.config.label !== null) {
                this._buildLabelRenderData();
            }

            this._applySVG();
        },

        render: function() {
            var ctx = this._getRenderingContext();

            this.domains_g.attr("transform", function() {
                var trs =
                    "translate(" + ctx.getViewportPosition().x + ",0)" +
                    "scale(" + ctx.getViewportScale() + ",1)";

                return trs;
            });

            if (this.config.label !== null) {
                this._buildLabelRenderData();

                ctx.svg.selectAll("text.domain-label")
                    .data(this.label_render_data, this._getInternalLabelID)
                    .attr("x", function(d) {
                        return d.screen_x;
                    });
            }
        }
    };

    var track_proto = Object.create(SeqPeekTrackPrototype);
    _.extend(track_proto, ProteinDomainTrackPrototype);

    return {
        create: function() {
            var track = Object.create(track_proto, {});
            track._brushinfo = {
                supportsbrush: true
            };
            track.config = {
                label: null,
                hovercard: {
                    enable: false,
                    enable_tools: false
                }
            };
            return track;
        }
    }
});
