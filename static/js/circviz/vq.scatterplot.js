vq.ScatterPlot = function() {
    vq.Vis.call(this);
};

vq.ScatterPlot.prototype = vq.extend(vq.Vis);

vq.ScatterPlot.prototype.setRegression = function(obj) {
    this.data._regression = obj || 'none';
    this._render();
};

vq.ScatterPlot.prototype.getScales = function(data_array) {
    var dataObj = this.data;
    var xScale, yScale, xs, ys, 
    xsE = [], ysE = [];

    var x = dataObj.COLUMNID.x;
    var y = dataObj.COLUMNID.y;

    if (dataObj.xScale) {
        var xs = dataObj.xScale,
        xsE = d3.extent(xs);
        xScale = d3.scale.linear().domain(xsE).range([0, dataObj._plot.width]);
    }

    if (dataObj.yScale) {
        var ys = dataObj.yScale,
        ysE = d3.extent(ys);
        yScale = d3.scale.linear().domain(ysE).range([dataObj._plot.height, 0]);
    }

    var minX = xsE[0] || data_array.reduce(function(previous, current) {
        return (current[x] != null) && current[x] < previous ? current[x] : previous;
    }, 999999);
    var maxX = xsE[1] || data_array.reduce(function(previous, current) {
        return (current[x] != null) && current[x] > previous ? current[x] : previous;
    }, -999999);
    var minY = ysE[0] || data_array.reduce(function(previous, current) {
        return (current[y] != null) && current[y] < previous ? current[y] : previous;
    }, 999999);
    var maxY = ysE[1] || data_array.reduce(function(previous, current) {
        return (current[y] != null) && current[y] > previous ? current[y] : previous;
    }, -999999);

    //expand plot around highest/lowest values
    var showMinX = minX - (Math.abs(maxX - minX) * 0.03);
    var showMaxX = maxX + (Math.abs(maxX - minX) * 0.03);
    var showMinY = minY - (Math.abs(maxY - minY) * 0.03);
    var showMaxY = maxY + (Math.abs(maxY - minY) * 0.03);

    // Start D3.js code
    xScale = xScale || d3.scale.linear().domain([showMinX, showMaxX]).range([0, dataObj._plot.width]);
    yScale = yScale || d3.scale.linear().domain([showMinY, showMaxY]).range([dataObj._plot.height, 0]);

    return {
        x: xScale,
        y: yScale,
        showMaxX: showMaxX,
        showMinX: showMinX,
        showMaxY: showMaxY,
        showMinY: showMinY
    };
};

vq.ScatterPlot.prototype.draw = function(data) {
    var that = this;
    this.data = new vq.models.ScatterPlotData(data);

    if (!this.data.isDataReady()) { return;}

    var dataObj = this.data;

    var x = dataObj.COLUMNID.x;
    var y = dataObj.COLUMNID.y;
    var value = dataObj.COLUMNID.value;

    var width = dataObj._plot.width;
    var height = dataObj._plot.height;

    this.x = x;
    this.y = y;
    this.value = value;

    this.data_array = dataObj.data;

    // Start D3.js code
    var scales = this.getScales(this.data_array);
    this.xScale = scales.x;
    this.yScale = scales.y;

    // Regression line
    this.regressData = this.getRegressData(scales);

    dataObj._plot.svg_id = vq.utils.VisUtils.guid();

    this.vis = d3.select(dataObj._plot.container)
        .append("svg")
        .attr('id', dataObj._plot.svg_id)
        .attr("width", width + 2 * dataObj.horizontal_padding)
        .attr("height", height + 2 * dataObj.vertical_padding)
        .on('selectstart', function() {d3.event.preventDefault();});

    this.data_area = this.vis
        .append("g")
        .attr("transform", "translate(" + dataObj.horizontal_padding + "," + dataObj.vertical_padding + ")")
        .attr("width", width)
        .attr("height", height);

    this.brush_layer = this.data_area.append("g")
        .attr("class", "plot_brush");

    this.xAxis = d3.svg.axis()
                  .scale(scales.x)
                  .orient("bottom")
                  .tickSize(-1 * height)
                  .ticks(5);

    x_ticks = this.data_area.append("g")
    .attr('class','x axis')
    .attr("transform", "translate(0," + (height) + ")")
    .call(this.xAxis);

    this.yAxis = d3.svg.axis()
                  .scale(scales.y)
                  .orient("left")
                  .tickSize(-1 * width)
                  .ticks(5);

    y_ticks = this.data_area.append("g")
                .attr('class','y axis')
                .attr("transform", "translate(0,0)")
                .call(this.yAxis);

    // Add the Y-axis label
    this.data_area.append("g")
        .attr("class", "axis")
        .append("text")
        .text(dataObj.COLUMNLABEL.y)
        .style("text-anchor", "middle")
        .attr("transform", "translate(" + dataObj.yLabelDisplacement + "," + height / 2 +") rotate(-90)");

    // Add the X-axis label
    this.data_area.append("text")
        .attr("x", width / 2)
        .attr("y", height + dataObj.xLabelDisplacement)
        .style("text-anchor", "middle") 
        .text(dataObj.COLUMNLABEL.x);

    // Clipping container for data points and regression line
    var symbols = this.data_area.append("svg")
        .attr("left", 0)
        .attr("top", 0)
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", "0 0 " + width + " " + height)
        .attr("class", "symbols");

    this.brush = d3.svg.brush();

    this._render();
    this.enableZoom();
    this.disableZoom();
    this.enableBrush();
    this.enableZoom();
};

vq.ScatterPlot.prototype.getRegressData = function(scaleInfo) {
    var dataObj = this.data;
    var x = this.x;
    var y = this.y;

    var regress = dataObj._regression;

    if (regress == 'none') {
        return {
            type: regress
        };
    }
    else if (regress == 'linear') {
        var valid_data = this.data.data.filter(function(d, e, f) {
                return (d[y] && d[x]);
            }),
            sum_x = d3.sum(valid_data, function(d) {
                return d[x];
            }),
            sum_y = d3.sum(valid_data, function(d) {
                return d[y];
            }),
            sum_x2 = d3.sum(valid_data, function(d) {
                return d[x] * d[x];
            }),
            sum_xy = d3.sum(valid_data, function(d) {
                return d[x] * d[y];
            }),
            slope = ((valid_data.length * sum_xy) - (sum_x * sum_y)) / ((valid_data.length * sum_x2) - (sum_x * sum_x));

        var intercept = (sum_y - slope * sum_x) / valid_data.length;

        var line_minX = scaleInfo.showMinX * 0.95;
        var line_maxX = scaleInfo.showMaxX * 1.05;
        var line_maxY = slope * line_maxX + intercept;
        var line_minY = slope * line_minX + intercept;

        var lineArray = d3.scale.linear().domain([line_minX, line_maxX]).range([line_minY, line_maxY]);

        return {
            type: regress,
            minX: line_minX,
            maxX: line_maxX,
            scale: lineArray
        };
    }
};

vq.ScatterPlot.prototype._render = function() {
    this.updateScales({
        x: this.xScale,
        y: this.yScale
    }, true);
};

vq.ScatterPlot.prototype.updateScales = function(scaleInfo, disableTransition) {
    var that = this;
    var dataObj = this.data;
    var enable = dataObj.enableTransitions && (!disableTransition),
        y_trans,
        y_trans_enter,
        y_ticks,
        y_ticks_enter,
        y_ticks_exit,
        x_trans,
        x_trans_enter,
        x_ticks,
        x_ticks_enter,
        x_ticks_exit;
    var dr = dataObj.transitionDuration;
    var x, x_mid, y, y_mid;

    var width = dataObj._plot.width,
        height = dataObj._plot.height;

    x = scaleInfo.x;
    x_mid = (x.domain()[0] + x.domain()[1]) / 2.0;

    y = scaleInfo.y;
    y_mid = (y.domain()[0] + y.domain()[1]) / 2.0;

    this.yAxis.scale(y);
    this.xAxis.scale(x);

    this.data_area.select('g.y.axis').transition()
    .duration(300)
    .call(this.yAxis);

    this.data_area.select('g.x.axis').transition()
    .duration(300)
    .call(this.xAxis);

    this.xScale = x;
    this.yScale = y;

    that.updateData(disableTransition);
};

vq.ScatterPlot.prototype.updateData = function(disableTransition) {
    var that = this;
    var data_array = this.data.data;
    var dataObj = this.data;
    var dr = this.data.transitionDuration;
    var enable = dataObj.enableTransitions && (!disableTransition);

    var data_hovercard = vq.hovercard({
            canvas_id : dataObj._plot.svg_id,
            include_header : false,
            include_footer : true,
            self_hover : true,
            offset: { top: 20, left: 20},
            timeout : dataObj.tooltipTimeout,
            data_config : dataObj.tooltipItems,
            tool_config : dataObj.tooltipLinks
    });

    // Dots
    var dots = this.data_area.select("svg.symbols")
        .selectAll("circle")
        .data(data_array, function(d) {
            return "" + d[that.x] + d[that.y];
        });

    var dots_enter = dots.enter().append("circle")
        .attr("class", "data_point")
        .attr("cx", function(d) {return that.xScale(d[that.x])})
        .attr("cy", function(d) {return that.yScale(d[that.y])})
        .attr("r", dataObj._radius)
        .style('cursor','pointer')
        .call(_.bind(this.setDefaultSymbolStyle, this))
        .style("opacity", 1e-6)
        .on('mouseover', function(d) { data_hovercard.call(this,d); } )
        .on('click', function(d) { 

         that.data_area.select("svg.symbols").selectAll("circle")
            .attr("class", "bg" )
            .style("fill", dataObj._unselectedStrokeStyle )
            .style("stroke", dataObj._unselectedStrokeStyle )
            .style("stroke-width", dataObj._strokeWidth)
            .style("opacity", 0.5); 

            d3.select(this)
            .attr("class", "fg" )
            .style("fill",  dataObj._fillStyle )
            .style("stroke", dataObj._strokeStyle )
            .style("stroke-width", dataObj._strokeWidth)
            .style("opacity", 1.0);

            dataObj._clickHandler(d); 
        });    

    dots_enter.append("title")
        .text(function(d) {
            return dataObj.COLUMNLABEL.value + ' ' + d[that.value];
        });

    if (enable) {
        dots_enter = dots_enter.transition()
            .duration(dr);
    }

    dots_enter.style("opacity", 1.0);

    // Adjust positions
    dots.attr("cx", function(d) {return that.xScale(d[that.x])})
        .attr("cy", function(d) {return that.yScale(d[that.y])});

    var dots_exit = dots.exit();

    if (enable) {
        dots_exit = dots.exit().transition()
            .duration(dr)
            .style("opacity", 1e-6);
    }

    dots_exit.remove();

    // Adjust regression line on zoom
    var rd = that.regressData;
    if (rd.type == 'linear') {
        var regress_lines = this.data_area.select("svg.symbols")
            .selectAll("line.regression")
            .data([{
                x1: that.xScale(rd.minX),
                y1: that.yScale(rd.scale(rd.minX)),
                x2: that.xScale(rd.maxX),
                y2: that.yScale(rd.scale(rd.maxX))
        }], function(d) { return "" + d.x1 + d.x2 + d.y1 + d.y2; });

        var regress_lines_enter = regress_lines.enter()
            .append("line")
            .attr("class", "regression")
            .attr("x1", function(d) { return d.x1; })
            .attr("y1", function(d) { return d.y1; })
            .attr("x2", function(d) { return d.x2; })
            .attr("y2", function(d) { return d.y2; })
            .attr("stroke", dataObj._regressionStrokeStyle)
            .style("opacity", 1e-6);

        if (enable) {
            regress_lines_enter = regress_lines_enter.transition()
                .duration(dr);
        }

        regress_lines_enter.style("opacity", 1.0);

        var regress_lines_exit = regress_lines.exit();

        if (enable) {
             regress_lines_exit = regress_lines.exit().transition()
                .duration(dr)
                .style("opacity", 1e-6);
        }

        regress_lines_exit.remove();
    }
};

vq.ScatterPlot.prototype.setDefaultSymbolStyle = function(selection) {
    var dataObj = this.data;
    selection
        .style("fill", dataObj._fillStyle)
        .style("stroke", dataObj._strokeStyle)
        .style("stroke-width", dataObj._strokeWidth)
        .style("opacity", 1.0);
};

vq.ScatterPlot.prototype.resetData = function(d) {
    this.data.data = d;

    var scales = this.getScales(this.data.data);
    this.regressData = this.getRegressData(scales);

    this.data_area.select("g.plot_brush").remove();

    this.updateScales(scales, false);
};

vq.ScatterPlot.prototype.removeListeners = function() {
    this.brush_layer
        .on("mousedown.zoom", null)
        .on("mousewheel.zoom", null)
        .on("mousemove.zoom", null)
        .on("DOMMouseScroll.zoom", null)
        .on("dblclick.zoom", null)
        .on("touchstart.zoom", null)
        .on("touchmove.zoom", null)
        .on("touchend.zoom", null);
};

vq.ScatterPlot.prototype.enableZoom = function() {
    var that = this;
    this.brush_layer.select('.extent').style('display','none'); 
    this.brush_layer.style('cursor','move');
    this.ignoreBrush = true;

    this.data_area.select("svg.symbols").selectAll("circle")
        .attr("class", "fg")
        .call(_.bind(this.setDefaultSymbolStyle, this));
    
    this.zoom = d3.behavior.zoom().x(this.xScale).y(this.yScale).on("zoom", function(){  
        _.bind(that.updateScales, that, {x: that.xScale, y: that.yScale}, true)();
        });
    
    this.brush_layer.call(this.zoom);
};

vq.ScatterPlot.prototype.disableZoom = function() {
    var that = this;
    this.ignoreBrush = false;
    this.brush.clear(); 
    this.brush_layer.style('cursor','crosshair').call(this.brush);

    this.brush_layer.select('.extent').style('display',null); 
    
    this.zoom.on("zoom", null);
    this.removeListeners();
};

vq.ScatterPlot.prototype.enableBrush = function() {

    this.ignoreBrush = false;
    this.brush.clear();

    this.brush
        .x(this.xScale)
        .y(this.yScale)
        .on("brushstart",_.bind(this.brushStart, this))
        .on("brush", _.bind(this.brushHandler, this))
        .on("brushend", _.bind(this.brushEnd, this));

    this.brush_layer.call(this.brush);
};

vq.ScatterPlot.prototype.brushStart = function() {
    if ( d3.event && !d3.event.sourceEvent.shiftKey) { //brush event
        this.data_area.select("svg.symbols").selectAll("circle").style('pointer-events','none');
        if ( this.brush.empty() ) this.disableZoom();   //brush has a zero area.. just started brushing
    } else {  //zoom event
        this.data_area.select("svg.symbols").selectAll("circle").style('pointer-events','all');
    }
    
};

vq.ScatterPlot.prototype.highlight = function(obj_props) {
     var dataObj = this.data;

    this.data_area.select("svg.symbols").selectAll("circle")
        .attr("class", "bg" )
        .style("fill", dataObj._unselectedStrokeStyle )
        .style("stroke", dataObj._unselectedStrokeStyle )
        .style("stroke-width", dataObj._strokeWidth)
        .style("opacity", 0.5);

    this.data_area.select("svg.symbols").selectAll("circle").filter( function(a) { 
        return _.every(obj_props, function(value, key) { return a[key] === value;});
            })
        .attr("class", "fg" )
        .style("fill",  dataObj._fillStyle )
        .style("stroke", dataObj._strokeStyle )
        .style("stroke-width", dataObj._strokeWidth )
        .style("opacity", 1.0);

};

vq.ScatterPlot.prototype.brushHandler = function() {
    if ( this.ignoreBrush ) { this.brush.clear(); return; }
    var that = this;
    var e = this.brush.extent();
    var dataObj = this.data;

    var brushed = function(d) {
        return e[0][0] <= d[that.x] && d[that.x] <= e[1][0] && e[0][1] <= d[that.y] && d[that.y] <= e[1][1];
    };
    var not_brushed = function(d) { return !brushed(d);};

    this.data_area.select("svg.symbols").selectAll("circle").filter(brushed)
        .attr("class", "fg" )
        .style("fill",  dataObj._fillStyle )
        .style("stroke", dataObj._strokeStyle )
        .style("stroke-width", dataObj._strokeWidth)
        .style("opacity", 1.0);

    this.data_area.select("svg.symbols").selectAll("circle").filter(not_brushed)
        .attr("class", "bg" )
        .style("fill", dataObj._unselectedStrokeStyle )
        .style("stroke", dataObj._unselectedStrokeStyle )
        .style("stroke-width", dataObj._strokeWidth)
        .style("opacity", 0.5);
};

vq.ScatterPlot.prototype.brushEnd = function() {

    var that = this;
    var e = this.brush.extent();
    var dataObj = this.data;
    var handler = dataObj._brushHandler;

     var brushed = function(d) {
        return e[0][0] <= d[that.x] && d[that.x] <= e[1][0] && e[0][1] <= d[that.y] && d[that.y] <= e[1][1];
    };

    if (this.brush.empty()) {
        this.data_area.select("svg.symbols").selectAll("circle")
            .attr("class", "fg")
            .call(_.bind(this.setDefaultSymbolStyle, this));

        this.data_area.select("g.plot_brush").html("");
    }
  
    handler(this.data_area.select("svg.symbols").selectAll("circle").filter(brushed).data());
       
    if ( !this.ignoreBrush && this.brush.empty() ) { this.enableZoom(); this.data_area.select("svg.symbols").selectAll("circle").style('pointer-events','all'); }
};

vq.models.ScatterPlotData = function(data) {
    vq.models.VisData.call(this, data);
    this.setDataModel();
    if (this.getDataType() == 'vq.models.ScatterPlotData') {
        this._build_data(this.getContents());
    } else {
        console.warn('Unrecognized JSON object. Expected vq.models.ScatterPlotData object.');
    }
};

vq.models.ScatterPlotData.prototype = vq.extend(vq.models.VisData);

vq.models.ScatterPlotData.prototype.setDataModel = function () {
    this._dataModel = [
        {label: '_plot.width', id: 'PLOT.width', cast : Number, defaultValue: 512},
        {label: '_plot.height', id: 'PLOT.height', cast : Number, defaultValue: 512},
        {label: '_plot.container', id:'PLOT.container', optional : true},
        {label: 'xTickDisplacement', id: 'PLOT.x_tick_displacement', cast : Number, defaultValue: 15},
        {label: 'yTickDisplacement', id: 'PLOT.y_tick_displacement', cast : Number, defaultValue: -10},
        {label: 'xLabelDisplacement', id: 'PLOT.x_label_displacement', cast : Number, defaultValue: 30},
        {label: 'yLabelDisplacement', id: 'PLOT.y_label_displacement', cast : Number, defaultValue: -50},
        {label:  'vertical_padding', id: 'PLOT.vertical_padding', cast : Number, defaultValue: 40},
        {label:  'horizontal_padding', id: 'PLOT.horizontal_padding',cast : Number,  defaultValue:60},
        {label: 'enableTransitions', id: 'PLOT.enable_transitions', cast : Boolean, defaultValue: false},
        {label: 'transitionDuration', id: 'PLOT.transition_duration', cast : Number, defaultValue: 1000.0},
        {label : 'data', id: 'data_array', defaultValue : [] },
        {label : 'COLUMNID.x', id: 'xcolumnid',cast : String, defaultValue : 'X'},
        {label : 'COLUMNID.y', id: 'ycolumnid',cast : String, defaultValue : 'Y'},
         {label : 'xScale', id: 'xscale', defaultValue : [], optional : true},
        {label : 'yScale', id: 'yscale', defaultValue : [], optional : true},
        {label : 'COLUMNID.value', id: 'valuecolumnid',cast : String, defaultValue : 'VALUE'},
        {label : 'COLUMNLABEL.x', id: 'xcolumnlabel',cast : String, defaultValue : ''},
        {label : 'COLUMNLABEL.y', id: 'ycolumnlabel',cast : String, defaultValue : ''},
        {label : 'COLUMNLABEL.value', id: 'valuecolumnlabel',cast : String, defaultValue : ''},
        {label : 'tooltipTimeout', id: 'tooltip_timeout', defaultValue : 200 },
        {label : 'tooltipItems', id: 'tooltip_items', defaultValue : {
            X : 'X', Y : 'Y', Value : 'VALUE'  }  },
        {label : 'tooltipLinks', id: 'tooltip_links', defaultValue : { }  },
        {label : '_fillStyle', id: 'fill_style',cast :vq.utils.VisUtils.wrapProperty,
            defaultValue : function() {
                return 'rgba(70,130,180,0.2)';
        }},
        {label : '_strokeStyle', id: 'stroke_style',
            cast :vq.utils.VisUtils.wrapProperty, defaultValue : function() {
            return 'steelblue';
        }},
        {label : '_unselectedStrokeStyle', id: 'unselected_stroke_style',
            cast :vq.utils.VisUtils.wrapProperty, defaultValue : function() {
            return 'lightgray';
        }},
        {label : '_strokeWidth', id: 'stroke_width',cast :vq.utils.VisUtils.wrapProperty, defaultValue : function() {
            return 2;
        }},
        {label : '_regressionStrokeStyle', id: 'regression_stroke_style',
            cast :vq.utils.VisUtils.wrapProperty, defaultValue : function() {
            return 'green';
        }},
        {label : '_radius', id: 'radius',cast :vq.utils.VisUtils.wrapProperty, defaultValue : function() {
            return 2;
        }},
        {label : '_shape', id: 'shape',cast : vq.utils.VisUtils.wrapProperty, defaultValue : function() {
            return 'dot';
        }},
        {label : '_regression', id: 'regression',cast :String, defaultValue : 'none'},
        {label : '_notifier', id: 'notifier', cast : Function, defaultValue : function() {
            return null;
        }},
        {label : '_brushHandler', id: 'brush_handler', cast : Function, defaultValue : function() {
             return null;
        }},
         {label : '_clickHandler', id: 'click_handler', cast : Function, defaultValue : function() {
             return null;
        }}
    ];
};

vq.models.ScatterPlotData.prototype._build_data = function(data) {
    this._processData(data);

    if (this.COLUMNLABEL.x == '') this.COLUMNLABEL.x = this.COLUMNID.x;
    if (this.COLUMNLABEL.y == '') this.COLUMNLABEL.y = this.COLUMNID.y;
    if (this.COLUMNLABEL.value == '') this.COLUMNLABEL.value = this.COLUMNID.value;

    if (this.data.length > 0) this.setDataReady(true);
};
(function($) {
    var methods = {
      init : function( options ) {
          return this.each(function() {
              var $this = $(this);
              var vis = $(this).data("visquick.d3.scatterplot");
              if (!vis) {
                  options.CONTENTS.PLOT.container = $this.get(0);
                  $this.data("visquick.d3.scatterplot", (vis = new vq.ScatterPlot()));
                  vis.draw(options);
              }
          });
      },
      reset_data : function(data_array) {
          return this.each(function() {
              var vis = $(this).data("visquick.d3.scatterplot");
              if (vis) {
                  vis.resetData(data_array);
              }
          });
      },
      enable_zoom : function() {
          return this.each(function() {
              var vis = $(this).data("visquick.d3.scatterplot");
              if (vis) {
                  vis.enableZoom();
              }
          });
      },
      enable_brush : function() {
          return this.each(function() {
              var vis = $(this).data("visquick.d3.scatterplot");
              if (vis) {
                  vis.enableBrush();
              }
          });
      }
    };

    $.fn.scatterplot = function( method ) {
      // Method calling logic
      if ( methods[method] ){
          return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
      }
      else if ( typeof method === 'object' || ! method ) {
          return methods.init.apply( this, arguments );
      }
      else {
          $.error( 'Method ' +  method + ' does not exist on jQuery.scatterplot' );
      }
    };
})(window.jQuery);
