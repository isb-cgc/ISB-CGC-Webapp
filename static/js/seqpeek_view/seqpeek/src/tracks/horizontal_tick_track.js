define (
[
    './track_prototype'
],
function(
    SeqPeekTrackPrototype
) {
    var LocationDisplayTrackPrototype = Object.create({
        init: function() {
            this.current_scale = null;
        },

        _buildScales: function() {
            var ctx = this._getRenderingContext(),
                viewport = ctx.getViewport(),
                region_ticks = [];

            _.chain(this.region_data)
                .filter(function(region) {
                    return region.type == 'exon';
                })
                .each(function(region) {
                    var region_start_on_screen = viewport._getScreenLocationFromCoordinate(region.start);
                    var region_end_on_screen = viewport._getScreenLocationFromCoordinate(region.end);

                    var scale = d3.scale
                        .linear()
                        .domain([region.start, region.end])
                        .range([region_start_on_screen, region_end_on_screen]);

                    var num_ticks = Math.floor((region_end_on_screen - region_start_on_screen) / 100);

                    var ticks = scale.ticks(num_ticks);

                    Array.prototype.push.apply(region_ticks, _.map(ticks, function (tick_coordinate) {
                        return {
                            tick_text: tick_coordinate,
                            x: scale(tick_coordinate)
                        };
                    }));
                });

            this.region_ticks = region_ticks;
        },

        _renderExon: function() {
            var self = this,
                ctx = this._getRenderingContext();

            ctx.svg.selectAll(".location-tick")
                .remove();

            var tick_g = ctx.svg.selectAll(".location-tick")
                .data(this.region_ticks)
                    .enter()
                    .append("svg:g")
                    .attr("class", "location-tick")
                    .attr("transform", function(d) {
                        return "translate(" + d.x + ",0)";
                    });

                // Tick marks
                tick_g
                    .append("svg:line")
                    .attr("y1", 0)
                    .attr("y2", self.config.tick_height)
                    .style("stroke", "lightgray");

                // Tick labels
                tick_g
                    .append("svg:text")
                    .text(function(d) {
                        return d.tick_text;
                    })
                    .attr("y", self.config.tick_text_y)
                    .style("text-anchor", "middle");
        },

        _renderNonCoding: function() {
            // TODO
            // Implement some kind of indicator for non-coding regions
        },

        //////////////
        // Data API //
        //////////////
        data: function(region_data) {
            this.region_data = region_data;

            return this;
        },

        tick_height: function(height) {
            this.config.tick_height = height;

            return this;
        },

        tick_text_y: function(value) {
            this.config.tick_text_y = value;

            return this;
        },

        ///////////////
        // Brush API //
        ///////////////
        supportsSelection: function() {
            return this._brushinfo.supportsbrush;
        },

        ///////////////////
        // Rendering API //
        ///////////////////
        draw: function() {
            this.render();
        },

        render: function() {
            var ctx = this._getRenderingContext(),
                scale = ctx.getViewport().getViewportScale();

            // Generate new ticks only if viewport zoom has changed since last render
            if (scale != this.current_scale) {
                this._buildScales();

                this._renderExon();
                this._renderNonCoding();

                this.current_scale = scale;
            }

            ctx.svg.attr("transform", function() {
                return "translate(" + ctx.getViewportPosition().x + ",0)";
            });
        }
    });

    var track_proto = Object.create(SeqPeekTrackPrototype);
    _.extend(track_proto, LocationDisplayTrackPrototype);

    return {
        create: function() {
            var obj = Object.create(track_proto, {});
            obj._brushinfo = {
                supportsbrush: true
            };
            obj.config = {};
            obj.init();
            return obj;
        }
    }
});
