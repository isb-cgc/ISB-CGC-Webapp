define([

    ],
function(

) {
    // Default colors
    var DEFAULT_EXON_REGION_FILL = "rgba(170,170,170,1)";
    var DEFAULT_NONCODING_REGION_FILL = "rgba(170,170,170,1)";
    var DEFAULT_VIEWPORT_STROKE = "rgba(255,0,0,0.7)";

    var DEFAULT_VIEWPORT_STROKE_WIDTH = 2.0;

    var DEFAULT_REGION_HEIGHT = 10;
    var DEFAULT_VIEWPORT_HEIGHT = 20;

    var MiniLocatorPrototype = {
        init: function() {
            this.config.width = this.config.canvas_el.width;
            this.config.height = this.config.canvas_el.height;
            this.ctx = this.config.canvas_el.getContext("2d");
        },

        update: function() {

        },

        region_layout: function(region_layout) {
            this.region_layout = region_layout;

            return this;
        },

        data: function(region_data) {
            this.region_data = region_data;

            return this;
        },

        scale: function(value) {
            this.config.scale = value;

            return this;
        },

        render: function(start_coordinate, end_coordinate) {
            var ctx = this.ctx;
            this._clearCanvas();

            ctx.save();
            ctx.scale(this.config.scale, 1);

            _.each(this.region_data, function(region) {
                if (region.type == "exon") {
                    this._renderExon(region);
                }
                else if (region.type == "noncoding") {
                    this._renderNonCoding(region);
                }
            }, this);
            this.ctx.restore();

            this._renderViewportExtent(start_coordinate, end_coordinate);
        },

        _clearCanvas: function() {
            this.ctx.save();
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            this.ctx.clearRect(0, 0, this.config.width, this.config.height);
            this.ctx.restore();
        },

        _renderExon: function(region) {
            var ctx = this.ctx;

            var x = region.layout.screen_x;
            var y = (this.config.height / 2.0) - (DEFAULT_REGION_HEIGHT / 2.0);
            var h = DEFAULT_REGION_HEIGHT;
            var w = region.layout.screen_width;

            ctx.beginPath();
            ctx.rect(x, y, w, h);
            ctx.closePath();

            ctx.lineWidth = 0;
            ctx.fillStyle = DEFAULT_EXON_REGION_FILL;
            ctx.fill();
        },

        _renderNonCoding: function(region) {
            var ctx = this.ctx;

            var x = region.layout.screen_x;
            var y = (this.config.height / 2.0) - (DEFAULT_REGION_HEIGHT / 2.0);
            var h = DEFAULT_REGION_HEIGHT;
            var w = region.layout.screen_width;

            ctx.beginPath();
            ctx.rect(x, y, w, h);
            ctx.closePath();

            ctx.lineWidth = 0;
            ctx.fillStyle = DEFAULT_NONCODING_REGION_FILL;
            ctx.fill();
        },

        _renderViewportExtent: function(start_coordinate, end_coordinate) {
            var ctx = this.ctx;
            var scale = this.config.scale;
            var adjust = (DEFAULT_VIEWPORT_STROKE_WIDTH / 2.0);
            var min_x = this.region_layout.getScaleLocationFromCoordinate(start_coordinate);
            var max_x = this.region_layout.getScaleLocationFromCoordinate(end_coordinate);
            var x = scale * min_x + adjust;
            var y = (this.config.height / 2.0) - (DEFAULT_VIEWPORT_HEIGHT / 2.0) - (0.5 * adjust);
            var h = DEFAULT_VIEWPORT_HEIGHT;
            var w = scale * (max_x - min_x) - 2 * adjust;

            ctx.beginPath();
            ctx.rect(x, y, w, h);
            ctx.closePath();

            ctx.lineWidth = DEFAULT_VIEWPORT_STROKE_WIDTH;
            ctx.strokeStyle = DEFAULT_VIEWPORT_STROKE;
            ctx.stroke();
        }
    };

    return {
        create: function(target_canvas) {
            var obj = Object.create(MiniLocatorPrototype, {});
            obj.config = {
                canvas_el: target_canvas
            };
            obj.init();
            return obj;
        }
    }
});