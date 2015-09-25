/** @namespace Top-level namespace, vq **/
(function (root, factory) {
   if (typeof exports === 'object' && root.require) {
     module.exports = factory(require("underscore"), require("d3"), require("jquery"), require("vq"));
   } else if (typeof define === "function" && define.amd) {
      // AMD. Register as an anonymous module.
      define(["underscore","d3", "jquery", "vq"], function(_, d3, $, vq) {
        // Use global variables if the locals are undefined.
        return factory(_ || root._, d3 || root.d3, $ || root.$, vq || root.vq);
      });
   } else {
      // RequireJS isn't being used. Assume underscore and d3 are loaded in <script> tags
      factory(_, d3, $, vq);
   }
}(this, function(_, d3, $, vq) {
//circvis.wedge.js


// vq.CircVis = function() {
//     vq.Vis.call(this);
// };
// vq.CircVis.prototype = vq.extend(vq.Vis);

var CircVis = function(data) {
  var chromoData = new vq.models.CircVisData(data);

  var circvis = function() {

    if (chromoData.isDataReady()) {
        _render();
    } else {
        console.warn('Invalid data input.  Check data for missing or improperly formatted values.');
    }
    return this;
};

   var _render = function() {

    var width = chromoData._plot.width, 
       height = chromoData._plot.height;

    function dragmove(d,u) {
        var transform = d3.transform(d3.select(this).attr('transform'));
        var translate = transform.translate;
        var scale = transform.scale;
        var rotation = transform.rotate;
        var actual_width = (width / 2 * scale[0]), actual_height = (height / 2 * scale[1]);
        var p = [d3.event.x - actual_width, d3.event.y -actual_height];
        var q = [d3.event.x - d3.event.dx - actual_width, d3.event.y - d3.event.dy - actual_height];
        function cross(a, b) { return a[0] * b[1] - a[1] * b[0]; }
        function dot(a, b) { return a[0] * b[0] + a[1] * b[1]; }
        var angle = Math.atan2(cross(q,p),dot(q,p)) * 180 / Math.PI;
        rotation += angle;
        d3.select(this).attr('transform','translate(' + translate[0] + ',' + translate[1] + ')scale(' + scale + ')rotate(' + rotation + ')');
    }

    function dragstart(d,u) {}
    function dragend(d,u) {}

    var drag = d3.behavior.drag()
        .on("dragstart", dragstart)
        .on("drag", dragmove)
        .on("dragend", dragend);

    var id = chromoData._plot.id;

    var svg = d3.select(chromoData._plot.container)        
        .append('svg:svg')
        .attr('id', id)
        .attr('width', width)
        .attr('height', height)
        .append('svg:g')
        .attr('class', 'circvis')
        .attr("transform", 'translate(' + width / 2 + ',' + height / 2 + ')')
        .call(drag);

        svg.insert('svg:defs');

    var ideograms = svg.selectAll('g.ideogram')
        .data(chromoData._chrom.keys)
        .enter().append('svg:g')
            .attr('class','ideogram')
            .attr('data-region',function(d) { return d;})
            .attr('opacity',1.0)
            .attr('transform',function(key) { return 'rotate(' + chromoData._chrom.groups[key].startAngle * 180 / Math.PI + ')';})
            .each(draw_ideogram);
//calculate label placement as halfway along tick radial segment
    var outerRadius  = (chromoData._plot.height / 2);
    var outerTickRadius = outerRadius - chromoData.ticks.outer_padding;
    var innerRadius = outerTickRadius - chromoData.ticks.height;
    var label_height = (outerTickRadius + innerRadius) / 2;

           ideograms.append('text')
            .attr('transform',function(key) { return 'rotate(' + (chromoData._chrom.groups[key].endAngle - chromoData._chrom.groups[key].startAngle)
                   * 180 / Math.PI / 2 +
                   ' )translate(0,-'+label_height+')';})
             .attr('class','region_label')
                           .attr('stroke','black')
                           .attr('text-anchor','middle')
                            .attr('dy','.35em')
               .attr('cursor','pointer')
            .text(function(f) { return f;})
               .each(function() { $(this).disableSelection();})
            .on('mouseover',function ideogram_label_click(obj){
                   var half_arc_genome = {};
                   var region_length = chromoData.normalizedLength[obj];
                   var new_length = 1.0 - region_length;
                   var num_regions = _.size(chromoData.normalizedLength);
                   _.each(chromoData.normalizedLength,function(value,key,list){
                        half_arc_genome[key] = value / new_length / 2;
                   });
                   half_arc_genome[obj] = 0.5;
               });
    if(!_.isNull(chromoData._chrom.radial_grid_line_width)&&
                chromoData._chrom.radial_grid_line_width > 0) {

        var network_radius = chromoData._network.network_radius;
                ideograms.selectAll('path.radial_lines')
                    .data(function(chr) {
                        return [[{x:0,y:-1*outerTickRadius},{x:0,y:-1*network_radius[chr]}]];
                    })
                    .enter().insert('svg:path','.wedges')
                    .attr('class','radial_lines')
                    .attr('d',d3.svg.line()
                    .x(function(point) {return point.x;})
                    .y(function(point) {return point.y;})
                    .interpolate('linear')
                    );
   }

     
    if (chromoData._network._doRender) {
           _drawNetworkLinks(svg.insert('svg:g','.ideogram').attr('class','links'));
    }
    _(_.range(0,chromoData._wedge.length)).each(function(ring_index) {
        _draw_axes_ticklabels(ring_index);
        _insertRingClipping(ring_index);
    });

    return this;

};

var draw_ideogram = function(d) {
        _add_wedge(d);
        draw_ideogram_data(d);
};

var draw_ideogram_data = function(d) {
      if (chromoData._chrom.groups[d] === undefined) { return;}
        _(_.range(0,chromoData._wedge.length)).each(function(ring) {
          _drawWedgeData(d,ring);
        });
            _drawTicks( d);
          if ( chromoData._network._doRender) {
             _drawNetworkNodes( d);
          }
};

function _drawWedgeContents (chr, wedge_index) {
    
    var ideogram = chromoData._ideograms[chr];
    var wedge_obj = d3.select('.ideogram[data-region="'+chr+'"] .wedge[data-ring="'+wedge_index+'"]');
    var wedge_params = chromoData._wedge[wedge_index];
    switch (wedge_params._plot_type) {
        case('karyotype'):
        case('tile'):
        case('band'):
        case('heatmap'):
        case('glyph'):
            _drawWedgeData(chr, wedge_index);
            break;
        default:
            _drawWedge_withRange(chr, wedge_index);
    }
};

function _insertRingClipping (index) {
    var outerRadius =  chromoData._wedge[index]._outerRadius,
    innerRadius = chromoData._wedge[index]._innerRadius;

    var arc = d3.svg.arc()({innerRadius:innerRadius,outerRadius:outerRadius, startAngle:0,endAngle:2*Math.PI});

    d3.select('svg .circvis defs').append('svg:clipPath')
        .attr('id','ring_clip_'+index)
        .append('svg:path')
        .attr('d',arc);
};

/**private **/
 function _add_wedge (chr) {
    
    var ideogram_obj = d3.select('.ideogram[data-region="'+chr+'"]');

    function outerRadius(index) {
        return chromoData._wedge[index]._outerPlotRadius;
    }

    function innerRadius(index) {
        return chromoData._wedge[index]._innerRadius;
    }

    var wedge_obj = ideogram_obj.append("svg:g")
        .attr('class','wedges')
        .selectAll("path")
        .data(_.range(0,chromoData._wedge.length))
        .enter()
        .append("svg:g")
        .attr("class",  "wedge")
        .attr("clip-path",function(index) { return "url(#ring_clip_" + index + ")";})
        .attr('data-ring',function(index) { return index;});

    wedge_obj
        .append("svg:path")
        .attr('class', 'background')
        .attr("d",d3.svg.arc()
        .innerRadius(  function(ring_index) { return innerRadius(ring_index); })
        .outerRadius( function(ring_index) { return outerRadius(ring_index);} )
        .startAngle(0)
        .endAngle( chromoData._chrom.groups[chr].angle)
    );


    wedge_obj.append("svg:g")
        .attr('class','data');

    ideogram_obj.selectAll("g.wedge")
        .each(checkAndPlot);

    function checkAndPlot(wedge_index) {
        var wedge_obj = d3.select(this);
        var wedge_params = chromoData._wedge[wedge_index];
        if ((wedge_params._plot_type != 'karyotype') &&
            (wedge_params._plot_type != 'tile') &&
            (wedge_params._plot_type != 'band') &&
            (wedge_params._plot_type != 'glyph')) {
            if (isNaN(wedge_params._min_plotValue) || isNaN(wedge_params._max_plotValue)) {
                console.warn('Range of values for ring with index (' + wedge_index + ') not detected.  Data has not been plotted.');
                return;
            }
            else if (wedge_params._min_plotValue == wedge_params._max_plotValue) {
                wedge_params._min_plotValue = wedge_params._min_plotValue - 1;
                wedge_params._max_plotValue = wedge_params._max_plotValue + 1;
                console.warn('Invalid value range detected.  Range reset to [-1,1].');
            }
        }
        _drawWedgeContents(chr, wedge_index);
    }
};


function _drawWedge_withoutRange ( chr, wedge_index) {
    
    var ideogram = chromoData._ideograms[chr];
    var wedge_params = chromoData._wedge[wedge_index];
    var wedge = ideogram.wedge[wedge_index];
};

function _drawWedge_withRange (chr, wedge_index) {
        
    var ideogram = chromoData._ideograms[chr];
    var wedge_params = chromoData._wedge[wedge_index];
    var wedge = ideogram.wedge[wedge_index];
    var wedge_obj = d3.select('.ideogram[data-region="'+chr+'"] .wedge[data-ring="'+wedge_index+'"]');

    if (wedge_params._draw_axes) {
        /* Circular grid lines. */
        //add a new panel each time we want to draw on top of the previously created image.
        var p = chromoData._chrom.groups[chr];
        var startAngle = p.startAngle;
        var endAngle = p.angle;

        // generate ticks for y_axis
        var radii = wedge_params._y_linear.ticks(4);
          wedge_obj.append("svg:g")
            .attr('class','axes')
            .selectAll("path")
            .data(radii)
            .enter().append("svg:path")
            .style("fill", "#ddd")
            .style("stroke", "#555")
            .style('stroke-width', '1.0px')
            .attr('d',d3.svg.arc()
                .innerRadius(function(d) { return wedge_params._y_linear(d);})
                .outerRadius(function(d) { return wedge_params._y_linear(d);})
                .startAngle(0)
                .endAngle(endAngle)
        ); 
    }


    _drawWedgeData(chr, wedge_index);

};

function _drawWedgeData (chr, wedge_index) {
    var that = this;

    //draw all wedges if parameter is left out.
    var all_wedges = _.isUndefined(wedge_index) || _.isNull(wedge_index);
    //return if ill-defined wedge
    if (!all_wedges && _.isNumber(wedge_index) && _.isFinite(wedge_index) &&
        wedge_index >= chromoData._wedge.length) {
        console.error('drawWedgeData: Invalid wedge #:' + wedge_index);
        return;
    }

    function drawWedge(index) {
        var wedge_params = chromoData._wedge[index];

        var funcName =  wedge_params._plot_type;
        if (_drawWedgeData_array[funcName] !==undefined) {
            _drawWedgeData_array[funcName](chr,index);
        }
        //get all the data points in this wedge
        var data = d3.selectAll('.ideogram[data-region="'+chr+'"] .wedge[data-ring="'+index+'"] .data > *');
        //set listener
        data.on('mouseover',function(d) { wedge_params.hovercard.call(this,d);});
    }

    if (all_wedges) {
        _.each(_.range(0,chromoData._wedge.length),function(i) { drawWedge.call(that,i);});
        return;
    }
    else {
        drawWedge.call(that,wedge_index);
    }

};

var _drawWedgeData_array = {
    'barchart' : function (chr, wedge_index) {
    
    var wedge_params = chromoData._wedge[wedge_index];
    var wedge_data = chromoData._ideograms[chr].wedge[wedge_index] || [];
    var value_key = wedge_params._value_key;
    var wedge_obj = d3.select('.ideogram[data-region="'+chr+'"] .wedge[data-ring="'+wedge_index+'"]');

    var histogramArc = function (point) {
        var _inner = wedge_params._innerRadius;
        var start = chromoData._ideograms[chr].theta(point.start);
        var end = chromoData._ideograms[chr].theta(point.end);
        return d3.svg.arc()
            .innerRadius( _inner)
            .startAngle( start)
            .endAngle(end);
    };

    var hist = wedge_obj.select('g.data')
        .selectAll("path")
        .data(wedge_data,wedge_params._hash);
    hist
        .enter().append('svg:path')
        .style('fill',wedge_params._fillStyle)
        .style('stroke',wedge_params._strokeStyle)
        .style('stroke-width',wedge_params._lineWidth)
        .style('fill-opacity',1e-6)
        .style('stroke-opacity',1e-6)
        .transition()
        
        .duration(800)
        .attrTween('d',function(a) {
            var i =d3.interpolate({outerRadius:wedge_params._innerRadius},{outerRadius:wedge_params._thresholded_outerRadius(a[value_key])});
            var arc = histogramArc(a);
            return function(t) {return arc(i(t));};
        })
        .style('fill-opacity', 1.0)
        .style('stroke-opacity', 1.0);

    hist.exit()
        .transition()
        .duration(800)
        .attrTween('d',function(a) {
            var i =d3.interpolate({outerRadius:wedge_params._thresholded_outerRadius(a[value_key])},{outerRadius:wedge_params._innerRadius});
            var arc = histogramArc(a);
            return function(t) {return arc(i(t));};
        })
        .style('fill-opacity',1e-6)
        .style('stroke-opacity',1e-6)
        .remove();
},

 'scatterplot' : function (chr, wedge_index) {
    
    var wedge_params = chromoData._wedge[wedge_index];
    var wedge_data = chromoData._ideograms[chr].wedge[wedge_index] || [];
    var value_key = wedge_params._value_key;
    var center = vq.utils.VisUtils.tileCenter;
    var wedge_obj = d3.select('.ideogram[data-region="'+chr+'"] .wedge[data-ring="'+wedge_index+'"]');

    var scatter = wedge_obj.select('g.data')
        .selectAll("path")
        .data(wedge_data,wedge_params._hash);
    scatter
        .enter().append('svg:path')
        .style('fill',wedge_params._fillStyle)
        .style('stroke',wedge_params._strokeStyle)
        .style('fill-opacity', 1e-6)
        .style('stroke-opacity', 1e-6)
        .attr("transform",function(point) {
            return "rotate(" + ((chromoData._ideograms[chr].theta(center(point)) * 180 / Math.PI) - 90)+ ")translate(" +
                wedge_params._thresholded_value_to_radius(point[value_key]) + ")";} )
        .attr('d',d3.svg.symbol()
            .type(wedge_params._shape)
            .size(Math.pow(wedge_params._radius(),2)) )
        .transition()
        .duration(800)
        .style('fill-opacity', 1)
        .style('stroke-opacity', 1);

    scatter.exit()
        .transition()
        .duration(800)
        .style('fill-opacity', 1e-6)
        .style('stroke-opacity', 1e-6)
        .remove();
},

 'line' : function(chr, wedge_index) {
    
    var wedge_params = chromoData._wedge[wedge_index];
    var wedge_data = _.sortBy(chromoData._ideograms[chr].wedge[wedge_index],'start');
    var value_key = wedge_params._value_key;
    var center = vq.utils.VisUtils.tileCenter;
    var wedge_obj = d3.select('.ideogram[data-region="'+chr+'"] .wedge[data-ring="'+wedge_index+'"]');

    var line = d3.svg.line.radial()
            .interpolate('basis')
            .tension(0.8)
            .radius(function(point) { return wedge_params._thresholded_value_to_radius(point[value_key]);})
            .angle(function(point) { return chromoData._ideograms[chr].theta(center(point));});

    var line_plot = wedge_obj.select('g.data')
        .selectAll("path")
        .data([wedge_data]);
    line_plot
        .enter().append('svg:path')
        .style('fill',wedge_params._fillStyle)
        .style('stroke',wedge_params._strokeStyle)
        .style('fill-opacity', 1e-6) //leave opacity at 0
        .style('stroke-opacity', 1e-6)
        .attr('d',line)
        .transition()
        .duration(800)
        .style('stroke-opacity', 1);

    line_plot.exit()
        .transition()
        .duration(800)
        .style('fill-opacity', 1e-6)
        .style('stroke-opacity', 1e-6)
        .remove();
},

 'area' : function (chr, wedge_index) {
    
    var wedge_params = chromoData._wedge[wedge_index];
    var wedge_data = _.sortBy(chromoData._ideograms[chr].wedge[wedge_index],'start');
    var value_key = wedge_params._value_key;
    var center = vq.utils.VisUtils.tileCenter;
    var wedge_obj = d3.select('.ideogram[data-region="'+chr+'"] .wedge[data-ring="'+wedge_index+'"]');

    var line = d3.svg.line.radial()
            .interpolate('basis')
            .tension(0.8)
            .radius(function(point) { return wedge_params._thresholded_value_to_radius(point[value_key]);})
            .angle(function(point) { return chromoData._ideograms[chr].theta(center(point));});


    var area = d3.svg.area.radial()
            .interpolate('basis')
            .tension(0.8)
            .innerRadius(function(point) { return  wedge_params._thresholded_innerRadius(point[value_key]);})
            .outerRadius(function(point) { return wedge_params._thresholded_outerRadius(point[value_key]);})
            .angle(function(point) { return chromoData._ideograms[chr].theta(center(point));});


    var line_plot = wedge_obj.select('g.data')
        .selectAll("path")
        .data([wedge_data]);
    line_plot
        .enter().append('svg:path')
        .style('fill',wedge_params._fillStyle)
        .style('stroke',wedge_params._strokeStyle)
        .style('fill-opacity', 1e-6) //leave opacity at 0
        .style('stroke-opacity', 1e-6)
        .attr('d',line)
        .transition()
        .duration(800)
        .style('stroke-opacity', 1);

        line_plot
        .enter().append('svg:path')
        .style('fill',wedge_params._fillStyle)
        .style('stroke',wedge_params._strokeStyle)
        .style('fill-opacity', 1e-6) 
        .style('stroke-opacity', 1e-6)//leave opacity at 0
        .attr('d',area)
        .transition()
        .duration(800)
        .style('fill-opacity', 0.7);

    line_plot.exit()
        .transition()
        .duration(800)
        .style('fill-opacity', 1e-6)
        .style('stroke-opacity', 1e-6)
        .remove();
}, 

'band' : function (chr, wedge_index) {
    
    var wedge_params = chromoData._wedge[wedge_index];
    var wedge_data = chromoData._ideograms[chr].wedge[wedge_index] || [];
    var value_key = wedge_params._value_key;

    var wedge_obj = d3.select('.ideogram[data-region="'+chr+'"] .wedge[data-ring="'+wedge_index+'"]');
    var band = wedge_obj.select('g.data')
        .selectAll("path")
        .data(wedge_data,wedge_params._hash);
    band
        .enter().append('svg:path')
        .style('fill',wedge_params._fillStyle)
        .style('stroke',wedge_params._strokeStyle)
        .style('fill-opacity', 1e-6)
        .style('stroke-opacity', 1e-6)
        .attr('d',d3.svg.arc()
        .innerRadius( wedge_params._innerRadius)
        .outerRadius( wedge_params._outerPlotRadius)
        .startAngle(function(point) { return chromoData._ideograms[chr].theta(point.start);})
        .endAngle(function(point) { return chromoData._ideograms[chr].theta(point.end);})
    )
        .transition()
        
        .duration(800)
        .style('fill-opacity', 1)
        .style('stroke-opacity', 1);

    band
        .exit()
        .transition()
        
        .duration(800)
        .style('fill-opacity', 1e-6)
        .style('stroke-opacity', 1e-6)
        .remove();
},

 'glyph' : function (chr, wedge_index) {
    var center = vq.utils.VisUtils.tileCenter;
    var wedge_params = chromoData._wedge[wedge_index];
    var wedge_data = chromoData._ideograms[chr].wedge[wedge_index] || [];
    var value_key = wedge_params._value_key;
    var wedge_obj = d3.select('.ideogram[data-region="'+chr+'"] .wedge[data-ring="'+wedge_index+'"]');

    var glyph = wedge_obj.select('g.data')
        .selectAll("path")
        .data(wedge_data,wedge_params._hash);
    glyph
        .enter().append('svg:path')
        .style('fill',wedge_params._fillStyle)
        .style('stroke',wedge_params._strokeStyle)
        .style('fill-opacity', 1e-6)
                .style('stroke-opacity', 1e-6)
        .attr("transform",function(point) {
            return "rotate(" + ((chromoData._ideograms[chr].theta(center(point)) * 180 / Math.PI) - 90)+ ")translate(" +
                wedge_params._glyph_distance(point) + ")";} )
        .transition()
        
        .duration(800)
        .attr('d',d3.svg.symbol()
        .type(wedge_params._shape)
        .size(Math.pow(wedge_params._radius(),2))
    )
        .transition()
        
        .duration(800)
        .style('fill-opacity', 1)
        .style('stroke-opacity', 1);
    glyph.exit()
        .transition()
        .duration(800)
        .style('fill-opacity', 1e-6)
                .style('stroke-opacity', 1e-6)
        .remove();        
},

 'tile' : function(chr, wedge_index) {
    
    var wedge_params = chromoData._wedge[wedge_index];
    var wedge_data = chromoData._ideograms[chr].wedge[wedge_index] || [];
    var value_key = wedge_params._value_key;
    var wedge_obj = d3.select('.ideogram[data-region="'+chr+'"] .wedge[data-ring="'+wedge_index+'"]');

    var tile = wedge_obj.select('g.data')
        .selectAll("path")
        .data(wedge_data,wedge_params._hash);
    tile
        .enter().append('svg:path')
        .style('fill',wedge_params._fillStyle)
        .style('stroke',wedge_params._strokeStyle)
        .style('fill-opacity', 1e-6)
                .style('stroke-opacity', 1e-6)
        .attr('d',d3.svg.arc()
        .innerRadius( function(point) { return wedge_params._thresholded_tile_innerRadius(point,wedge_params);})
        .outerRadius( function(point) { return wedge_params._thresholded_tile_outerRadius(point,wedge_params);})
        .startAngle(function(point) { return chromoData._ideograms[chr].theta(point.start);})
        .endAngle(function(point) { return chromoData._ideograms[chr].theta(point.end);})
    ) .transition()
        
        .duration(800)
        .style('fill-opacity', 1)
        .style('stroke-opacity', 1);

    tile.exit()
        .transition()
        .duration(800)
        .style('fill-opacity', 1e-6)
                .style('stroke-opacity', 1e-6)
        .remove();
},

 'karyotype' : function (chr, wedge_index) {
    
    var wedge_params = chromoData._wedge[wedge_index];
    var wedge_data = chromoData._ideograms[chr].wedge[wedge_index] || [];
    var value_key = wedge_params._value_key;
    var wedge_obj = d3.select('.ideogram[data-region="'+chr+'"] .wedge[data-ring="'+wedge_index+'"]');
    var karyotype = wedge_obj.select('g.data')
        .selectAll("path")
        .data(wedge_data,wedge_params._hash);
    karyotype
        .enter().append('svg:path')
        .style('fill',function(point) { return point[value_key];})
        .style('stroke',wedge_params._strokeStyle)
        .style('fill-opacity', 1e-6)
                .style('stroke-opacity', 1e-6)
        .attr('d',d3.svg.arc()
        .innerRadius( wedge_params._innerRadius)
        .outerRadius( wedge_params._outerPlotRadius)
        .startAngle(function(point) { return chromoData._ideograms[chr].theta(point.start);})
        .endAngle(function(point) { return chromoData._ideograms[chr].theta(point.end);})
    )
        .transition()     
        .duration(800)
        .style('fill-opacity', 1)
        .style('stroke-opacity', 1);

    karyotype.exit()
        .transition()
        .duration(800)
        .style('fill-opacity', 1e-6)
                .style('stroke-opacity', 1e-6)
        .remove();
},

 'heatmap' : function (chr, wedge_index) {
    
    var wedge_params = chromoData._wedge[wedge_index];
    var wedge_data = chromoData._ideograms[chr].wedge[wedge_index] || [];
    var value_key = wedge_params._value_key;
    var wedge_obj = d3.select('.ideogram[data-region="'+chr+'"] .wedge[data-ring="'+wedge_index+'"]');

    var generateArcTween = function (point) {
        var _theta = chromoData._ideograms[chr].theta(point.start);
        var _end = chromoData._ideograms[chr].theta(point.end);
        return d3.svg.arc()
            .innerRadius(function(multiplier) { return wedge_params._innerRadius - (multiplier *4);})
            .outerRadius(function(multiplier) { return wedge_params._outerPlotRadius + (multiplier * 4);})
            .startAngle(function(multiplier) { return _theta -  (multiplier * Math.PI / 360);})
            .endAngle(function(multiplier) {  return _end + (multiplier * Math.PI /  360);});
    };

    var heat = wedge_obj.select('g.data')
        .selectAll("path")
        .data(wedge_data,wedge_params._hash);
    heat
        .enter().append('svg:path')
        .style('fill',wedge_params._fillStyle)
        .style('stroke',wedge_params._strokeStyle)
        .style('stroke-width','1px')
        .style('fill-opacity', 1e-6)
                .style('stroke-opacity', 1e-6)
        .attr('d',d3.svg.arc()
        .innerRadius( wedge_params._innerRadius)
        .outerRadius( wedge_params._outerPlotRadius)
        .startAngle(function(point) { return chromoData._ideograms[chr].theta(point.start);})
        .endAngle(function(point) { return chromoData._ideograms[chr].theta(point.end);})
    )
        .transition()
        
        .duration(800)
        .transition()
        
        .duration(800)
        .style('fill-opacity', 1)
        .style('stroke-opacity', 1)
        .attrTween('d',function(a) {
            var i =d3.interpolate(4,0);
            var arc = generateArcTween(a);
            return function(t) {return arc(i(t));};
        });

    heat.exit()
        .transition()
        .duration(800)
        .style('fill-opacity', 1e-6)
                .style('stroke-opacity', 1e-6)
        .remove();

}
};

_drawWedgeData_array['histogram'] = _drawWedgeData_array['barchart'];

function _draw_axes_ticklabels (wedge_index) {
    
    
    var wedge_params = chromoData._wedge[wedge_index];
    //don't do this for ring without a range.
    if(!_.isFunction(wedge_params._y_linear)) { return;}

    if (wedge_params._draw_axes) {
        /* Circular grid lines. */

        // generate ticks for y_axis
        var radii = wedge_params._y_linear.ticks(4);

        d3.select('.ideogram .wedge[data-ring="'+wedge_index+'"] .axes')
            .append("svg:g")
            .attr('class','labels')
            .selectAll('g.text')
            .data(radii)
            .enter().append("svg:text")
            .each(function() {$(this).disableSelection();})
            .attr('transform',function(r) {return 'translate(0,-'+wedge_params._y_linear(r) +')';})
            .text(function(a) { return a;});
    }

};

/** private **/
var _drawTicks = function(chr) {
    var that = this;

    if(!chromoData.ticks.render_ticks) { return;}
    var hash = chromoData._data.hash;
    var ideogram_obj = d3.select('.ideogram[data-region="'+chr+'"]');
    var level = function(node) {return chromoData.ticks._layout[hash(node)]; }
    var outerRadius  = (chromoData._plot.height / 2);
    var outerTickRadius = outerRadius - chromoData.ticks.outer_padding;
    var innerRadius = outerTickRadius - chromoData.ticks.height;
    var inner = chromoData.ticks.tile_ticks ?  function(feature) {
        return innerRadius +
            (level(feature) * (chromoData.ticks.wedge_height * 1.3)) ;} :
        function(feature) { return innerRadius;};

    var outer = function(feature) { return inner(feature) + chromoData.ticks.wedge_height;};
    var tick_fill = function(c) { return chromoData.ticks.fill_style(c,hash);};
    var tick_stroke = function(c) { return chromoData.ticks.stroke_style(c,hash);};
    var tick_angle = function(tick) { var angle = tick_length / inner(tick); return  isNodeActive(tick) ? angle * 2 : angle; };
    var isNodeActive = function(c) { return true;};

    var tick_width = Math.PI / 180 * chromoData.ticks.wedge_width;
    var tick_length = tick_width * innerRadius;
    var center = vq.utils.VisUtils.tileCenter;

    var generateArcTween = function (point) {
        var _inner = inner(point);
        var _outer = outer(point);
        var _theta = chromoData._ideograms[point.chr].theta(center(point));
        var _tick_angle = tick_angle(point);
        return d3.svg.arc()
            .innerRadius(function(multiplier) { return _inner - (multiplier *4);})
            .outerRadius(function(multiplier) { return _outer + (multiplier * 4);})
            .startAngle(function(multiplier) { return _theta -  (multiplier * Math.PI / 360);})
            .endAngle(function(multiplier) {
                return _theta + _tick_angle + (multiplier * Math.PI /  360);});
    };

    var tick_key = chromoData._network.node_key;

    if(ideogram_obj.select('g.ticks').empty()) {
        ideogram_obj
            .append('svg:g')
            .attr('class','ticks');
    }

    var ticks = ideogram_obj.select('g.ticks').selectAll('path')
        .data(chromoData._data.chr[chr],chromoData._data.hash);

    ticks.enter().append('path')
        .attr('class',function(tick) { return tick[hash];})
        .style('fill',tick_fill)
        .style('stroke',tick_stroke)
        .style('fill-opacity', 1e-6)
                .style('stroke-opacity', 1e-6)
        .on('mouseover',function(d){
            d3.select('text[data-label=\''+d[hash]+'\']').attr('visibility','visible');
            chromoData.ticks.hovercard.call(this,d);
        })
        .on('mouseout',function(d){
            d3.select('text[data-label=\''+d[hash]+'\']').attr('visibility','hidden');
        })
        .transition()
        .duration(800)
        .attrTween('d',function(a) {
            var i =d3.interpolate(4,0);
            var arc = generateArcTween(a);
            return function(t) {return arc(i(t));};
        })
        .style('fill-opacity', 1)
        .style('stroke-opacity', 1);

    ticks.exit()
        .transition()
        .duration(800)
        .attrTween('d',function(a) {
            var i =d3.interpolate(0,4);
            var arc = generateArcTween(a);
            return function(t) {return arc(i(t));};
        })
        .style('fill-opacity', 1e-6)
                .style('stroke-opacity', 1e-6)
        .remove()
        .each("end",remove_tick_layout);
};

var remove_tick_layout = function(node) {
    delete chromoData.ticks._layout[chromoData._data.hash(node)];
};

/** private **/
var _drawNetworkNodes = function (chr) {

    var hash = chromoData._data.hash;
    var level = function(node) { return chromoData._network.layout[hash(node)];};
    var center = vq.utils.VisUtils.tileCenter;
    var network_radius = chromoData._network.tile_nodes ? function(node) { return chromoData._network.network_radius[chr] - (level(node) * 2 * chromoData._network.node_radius(node)); } :
    function(node) { return chromoData._network.network_radius[chr];};

    var ideogram_obj = d3.select('.ideogram[data-region="'+chr+'"]');

    if(ideogram_obj.select('g.nodes').empty()) {
        ideogram_obj.append('svg:g').attr('class','nodes');
    }
    
    var node = ideogram_obj
        .select('g.nodes')
        .selectAll('circle.node')
        .data(_.where(chromoData._data.features,{chr:chr}),hash);

    var node_enter = node.enter(),
        node_exit = node.exit();

    node_enter.append('svg:circle')
        .attr('class','node')
        .attr('cx',0)
        .attr('cy',0)
        .attr('r',function(a) { return chromoData._network.node_radius(a)*4; })
        .style('fill',chromoData._network.node_fillStyle)
        .style('stroke',chromoData._network.node_strokeStyle)
        .style('fill-opacity',1e-6)
        .style('stroke-opacity',1e-6)
        .attr('transform', function(node) {
            return 'rotate('+ ((chromoData._ideograms[chr].theta(center(node)) / Math.PI * 180) - 90) +')translate(' + network_radius(node) + ')';
        })
        .on('mouseover',function(d){chromoData._network.node_hovercard.call(this,d);})
        .transition()
        .duration(800)
        .attr('r',chromoData._network.node_radius)
        .style('stroke-opacity',1)
        .style('fill-opacity',1);

    node_exit
    .transition()
        .duration(800)
        .attr('r',function(a) {return chromoData._network.node_radius(a)*4; })
        .style('fill-opacity',1e-6)
                .style('stroke-opacity',1e-6)
       .remove();
       // .each("end",remove_node_layout);
};


var remove_node_layout = function(node) {
    delete chromoData._network.layout[chromoData._data.hash(node)];
};

var _drawNetworkLinks= function() {

    var hash = chromoData._data.hash;
    var center = vq.utils.VisUtils.tileCenter;
    var level = function(node) { return chromoData._network.layout[hash(node)];};
    var bundle = d3.layout.bundle();

    var network_radius = chromoData._network.tile_nodes ? function(node) { return chromoData._network.network_radius[node.chr] - (level(node) * 2 * chromoData._network.node_radius(node)); } :
        function(node) { return chromoData._network.network_radius[node.chr];};

    var line = d3.svg.line.radial()
        .interpolate("bundle")
        .tension(.65)
        .radius(function(d) { return d.radius !== undefined ?
            d.radius :
            network_radius(d);
        })
        .angle(function(d) { return d.angle !== undefined ?
            d.angle :
            chromoData._ideograms[d.chr]._feature_angle(center(d));
        });

    var new_data = bundle(chromoData._network.links_array).map(function(b, index) { return _.extend(chromoData._network.links_array[index],{spline:b});});

    var edges = d3.select('g.links').selectAll("path.link")
        .data(new_data);

        edges
        .enter().insert("svg:path")
        .attr("class", function(d) {
            return "link t_" + d.source.chr + " p_"+ d.target.chr;
        })

        .style('fill','none')
        .style('stroke',chromoData._network.link_strokeStyle)
        .style('stroke-width',function(a) { return chromoData._network.link_line_width(a) * 3;})
        .style('stroke-opacity',1e-6)
        .attr("d", function(link) { return line(link.spline);})
        .on('mouseover',function(d){
            d3.select(this).style('stroke-opacity',1.0); chromoData._network.link_hovercard.call(this,d);
        })
        .on('mouseout',function(d){d3.select(this).style('stroke-opacity',chromoData._network.link_alpha(d));})
        .transition()
        .duration(800)
        .style('stroke-width',chromoData._network.link_line_width)
        .style('stroke-opacity',chromoData._network.link_alpha);

        edges.exit()
        .transition()
        .duration(800)
         .style('stroke-opacity',1e-6)
         .style('stroke-width',function(a) { return chromoData._network.link_line_width(a)*3;})
        .remove();
};

/*EDGES*/

circvis.size = function(width, height) {
    var w, h;

    if (width.length && width.length == 2) { //use 1st argument as array of sizes
        w = width[0];
        h = width[1];
    }
    else if (arguments.length == 1) { //set both to 1st argument
        w = h = width;
    } else {
        w = width;
        h = height;
    }

    var width_scale = w / chromoData._plot.width;
    var height_scale =  h / chromoData._plot.height;
    var svg = d3.select('#' + chromoData._plot.id).select('.circvis');
        var transform = d3.transform(svg.attr('transform'));
        var translate = transform.translate;
        var scale = transform.scale;
        var rotation = transform.rotate;
        var actual_width = (width / 2 * scale[0]), actual_height = (height / 2 * scale[1]);

    svg.transition().duration(500)
    .attr('transform','translate(' + w/2 + ',' + h/2 + ')scale(' + width_scale + ',' + height_scale + ')rotate(' + rotation + ')');


    d3.select('#' + chromoData._plot.id).transition().duration(500)
    .attr('width',w)
    .attr('height',h);

};

circvis.addEdges = function(edge_array) {
    var edges;
    if (_.isArray(edge_array)) {
        edges = this._insertEdges(edge_array);
    }
    else {
        edges = this._insertEdges([edge_array]);
    }

    var nodes = _.flatten(_.map(edges, function(edge) { return [edge.source,edge.target];}));
    this.addNodes(nodes);

    _drawNetworkLinks();

};

circvis.removeEdges = function(edge_array, ignore_nodes) {
    var ignore = _.isBoolean(ignore_nodes) ? ignore_nodes : Boolean(false);
    if (edge_array === 'all') {
            edge_array = chromoData._network.links_array;
        }

    if (_.isArray(edge_array)) {
        _.each(edge_array,function(edge) {chromoData._removeEdge(edge);});
    }
    else if ( _.isObject(edge_array)){
        chromoData._removeEdge(edge_array);
    }
    _drawNetworkLinks();

    if(ignore) {return;}

    var removable = _edgeListToNodeList(edge_array);
    var remaining_nodes = _edgeListToNodeList(chromoData._network.links_array);
    var nodes_to_remove = _.difference(removable,remaining_nodes);
    this.removeNodes(nodes_to_remove);    
};

circvis._insertEdges = function(edge_array) {
    //return the array of edges inserted
    return _.filter(_.map(edge_array, vq.models.CircVisData.prototype._insertEdge, chromoData),
        function(edge) { return !_.isNull(edge);});
};

/* NODES*/

circvis.addNodes = function(node_array) {
    
    var that = this;
    if (_.isArray(node_array)) {
       chromoData._insertNodes(node_array);
    }
    else {
        chromoData._insertNodes([node_array]);
    }
    _.each(_.uniq(_.pluck(node_array,'chr')), draw_ideogram_data);
};

circvis.removeNodes = function(node_array) {
    var that = this;
    if (_.isFunction(node_array)) {
        node_array = _.filter(chromoData._data.features, node_array);
    }

    if (_.isArray(node_array)) {
        _.each(node_array, function(node) {
            chromoData._removeNode(node);
        });
        _.each(_.uniq(_.pluck(node_array,'chr')), draw_ideogram_data);
    }
    if (_.isObject(node_array)){
        chromoData._removeNode(node_array);
        draw_ideogram_data(node_array.chr);
    }
    //retiling too soon will break the exit transition.. need to retile later when data is not being changed.
    // chromoData._retile();

};


/*Utils*/

 function _edgeListToNodeList (edges) {
    return _.uniq(_.flatten(_.chain(edges).map(function(edge){return [edge.source || edge.node1,edge.target || edge.node2];}).value()));
}; 
return circvis;
};

vq.CircVis = CircVis;

vq.models.CircVisData = function(data) {

    vq.models.VisData.call(this, data);

    this.setDataModel();

    if (this.getDataType() == 'vq.models.CircVisData') {
        this._build_data(this.getContents());
    } else {
        console.warn('Unrecognized JSON object.  Expected vq.models.CircVisData object.');
    }
};


vq.models.CircVisData.prototype = vq.extend(vq.models.VisData);

vq.models.CircVisData.prototype.setDataModel = function() {
    this._dataModel = [
        {label: '_plot.width', id: 'PLOT.width', defaultValue: 400},
        {label: '_plot.height', id: 'PLOT.height', defaultValue: 400},
        {label : '_plot.container', id:'PLOT.container', optional : true},
        {label: '_plot.vertical_padding', id: 'PLOT.vertical_padding', defaultValue: 0},
        {label: '_plot.horizontal_padding', id: 'PLOT.horizontal_padding', defaultValue: 0},
        {label : '_plot.enable_pan', id: 'PLOT.enable_pan', cast: Boolean, defaultValue : false },
        {label : '_plot.enable_zoom', id: 'PLOT.enable_zoom', cast: Boolean, defaultValue : false },
        {label : '_plot.show_legend', id: 'PLOT.show_legend', cast: Boolean, defaultValue : false },
        {label : '_plot.legend_corner', id: 'PLOT.legend_corner', cast: String, defaultValue : 'ne' },
        {label : '_plot.legend_radius', id: 'PLOT.legend_radius', cast: Number, defaultValue : 25 },
        {label : '_plot.legend_show_rings', id: 'PLOT.legend_show_rings', cast: Boolean, defaultValue : true },
        {label : '_plot.rotate_degrees', id: 'PLOT.rotate_degrees', cast: Number, defaultValue : 0 },
        {label : '_plot.tooltip_timeout', id: 'PLOT.tooltip_timeout', cast: Number, defaultValue : 200 },

        {label: '_data.features', id: 'DATA.features', defaultValue: []},
        {label: '_data.edges', id: 'DATA.edges', defaultValue: []},       
        {label: '_data.hash', id: 'DATA.hash', defaultValue: []},       

        {label : '_chrom.keys', id: 'GENOME.DATA.key_order', defaultValue : ["1","2","3","4","5","6","7","8","9","10",
            "11","12","13","14","15","16","17","18","19","20","21","22","X","Y"] },
        {label : '_chrom.length', id: 'GENOME.DATA.key_length', defaultValue : [] },
        {label : '_chrom.reverse_list', id: 'GENOME.OPTIONS.key_reverse_list', optional : true },
        {label : '_chrom.gap_degrees', id: 'GENOME.OPTIONS.gap_degrees', cast : Number, defaultValue : 0 },
        {label : '_chrom.label_layout_style', id: 'GENOME.OPTIONS.label_layout_style', defaultValue : 'default' },
        {label : '_chrom.label_font_style', id: 'GENOME.OPTIONS.label_font_style', cast: String, defaultValue : "16px helvetica, monospaced" },
        {label : '_chrom.radial_grid_line_width', id: 'GENOME.OPTIONS.radial_grid_line_width', cast : Number, defaultValue : null },
        {label : '_chrom.listener', id: 'GENOME.OPTIONS.listener', cast: Function, defaultValue : function() {
            return null;
        }},
        {label : '_network._doRender', id: 'NETWORK.OPTIONS.render',  defaultValue: true, cast: Boolean },
        {label : '_network._outer_padding', id: 'NETWORK.OPTIONS.outer_padding',  defaultValue: 0, cast: Number },
        {label : '_network.node_listener', id: 'NETWORK.OPTIONS.node_listener', cast: Function, defaultValue : function() {
            return null;
        } },
        {label : '_network.link_listener', id: 'NETWORK.OPTIONS.link_listener', cast: Function, defaultValue : function() {
            return null;
        } },
        {label : '_network.link_tooltipItems', id: 'NETWORK.OPTIONS.link_tooltip_items',
            defaultValue :  { 'Node 1 Chr' : 'sourceNode.chr', 'Node 1 Start' : 'sourceNode.start', 'Node1 End' : 'sourceNode.end',
                'Node 2 Chr' : 'targetNode.chr', 'Node 2 Start' : 'targetNode.start', 'Node 2 End' : 'targetNode.end'} },
        {label : '_network.link_tooltipLinks', id: 'NETWORK.OPTIONS.link_tooltip_links',  defaultValue : {} },
        {label : '_network.link_line_width', id: 'NETWORK.OPTIONS.link_line_width', cast : vq.utils.VisUtils.wrapProperty,
            defaultValue : function(node, link) {
                return 1;
            }},
        {label : '_network.link_alpha', id: 'NETWORK.OPTIONS.link_alpha', cast : vq.utils.VisUtils.wrapProperty,  defaultValue : function() {
            return 0.7;
        } },
        {label : '_network.link_strokeStyle', id: 'NETWORK.OPTIONS.link_stroke_style', cast : vq.utils.VisUtils.wrapProperty, defaultValue : function() {
            return 'steelblue';
        } },
        {label : '_network.node_fillStyle', id: 'NETWORK.OPTIONS.node_fill_style', cast : vq.utils.VisUtils.wrapProperty, defaultValue : function() {
            return 'green';
        } },
        {label : '_network.node_radius', id: 'NETWORK.OPTIONS.node_radius', cast : vq.utils.VisUtils.wrapProperty, defaultValue : function() {
            return 3;
        } },
        {label : '_network.node_highlightMode', id: 'NETWORK.OPTIONS.node_highlight_mode', cast : String, defaultValue : 'brighten' },
        {label : '_network.node_tooltipFormat', id: 'NETWORK.OPTIONS.node_tooltipFormat', cast : vq.utils.VisUtils.wrapProperty, defaultValue : vq.utils.VisUtils.network_node_title },
        {label : '_network.node_tooltipItems', id: 'NETWORK.OPTIONS.node_tooltip_items', defaultValue :  { Chr : 'chr', Start : 'start', End : 'end'} },
        {label : '_network.node_tooltipLinks', id: 'NETWORK.OPTIONS.node_tooltip_links',  defaultValue : {} },
        {label : '_network.max_node_linkDegree', id: 'NETWORK.OPTIONS.max_node_linkdegree', cast : Number, defaultValue :  9999 },
        {label : '_network.min_node_linkDegree', id: 'NETWORK.OPTIONS.min_node_linkdegree', cast : Number, defaultValue :  0 },
        {label : '_network.node_overlap_distance', id: 'NETWORK.OPTIONS.node_overlap_distance', cast : Number, defaultValue :  12000000.0},
        {label : '_network.tile_nodes', id: 'NETWORK.OPTIONS.tile_nodes', cast : Boolean, defaultValue : false },
        
        {label : 'ticks.tooltipItems', id: 'TICKS.OPTIONS.tooltip_items', defaultValue :  { Chr : 'chr', Start : 'start', End : 'end', Label:'value'} },
        {label : 'ticks.tooltipLinks', id: 'TICKS.OPTIONS.tooltip_links',  defaultValue : {} },
        {label : 'ticks.label_map', id: 'TICKS.OPTIONS.label_map', defaultValue:[
            {key:'',label:''}
        ]},
        {label : 'ticks.render_ticks', id: 'TICKS.OPTIONS.render_ticks', cast : Boolean ,defaultValue: Boolean(true)},
        {label : 'ticks.label_key', id: 'TICKS.OPTIONS.label_key', defaultValue:'value',cast: String},
        {label : 'ticks.height', id: 'TICKS.OPTIONS.height', cast : Number, defaultValue: 60 },
        {label : 'ticks.wedge_width', id: 'TICKS.OPTIONS.wedge_width', cast : Number, defaultValue: 0.2 },
        {label : 'ticks.wedge_height', id: 'TICKS.OPTIONS.wedge_height', cast : Number, defaultValue: 10 },
        {label : 'ticks.outer_padding', id: 'TICKS.OPTIONS.outer_padding', cast : Number, defaultValue: 0 },
        {label : 'ticks.listener', id: 'TICKS.OPTIONS.listener', cast : Function, defaultValue : function() {
            return null;
        } },
        {label : 'ticks.display_legend', id: 'TICKS.OPTIONS.display_legend', cast : Boolean, defaultValue : true },
        {label : 'ticks.legend_corner', id: 'TICKS.OPTIONS.legend_corner', cast : String, defaultValue : 'nw' },
        {label : 'ticks.tile_ticks', id: 'TICKS.OPTIONS.tile_ticks', cast : Boolean, defaultValue: true },
        {label : 'ticks.overlap_distance', id: 'TICKS.OPTIONS.overlap_distance', cast : Number, optional: true},
        {label : 'ticks.fill_style', id: 'TICKS.OPTIONS.fill_style', cast : vq.utils.VisUtils.wrapProperty, defaultValue : function() {
            return 'red';
        }},
        {label : 'ticks.stroke_style', id: 'TICKS.OPTIONS.stroke_style', cast : vq.utils.VisUtils.wrapProperty, defaultValue : function() {
            return 'white';
        }},
        {label : '_wedge' , id:'WEDGE', optional : true}
    ];
};

vq.models.CircVisData.prototype._build_data = function(data_struct) {
    var data = data_struct;

    this._processData(data);

    if (this._wedge) {
        this._wedge = this._wedge.map(function(b) {
            return new vq.models.CircVisData.WedgeData(b);
        });
    }

    this._setupData();
};


vq.models.CircVisData.prototype._setupData = function() {
    var chrom_keys_order={},chrom_length_map,chrom_length_array = [],cnv_map, startAngle = {},
        cnv_array, cnv_height = [], startAngle_map = {},normalizedLength = {},
        deviation = [],median = [], theta = {}, totalChromLength;
    this.normalizedLength,this.theta = [],this.startAngle_map = {};

    var that = this;
    this._plot.id = 'C' + vq.utils.VisUtils.guid(); // div id must start with letter

//  Ideogram Data

    if (this._chrom.keys == [] || this._chrom.length == []) {
        console.warn('Chromosome/Ideogram information has not been detected.  Please verify that keys and length/key mappings have been ' +
            'passed into the GENOME.DATA object.');
        return;
    }

    var chrom_keys_array = this._chrom.keys;       //array in pre-sorted order    
    _.each(chrom_keys_array,function(val,index){chrom_keys_order[val]=index;});

    chrom_length_array = this._chrom.length.filter(function(d) {
        return chrom_keys_order[d['chr_name']] !== null;
    });
    chrom_length_array.sort(function(c, d) {
        return chrom_keys_order[c['chr_name']] - chrom_keys_order[d['chr_name']] > 0;
    });  //sort by given order
    totalChromLength = vq.sum(chrom_length_array, function(d) {
        return d['chr_length'];
    });


   var rescaleForGaps = 1-(this._chrom.gap_degrees * chrom_keys_array.length / 360);

    chrom_length_map = {};
    _.each(chrom_length_array,function(obj) {
        chrom_length_map[obj['chr_name'].toUpperCase()] = obj['chr_length'];
        normalizedLength[obj['chr_name'].toUpperCase()] =  (obj['chr_length'] *rescaleForGaps) / totalChromLength;
    });

    this.normalizedLength = normalizedLength;

    var chrom_groups = {};

    var rotation = (this._plot.rotate_degrees) * Math.PI / 180;

    var renormalize_factor =  this._chrom.gap_degrees * Math.PI / 180; //radians

    //for each index of chrom_keys ( pre-sorted)
    // sum all lengths from 1st index to last index of chrom_length (sorted to chrom_length)
    _.each(chrom_keys_array,function(d,index) {
        startAngle[d] = _.reduce(chrom_keys_array.slice(0, (chrom_keys_order[d])),
            function(a,b,index) {
                return a+(normalizedLength[chrom_keys_array[index]] * 2 * Math.PI)+renormalize_factor;
            },0);

        theta[d] = d3.scale.linear().domain([0, chrom_length_map[d.toUpperCase()]])
            .range([0, 2 * Math.PI * normalizedLength[d]]);

        if (that._chrom.reverse_list !== undefined &&
            that._chrom.reverse_list.filter(
                function(c) {
                    return c == d;
                }).length > 0) {  //defined as reversed!
            theta[d] = d3.scale.linear().domain([0, chrom_length_map[d.toUpperCase()]])
                .range([2 * Math.PI * normalizedLength[d], 0]);

        } else {
            theta[d] = d3.scale.linear().domain([0, chrom_length_map[d.toUpperCase()]])
                .range([0, 2 * Math.PI * normalizedLength[d]]);

        }
        chrom_groups[d]={key:d, startAngle: startAngle[d], endAngle: startAngle[d] + 2 * Math.PI * normalizedLength[d], theta:theta[d],
            angle: 2 * Math.PI * normalizedLength[d]};
    });

    this.theta = theta;
    this._ideograms={};
    this._data.chr = {};
    _.each(that._chrom.keys, function(d) {
        startAngle_map[d] =  startAngle[d] + rotation;
        that._ideograms[d] = _.extend(chrom_groups[d],{wedge:[],_feature_angle : function(a) { return this.startAngle + this.theta(a); }});
        that._data.chr[d] = [];
    });
    this.startAngle_map = startAngle_map;
    this._chrom.groups = chrom_groups;

//Global Data

    if (this._data.features.length) {     
       this._data.chr = _.groupBy(this._data.features,'chr');
    } 

//    Ring Data

    if (this._wedge !== undefined) {
        var _data = [], cnv_map = {};
        _.each(this._wedge, function(wedge, index) {
             // are we using the global dataset?
             wedge._globalData = true;
            if(  wedge._globalData = !Boolean(wedge._data.length)) {
                wedge._data = that._data.features;
                }
            wedge._hash = _.isUndefined(wedge._hash) ? that._data.hash : wedge._hash;

            if (wedge._plot_type == 'tile' || wedge._plot_type == 'glyph') {
                var max_tile_level = 
                wedge._tile.show_all_tiles ?
                    Math.floor((wedge._plot_height - (wedge._radius() * 2)) / (wedge._tile.height + wedge._tile.padding)) :
                    undefined;
                _data = (wedge._plot_type == 'tile' ? 
                    vq.utils.VisUtils.layoutChrTiles(wedge._data, wedge._tile.overlap_distance, max_tile_level) :
                    vq.utils.VisUtils.layoutChrTicks(wedge._data, wedge._tile.overlap_distance, max_tile_level));
                wedge._layout = {};
                _.each(_data,function(f) { wedge._layout[wedge._hash(f)] = f.level;}); //layout is a sparse map of id to level
            }

        wedge._chr = wedge._globalData ? that._data.chr : _.groupBy(wedge._data,'chr');
                    
        wedge._outerRadius =
                (that._plot.height / 2) -
                    vq.sum(that._wedge.slice(0, index), function(a) {
                        return a._plot_height + a._outer_padding;
                    }) - (that.ticks.outer_padding + that.ticks.height);

            wedge._outerPlotRadius = wedge._outerRadius - wedge._outer_padding;

            wedge._innerRadius = wedge._outerPlotRadius - wedge._plot_height;

            _.each(that._chrom.keys, function(d) {
                that._ideograms[d]._outerRadius = ( that._plot.height / 2 ) -  that.ticks.outer_padding + that.ticks.height;
                that._ideograms[d].wedge[index] = wedge._chr[d];
            });

            wedge.hovercard = vq.hovercard({
                canvas_id : that._plot.id,
                include_header : false,
                include_footer : true,
                self_hover : true,
                timeout : that._plot.tooltip_timeout,
                data_config : wedge._tooltipItems,
                tool_config : wedge._tooltipLinks
            });

            if(wedge._plot_type =='karyotype') { return;}

            var value_label = wedge._value_key;
            deviation = Math.sqrt(vq.science.stats.variance(_.pluck(wedge._data,value_label)));
            median = vq.science.stats.median(_.pluck(wedge._data,value_label));

            wedge._min_plotValue = (wedge._min_plotValue === undefined) ? parseFloat(((-1 * deviation) + median).toFixed(2)) : wedge._min_plotValue;
            wedge._max_plotValue = (wedge._max_plotValue === undefined) ? parseFloat((deviation + median).toFixed(2)) : wedge._max_plotValue;
            wedge._range_mean = wedge._base_plotValue != null ? wedge._base_plotValue : (wedge._min_plotValue + wedge._max_plotValue) / 2;
            wedge._y_linear = d3.scale.linear()
                .domain([wedge._min_plotValue, wedge._max_plotValue])
                .range([wedge._innerRadius,wedge._outerRadius - wedge._outer_padding]).nice();

            wedge._y_axis = d3.scale.linear().domain([wedge._min_plotValue, wedge._max_plotValue]).range([wedge._innerRadius,wedge._outerPlotRadius]);
            wedge._thresholded_innerRadius = function(d) { return Math.max(wedge._y_axis(Math.min(d,wedge._range_mean)),wedge._innerRadius); };
            wedge._thresholded_outerRadius = function(d) { return Math.min(wedge._y_axis(Math.max(d,wedge._range_mean)),wedge._outerPlotRadius); };
            wedge._thresholded_value_to_radius = function(d) { return Math.min(Math.max(wedge._y_axis(d),wedge._innerRadius),wedge._outerPlotRadius); };
            wedge._thresholded_radius = function(d) { return Math.min(Math.max(d,wedge._innerRadius),wedge._outerPlotRadius); };

            wedge._thresholded_tile_innerRadius = function(c,d) { return wedge._innerRadius + (d._tile.height + d._tile.padding) * wedge._layout[wedge._hash(c)];};
            wedge._thresholded_tile_outerRadius = function(c,d) { return wedge._innerRadius + ((d._tile.height + d._tile.padding) * wedge._layout[wedge._hash(c)]) + d._tile.height;};
            if (wedge._plot_type == 'glyph') {
                wedge._glyph_distance = function(c) { return (((wedge._tile.height + wedge._tile.padding) * wedge._layout[wedge._hash(c)])
                    + wedge._innerRadius + (wedge._radius(c)));};
                wedge._checked_endAngle = function(feature,chr) {
                    if (that._chrom.keys.length == 1) {
                        return Math.min(that.startAngle_map[chr] + that.theta[chr](feature.end||feature.start+1),that.startAngle_map[that._chrom.keys[0]] + (Math.PI * 2));
                    }
                    else if (this.parent.index+1 == that._chrom.keys.length) {
                        return Math.min(that.startAngle_map[chr] + that.theta[chr](feature.end||feature.start+1),that.startAngle_map[that._chrom.keys[0]] + (Math.PI * 2));
                    }
                    else {return Math.min(that.startAngle_map[chr] + that.theta[chr](feature.end||feature.start+1),
                        that.startAngle_map[that._chrom.keys[(this.parent.index+1)%that._chrom.keys.length]]);
                    }
                };
            }
            delete wedge._data;

        }); //foreach
    }

//    Tick Data
        
        if (that.ticks.tile_ticks) {
            if (that.ticks.overlap_distance === undefined) {
                var overlap_ratio = 7000000.0 / 3080419480;
                that.ticks.overlap_distance = overlap_ratio * totalChromLength;
            }
        
            var _tickData = 
                    vq.utils.VisUtils.layoutChrTicks(this._data.features, that.ticks.overlap_distance);
            var layout = this.ticks._layout = {};
            var hash = that._data.hash;
            _.each(_tickData,function(f) {layout[hash(f)] = f.level;}); 
        }

        this.ticks.data_map = that._data.chr;     
        
        this.ticks.hovercard =  vq.hovercard({
            canvas_id : that._plot.id,
            include_header : false,
            include_footer : true,
            self_hover : true,
            timeout : that._plot.tooltip_timeout,
            data_config : that.ticks.tooltipItems,
            tool_config : that.ticks.tooltipLinks
        });

    //------------------- NETWORK DATA
    var nodes = {};
    _.each(that._chrom.keys, function(d) {
        nodes[d] = {};
    });
    var node_parent_map = {};
    var node_array = [{parent:null, chr:null, radius:0, angle:0}];
    that._network.network_radius = {};
    that._network.layout = {};
    chrom_keys_array.forEach(function(key,index) {
        var innerRadius = that._ideograms[key].wedge.length > 0 ? that._wedge[that._ideograms[key].wedge.length-1]._innerRadius :
            (that._plot.height / 2) - that.ticks.outer_padding - that.ticks.height;
        var network_radius = that._network.network_radius[key] = innerRadius - that._network._outer_padding;
        node_parent_map[key] = index + 1;
        var node = {chr:key,parent:node_array[0],radius: network_radius / 2,
            angle : (that._chrom.groups[key].startAngle + that._chrom.groups[key].endAngle)/2};
        node_array.push(node);
    });

    this._network.node_parent_map = node_parent_map;
  
        this._network.nodes_array=node_array;
        this._network.links_array=[];

        this._network.link_hovercard  =  vq.hovercard({
            canvas_id : that._plot.id,
            include_header : false,
            include_footer : true,
            self_hover : true,
            timeout : that._plot.tooltip_timeout,
            data_config : that._network.link_tooltipItems,
            tool_config : that._network.link_tooltipLinks
        });
        this._network.node_hovercard  =  vq.hovercard({
            canvas_id : that._plot.id,
            include_header : false,
            include_footer : true,
            self_hover : true,
            timeout : that._plot.tooltip_timeout,
            data_config : that._network.node_tooltipItems,
            tool_config : that._network.node_tooltipLinks
        });

        //var edges = _.filter(_.map(that._network.data, vq.models.CircVisData.prototype._insertEdge, that),
        //function(edge) { return !_.isNull(edge);});
    this._insertEdges(that._data.edges);

    this.setDataReady(true);
};


vq.models.CircVisData.prototype._remove_wedge_data = function(node) {
    var that = this;
    var chr = node.chr;
    _.each(this._ideograms[chr].wedge, function(wedge,index) {
     if (wedge._globalData) {
        that._ideograms[chr].wedge[index] = _.reject(wedge,
            function(obj) { return that.same_feature(obj,node);});
    }
    });
};

vq.models.CircVisData.prototype._add_wedge_data = function(data) {
    var that = this;
    var chr = data.chr;
    _.each(this._ideograms[chr].wedge, function(wedge,index) {
        if (wedge._globalData) {
        if(_.isUndefined(data[that._wedge[index]._value_key]) || that._wedge[index]._plot_type =='karyotype') { return;}
        wedge.push(data);
        }
    });
};

vq.models.CircVisData.prototype.same_feature = function(n1,n2) {
    return this._data.hash(n1) ==  this._data.hash(n2);
};

vq.models.CircVisData.prototype.same_edge= function(edge1,edge2) {
    return this.same_feature(edge1.source,edge2.source) &&
        this.same_feature(edge1.target,edge2.target);
};

vq.models.CircVisData.prototype._retileWedge = function() {
    var that = this;
    _.each(this._wedge,function(wedge,index) {
        var data = wedge._globalData ? that._data.features : wedge._data;
        if (wedge._plot_type == 'tile' || wedge._plot_type == 'glyph') {
                var max_tile_level = 
                wedge._tile.show_all_tiles ?
                    Math.floor((wedge._plot_height - (wedge._radius() * 2)) / (wedge._tile.height + wedge._tile.padding)) :
                    undefined;
                var _data = (wedge._plot_type == 'tile' ? 
                    vq.utils.VisUtils.layoutChrTiles(data, wedge._tile.overlap_distance, max_tile_level) :
                    vq.utils.VisUtils.layoutChrTicks(data, wedge._tile.overlap_distance, max_tile_level));
                wedge._layout = {};
                _.each(_data,function(f) { wedge._layout[wedge._hash(f)] = f.level;}); //layout is a sparse map of id to level
            }
  });
};


vq.models.CircVisData.prototype._retileTicks = function() {
    var that = this;
    var tick;
    var _tickData = 
        vq.utils.VisUtils.layoutChrTicks(this._data.features, this.ticks.overlap_distance);
    var layout = this.ticks._layout;
    var hash = that._data.hash;
    _.each(_tickData,function(f) {layout[hash(f)] = f.level;}); 
};

vq.models.CircVisData.prototype._format_network_node = function(node) {
    var that = this;
    var node_parent_map = this._network.node_parent_map;
    var hash = this._data.hash;

    function include_node(node) {
        var new_node;
        var parent = that._network.nodes_array[node_parent_map[node.chr]];
        //previously loaded this node, pull it from the node_array
        if ( !_.isUndefined(parent)) {
            new_node = _.extend({parent:parent},node);
            // parent.children.push(new_node);
            return new_node;
        }
        else {
            return null;
        }
    }

    if (_.isArray(node)) { return _.compact(_.map(node,include_node,that));}
    return include_node.call(that,node);

};


vq.models.CircVisData.prototype._remove_layouts = function(node) {
    var that = this;
    var hash = this._data.hash(node);

    delete this.ticks._layout[hash];
    delete this._network.layout[hash];

    _.each(this._wedge, function(wedge){
        if (wedge._layout && wedge._layout[hash]) { delete wedge._layout[hash];}
    });

};

vq.models.CircVisData.prototype._remove_feature = function(node) {
    var that = this;
    var feature_index= -1;
     _.each(this._data.chr[node.chr],
        function(obj,index) { if (that.same_feature(obj,node)) { feature_index = index;} 
    });

    if (!!~feature_index)    this._data.chr[node.chr].splice(feature_index,1);

    feature_index = -1;
     _.each(this._data.features,
        function(obj,index) { if (that.same_feature(obj,node)) { feature_index = index;} 
    });

    if (!!~feature_index) this._data.features.splice(feature_index,1);
    return this;
};

vq.models.CircVisData.prototype._insertNode = function(node) {
    var that = this;
    var new_node;
    var hash = this._data.hash;
    if (!_.include(_.keys(that._chrom.groups),node.chr)) {return null;}
    
    if (new_node = _.find(that._data.features,function(feature) { return hash(feature) === hash(node);}) ) {
        return new_node;
    } else {
        that._data.features.push(node);
        that._data.chr[node.chr].push(node);
    }
    return node;
};

vq.models.CircVisData.prototype._insertNodes = function(node_array) {
    var that = this;
    var nodes = [];
    var insert_nodes = _.map(node_array,this._insertNode, this);
    this._retile();
    return insert_nodes;
};

vq.models.CircVisData.prototype._retile = function() {
    this._retileNodes();
    this._retileTicks();
    this._retileWedge();
    return this;
};

vq.models.CircVisData.prototype._retileNodes = function() {
    var that = this;
    if (this._network.tile_nodes && this._data.features.length) {
        nodes = vq.utils.VisUtils.layoutChrTiles(that._data.features ,that._network.node_overlap_distance);
         _.each(nodes,function(f) { that._network.layout[that._data.hash(f)] = f.level;});
    }
    return this;
};

vq.models.CircVisData.prototype._removeNode = function(node) {
    if (!_.isObject(node)) { return; }
    this._remove_feature(node);
};

vq.models.CircVisData.prototype._insertEdges = function(edge_array) {
    var that = this;
    _.each(edge_array,this._insertEdge,that);
};


vq.models.CircVisData.prototype._insertEdge = function(edge) {
    var nodes = [edge.node1,edge.node2];
    var that = this;

    //quit if either node has an unmappable location
    if(_.any(nodes,function(a){return _.isNull(a) ||
        !_.include(_.keys(that._chrom.groups),a.chr); })) {
        console.log('Unmappable chromosome in edge: 1:'+ nodes[0].chr + ', 2:' + nodes[1].chr);
        return null;
    }
    //insert/recover both nodes
    var edge_arr = _.map([nodes[0],nodes[1]],that._insertNode,that);
    if(_.any(edge_arr,function(a){return _.isNull(a);})) {
        console.error('Unable to insert node for requested edge'); return null;
    }

    //list of keys that aren't node1,node2
    var keys = _.chain(edge).keys().reject(function(a){return a=='node1'|| a== 'node2';}).value();
    edge_arr = _.map(edge_arr,this._format_network_node,this);

    //append the source,target nodes
    var insert_edge = _.chain(edge).pick(keys).extend({source:edge_arr[0],target:edge_arr[1]}).value();

    //search for edge in current data
    if (_.any(this._network.links_array,function(link) { return that.same_edge(insert_edge,link);})){
        return null;//old link
    }else {  //insert new edge
        this._network.links_array.push(insert_edge);  //add it
    }
    return insert_edge;
};

vq.models.CircVisData.prototype._removeEdge = function(edge) {
    var that = this;
    if (_.isObject(edge)) {
        var edge_index = -1;
            _.each(this._network.links_array,function(link,index) { 
                if (that.same_edge(link,_.extend(
                            {},{source:edge.node1,target:edge.node2},edge))) {
                edge_index = index;
                }
            });
        if (edge_index) this._network.links_array.splice(edge_index,1);
    }
};

vq.models.CircVisData.prototype._removeEdges = function(edge_arr) {
    var that = this;
    if (_.isArray(edge_arr)) {
        _.each(edge_arr, this._removeEdge,this);
    }
};


/**
 *
 * @class Internal data model for ring plots.
 *
 * @param data {JSON Object} - Configures a single ring plot.
 * @extends vq.models.VisData
 */
vq.models.CircVisData.WedgeData = function(data) {

    vq.models.VisData.call(this, {CONTENTS:data});

    this.setDataModel();
    this._build_data(this.getContents())

};

vq.models.CircVisData.WedgeData.prototype = vq.extend(vq.models.VisData);

vq.models.CircVisData.WedgeData.prototype.setDataModel = function() {
    this._dataModel = [
        {label : '_data', id: 'DATA.data_array', defaultValue : [   ]},
        {label : '_value_key', id: 'DATA.value_key', defaultValue : 'value',cast: String },  //value to plot
        {label : '_hash', id: 'DATA.hash', optional: true ,cast: vq.utils.VisUtils.wrapProperty }, //unique identifier
        {label : 'listener', id: 'OPTIONS.listener', defaultValue :  function(a, b) {
        } },
        {label : '_plot_type', id: 'PLOT.type', defaultValue : 'histogram' },
        {label : '_plot_height', id: 'PLOT.height', cast: Number, defaultValue : 100 },
        {label : '_fillStyle', id: 'OPTIONS.fill_style', cast : vq.utils.VisUtils.wrapProperty, defaultValue : function(d) {
            return 'red';
        } },
        {label : '_strokeStyle', id: 'OPTIONS.stroke_style', cast : vq.utils.VisUtils.wrapProperty, defaultValue : function(d) {
            return 'black'; } },
        {label : '_lineWidth', id: 'OPTIONS.line_width', cast : Number, defaultValue : 0.5 },
        {label : '_shape', id: 'OPTIONS.shape', cast : vq.utils.VisUtils.wrapProperty, defaultValue : function(d) {
            return 'circle';
        } },
        {label : '_radius', id: 'OPTIONS.radius', cast : vq.utils.VisUtils.wrapProperty, defaultValue : function(d) {
            return 2;
        } },
        {label : '_outer_padding', id: 'OPTIONS.outer_padding', cast : Number, defaultValue : 1 },
        {label : '_min_plotValue', id: 'OPTIONS.min_value',  cast : Number , optional : true },
        {label : '_max_plotValue', id: 'OPTIONS.max_value',  cast : Number , optional : true },
        {label : '_base_plotValue', id: 'OPTIONS.base_value', cast: Number, optional : true },
        {label : '_legend_label', id: 'OPTIONS.legend_label', cast: String, defaultValue : '' },
        {label : '_legend_desc', id: 'OPTIONS.legend_description', cast: String, defaultValue : '' },
        {label : '_draw_axes', id: 'OPTIONS.draw_axes', cast: Boolean, defaultValue : true },
        {label : '_show_tooltips', id: 'OPTIONS.show_tooltips', cast: Boolean, defaultValue : true },
        {label : '_tooltipFormat', id: 'OPTIONS.tooltipFormat', cast :vq.utils.VisUtils.wrapProperty,
            defaultValue : function(c, d) {
                return "Chr " + d + "\nStart: " + c.start + "\nEnd: " + c.end;
            }   },
        {label : '_tooltipItems', id: 'OPTIONS.tooltip_items',  defaultValue : {Chr:'chr',Start:'start',End:'end',Value:'value'} },
        {label : '_tooltipLinks', id: 'OPTIONS.tooltip_links',  defaultValue : {} },
        {label : '_tile.padding', id: 'OPTIONS.tile_padding', cast: Number, defaultValue : 5 },
        {label : '_tile.overlap_distance', id: 'OPTIONS.tile_overlap_distance', cast: Number, defaultValue : 0.1 },
        {label : '_tile.height', id: 'OPTIONS.tile_height', cast: Number, defaultValue : 5 },
        {label : '_tile.show_all_tiles', id: 'OPTIONS.tile_show_all_tiles', cast: Boolean, defaultValue : false }
    ];
};

vq.models.CircVisData.WedgeData.prototype._build_data = function(data_struct) {
    this._processData(data_struct)
};

return vq;
}));
