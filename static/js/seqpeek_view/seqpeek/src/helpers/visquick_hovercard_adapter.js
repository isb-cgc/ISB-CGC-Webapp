define([

], function (

) {
    /*
     * TODO documentation
     */
    var prototype = {
        initialize: function() {
            var container_guid = 'C' + vq.utils.VisUtils.guid();
            this.guid = container_guid;

            d3.select(this.container_element)
                .attr("id", container_guid);
        },

        _getGUID: function() {
            return this.guid;
        },

        getHandler: function(data_content, tool_links) {
            var handler_params = _.extend(this.config.hovercard, {
                canvas_id: this._getGUID(),
                param_data: true,
                data_config: data_content,
                tool_config: tool_links
            });

            var card = vq.hovercard(handler_params);

            return function(element, data) {
                card.call(element, data);
            }
        }
    };

    return {
        create: function(container_element, hovercard_config) {
            var obj = Object.create(prototype, {});

            obj.container_element = container_element;
            obj.config = {
                hovercard: hovercard_config
            };

            obj.initialize();
            return obj;
        }
    };
});
