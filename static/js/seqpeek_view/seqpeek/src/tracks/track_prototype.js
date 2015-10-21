define (
[
],
function(
) {
    var SeqPeekTrackPrototype = {
        ///////////////
        // Variables //
        ///////////////
        _brushinfo: {
            supportsbrush: true
        },

        ///////////////
        // Functions //
        ///////////////

        getHeight: function() {
            return this.dimensions.height;
        },

        height: function(height) {
            this.dimensions = {
                height: height
            };

            return this;
        },

        guid: function(value) {
            this.config.guid = value;

            return this;
        },

        ///////////////
        // Brush API //
        ///////////////
        supportsSelection: function() {
            return this._brushinfo.supportsbrush;
        }
    };

    return SeqPeekTrackPrototype;
});
