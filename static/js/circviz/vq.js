/** @namespace Top-level namespace, vq **/
(function (root, factory) {
   if (typeof exports === 'object' && root.require) {
     module.exports = factory(require("underscore"), require("d3"), require("jquery"));
   } else if (typeof define === "function" && define.amd) {
      // AMD. Register as an anonymous module.
      define(["underscore","d3", "jquery"], function(_, d3, $) {
        // Use global variables if the locals are undefined.
        return factory(_ || root._, d3 || root.d3, $ || root.$);
      });
   } else {
      // RequireJS isn't being used. Assume underscore and d3 are loaded in <script> tags
      factory(_, d3, $);
   }
}(this, function(_, d3, $) {
/** @namespace Top-level namespace, vq **/

if ( _ === undefined ||  _.VERSION === undefined) { console.error("Underscore.js not detected.  Please check that is being loaded.");}
if (d3 === undefined) { console.error("d3.js not detected.  Please check it is being loaded.")}
vq = {};

vq.VERSION = '2.0';

/**
 * @class Abstract base class for VisQuick.  Handles properties of the Visualizations and the data models. *
*/
vq.Base = function() {
      this.$properties = {};
};

vq.Base.prototype.properties = {};
vq.Base.cast = {};

vq.Base.prototype.extend =  function(proto) {
  return this;
};

/** @private **/
vq.Base.prototype.property = function(name, cast) {
  if (!this.hasOwnProperty("properties")) {
    this.properties = vq.extend(this.properties);
  }
  this.properties[name] = true;

  /*
   * Define the setter-getter globally, since the default behavior should be the
   * same for all properties, and since the Protovis inheritance chain is
   * independent of the JavaScript inheritance chain. For example, anchors
   * define a "name" property that is evaluated on derived marks, even though
   * those marks don't normally have a name.
   */
    /** @private **/
  vq.Base.prototype.propertyMethod(name, vq.Base.cast[name] = cast);
  return this;
};


/** @private Sets the value of the property <i>name</i> to <i>v</i>. */
vq.Base.prototype.propertyValue = function(name, v) {
  var properties = this.$properties;
  properties[name] = v;
  return v;
};

/**
 * @private Defines a setter-getter for the specified property.
 *
 * <p>If a cast function has been assigned to the specified property name, the
 * property function is wrapped by the cast function, or, if a constant is
 * specified, the constant is immediately cast. Note, however, that if the
 * property value is null, the cast function is not invoked.
 *
 * @param {string} name the property name.
 * @param {function} [cast] the cast function for this property.
 */
vq.Base.prototype.propertyMethod = function(name, cast) {
  if (!cast) cast = vq.Base.cast[name];
  this[name] = function(v) {

      /* If arguments are specified, set the property value. */
      if (arguments.length) {
        var type = (typeof v == "function");
        this.propertyValue(name, (type & 1 && cast) ? function() {
            var x = v.apply(this, arguments);
            return (x != null) ? cast(x) : null;
          } : (((v != null) && cast) ? cast(v) : v)).type = type;
        return this;
      }

      return (this.$properties[name] != null) ? (typeof this.$properties[name] == "function") & 1 ?
             this.$properties[name].apply(this) :
              this.$properties[name] : null;
    };
};


vq.extend = function(f) {
  function g() {}
  g.prototype = f.prototype || f;
  return new g();
};
/** @class The abstract base class for the VisQuick tools.  It provides the base properties.
 * @extends vq.Base
 */
vq.Vis = function() {
   vq.Base.call(this);
};
/**
 *
 *
 * @type number
 * @name vertical_padding
 *
 * @type number
 * @name horizontal_padding
 *
 * @type number
 * @name width
 *
 * @type number
 * @name height
 *
 * @type string/HTMLElement
 * @name container
 *
 */
vq.Vis.prototype = vq.extend(vq.Base);

vq.Vis.prototype
    .property("vertical_padding",Number)
    .property("horizontal_padding",Number)
    .property("width", Number)
    .property("height", Number)
    .property("container",  function(c) {
            return (vq.utils.VisUtils.divify(c)); // assume that c is the passed-in element
      });

/* vq.models.js */

/** @namespace The namespace for data model classes. **/
vq.models = {};

   /**
     * It contains a meta-tag for the included data, as well as the data in JSON format.
     *
     * @class The abstract base class for the data model of each VisQuick tool.  It provides the
     * necessary functionality to read, parse, analyze, and retain the input parameters.
     *
     * @param data - a JSON object
     * @param {String} data.DATATYPE - a string describing the contents of the JSON data object
     * @param {JSON} data.CONTENTS - a JSON object containing the necessary input to create the visualization
     */

vq.models.VisData = function(data){


        if (data.DATATYPE != null) {
            this.DATATYPE = data.DATATYPE;
        } else {
            this.DATATYPE = "VisData";
        }

        if (data.CONTENTS != null) {
            this.CONTENTS = data.CONTENTS;
        }
        /**@private */
        this._ready=false;
    };

/**
 *  Returns an identifying string used to specify the <i>CONTENTS</i>.  This ensures that the data is properly parsed by a visualization
 *  which may accept multiple JSON formats.
 *
 * @return {String} dataType - a string describing the contents of the JSON object. This can be used to verify that the
 *  data is the correct format for the visualization.
 */


vq.models.VisData.prototype.getDataType = function() {
    return this.DATATYPE;
};

/**
 *  Returns the JSON object used to contain the data, parameters, options, behavior functions, and other information necessary
 *  to create a visualization.
 *
 * @return {JSON} dataType -a JSON Object containing the necessary input to create the visualization.
 */

vq.models.VisData.prototype.getContents = function() {
    return this.CONTENTS;
};
vq.models.VisData.prototype.get =  function(prop) {
    var parts = prop.split('.');
    var obj = this;
    for(var i = 0; i < parts.length - 1; i++) {
        var p = parts[i];
        if(obj[p] === undefined) {
            obj[p] = {};
        }
        obj = obj[p];
    }
    p=parts[parts.length -1];
    return obj[p] === undefined ?  undefined : obj[p];
};

vq.models.VisData.prototype.set = function(prop,value) {
    var parts = prop.split('.');
    var obj = this;
    for(var i = 0; i < parts.length - 1; i++) {
        var p = parts[i];
        if(obj[p] === undefined) {
            obj[p] = {};
        }
        obj = obj[p];
    }
    p = parts[parts.length - 1];
    obj[p] =  value === undefined ? null : value;
    return this;
};

    vq.models.VisData.prototype.isDataReady = function() {
        return this._ready;
    };

    vq.models.VisData.prototype.setDataReady = function(bool) {
        this._ready = Boolean(bool);
    };


vq.models.VisData.prototype.setValue = function(data,o) {
    var get = vq.utils.VisUtils.get;
    if (typeof get(data,o.id) == 'function') {
        this.set(o.label, get(data,o.id));
        return;
    }
    else {
        if(o.cast) {
            this.set(o.label, o.cast(get(data,o.id)));
            return;
        } else {
            this.set(o.label,get(data,o.id));
            return;
        }
    }
};

/** private **/

vq.models.VisData.prototype._processData = function(data) {
    var that = this;
    var get = vq.utils.VisUtils.get;

    if(!this.hasOwnProperty('_dataModel')) {
        this._dataModel = vq.extend(this._dataModel);
    }
    data = Object(data);
    this['_dataModel'].forEach(function(o) {
        try{
            if (!typeof o == 'object') { return;}
            //use default value if nothing defined
            if (!o.optional) {
                if (get(data,o.id)  === undefined) {
                    that.set(o.label,(o.defaultValue != undefined ? o.defaultValue :  o['cast'](null)));
                } else { //o.id value is found and not optional
                    that.setValue(data,o);
                }
            }  else {  // it is optional
                if (get(data,o.id)  === undefined) {
                    return;  //don't set it
                } else {
                    that.setValue(data,o);    //set it
                }
            }
        } catch(e) {
            console.warn('Unable to import property \"'+ o.id +'\": ' + e);
        }
    });
};

/* vq.utils.js */

/** @namespace The namespace for utility classes focused on visualization tools. **/
vq.utils = {};
/**
 *
 *
 * Used as a static class object to reserve a useful namespace.
 *
 * @class Provides a set of static functions for use in creating visualizations.
 * @namespace A set of simple functions for laying out visualizations rapidly.
 *
 */

vq.utils.VisUtils =  {};

    vq.utils.VisUtils.divify =  function(c) {
        var result = null;
             if (typeof c == "string")  {
             result = document.getElementById(c) === undefined ? null : c ;
             } else if (typeof c == 'function' ) {
                 var val = c.call() + '';
                 result = document.getElementById(val) === undefined ? null : val ;
             }
        return result;
    };
    /**
     * Utility function for the creation of a div with specified parameters.  Useful in structuring interface for
     * multi-panel cooperating visualizations.
     *
     * @static
     * @param {String} id -  the id of the div to be created.
     * @param {String} [className] - the class of the created div
     * @param {String} [innerHTML] - text to be included in the div
     * @return divObj - a reference to the div (DOM) object
     *
     */
    vq.utils.VisUtils.createDiv = function(id, className, innerHtml) {
        var divObj;
        try {
            divObj = document.createElement('<div>');
        } catch (e) {
        }
        if (!divObj || !divObj.name) { // Not in IE, then
            divObj = document.createElement('div')
        }
        if (id) divObj.id = id;
        if (className) {
            divObj.className = className;
            divObj.setAttribute('className', className);
        }
        if (innerHtml) divObj.innerHTML = innerHtml;
        return divObj;
    };

    /**
     * Ext.ux.util.Clone Function
     * @param {Object/Array} o Object or array to clone
     * @return {Object/Array} Deep clone of an object or an array
     * @author Ing. Jozef Sak�lo?
     */
    vq.utils.VisUtils.clone = function(o) {
        if(!o || 'object' !== typeof o) {
            return o;
        }
        var c = '[object Array]' === Object.prototype.toString.call(o) ? [] : {};
        var p, v;
        for(p in o) {
            if(o.hasOwnProperty(p)) {
                v = o[p];
                if(v && 'object' === typeof v) {
                    c[p] = vq.utils.VisUtils.clone(v);
                }
                else {
                    c[p] = v;
                }
            }
        }
        return c;
    }; // eo function clone

vq.utils.VisUtils.get =  function(obj,prop) {
    var parts = prop.split('.');
    for(var i = 0; i < parts.length - 1; i++) {
        var p = parts[i];
        if(obj[p] === undefined) {
            obj[p] = {};
        }
        obj = obj[p];
    }
    p=parts[parts.length -1];
    return obj[p] === undefined ?  undefined : obj[p];
};



vq.utils.VisUtils.set = function(obj,prop,value) {
    var parts = prop.split('.');
    for(var i = 0; i < parts.length - 1; i++) {
        var p = parts[i];
        if(obj[p] === undefined) {
            obj[p] = {};
        }
        obj = obj[p];
    }
    p = parts[parts.length - 1];
    obj[p] = value || null;
    return this;
};

//sorting functions, etc

vq.utils.VisUtils.natural_order = function(a,b){return a-b};

    vq.utils.VisUtils.alphanumeric = function(comp_a,comp_b) {	//sort order -> numbers -> letters
        if (isNaN(comp_a || comp_b))  { // a is definitely a non-integer
            if (isNaN( comp_b || comp_a)) {   // both are non-integers
                return [comp_a, comp_b].sort();   // sort the strings
            } else {                // just a is a non-integer
                return 1;           // b goes first
            }
        } else if (isNaN(comp_b || comp_a)) {  // only b is a non-integer
            return -1;          //a goes first
        } else {                                    // both are integers
            return Number(comp_a) - Number(comp_b);
        }
    };


//function network_node_id(node) { return node.nodeName + node.start.toFixed(4) + node.end.toFixed(4);};
    vq.utils.VisUtils.network_node_id = function(node) {
        var map = vq.utils.VisUtils.options_map(node);
        if (map != null && map['label'] != undefined)
        {return map['label'];}
        return node.nodeName + node['start'].toFixed(2) + node['end'].toFixed(2);
    };

//function network_node_id(node) { return node.nodeName + node.start.toFixed(4) + node.end.toFixed(4);};
    vq.utils.VisUtils.network_node_title = function(node) {
        var map = vq.utils.VisUtils.options_map(node);
        if (map != null && map['label'] != undefined)
        {return map['label'] + ' \n' +  'Chr: ' + node.nodeName +
                '\nStart: ' + node['start'] +
                '\nEnd: ' + node['end'];}
        return node.nodeName + ' ' +  node['start'].toFixed(2) + ' ' + node['end'].toFixed(2);
    };

//function tick_node_id(tick) { return tick.chr + tick.start.toFixed(4) + tick.end.toFixed(4);};
    vq.utils.VisUtils.tick_node_id = function(tick) { return tick.value;};

    vq.utils.VisUtils.extend = function(target,source) {
    for (var v in source) {
          target[v] = source[v];
    }
        return target;
};



    vq.utils.VisUtils.parse_pairs = function(column,assign_str,delimit_str) {
        var map = {}, pair_arr =[], pairs = [];
            pair_arr =[];
            pairs = column.split(delimit_str);
            for (var i=0;i< pairs.length; i++) {
                pair_arr = pairs[i].split(assign_str);
                if (pair_arr.length == 2) {
                    map[pair_arr[0]] = pair_arr[1];
                }
            }
        return map;
    };

    vq.utils.VisUtils.options_map = function(node) {
        var options_map = {};
        if (node.options != null) {
            options_map = vq.utils.VisUtils.parse_pairs(node.options,'=',',');
        }
        return options_map;
    };

    vq.utils.VisUtils.wrapProperty = function(property) {
        if (typeof property == 'function'){
            return property;
        } else {
            return function() {return property;}
        }
    };

vq.utils.VisUtils.layoutChrTiles = function(tiles,overlap, max_level, treat_as_points) {
    var points = treat_as_points || Boolean(false);
    var new_tiles = [], chr_arr = [];
    chr_arr = _.uniq(_.pluck(tiles,'chr')); //find the unique chr labels
    chr_arr.forEach(function(chr) { // for each chr
        new_tiles = _.union(new_tiles,  //concat together tiles being laid out by chr.
                vq.utils.VisUtils.layoutTiles(_.where(tiles,{'chr':chr}),overlap,max_level,points)); 
    });
    // tiles.forEach(function(obj) { vq.utils.VisUtils.copyTile(obj,new_tiles);});
    return new_tiles;
};

// vq.utils.VisUtils.copyTile = function(tile,tile_set) {
//             var match = null,
//             index= 0,
//             props = _.keys(tile);
//             do {
//                  match = props.every(function(prop) { return ((tile[prop] == tile_set[index][prop]) ||
//                             (isNaN(tile[prop] && isNaN(tile_set[index][prop])))) ? 1 : 0;});
//                 index++;
//             }
//           while (index < tile_set.length && match != 1);
//             tile.level = tile_set[index-1].level;
//         return tile;
// };

vq.utils.VisUtils.layoutChrTicks = function(tiles,overlap,max_level) {
    return vq.utils.VisUtils.layoutChrTiles(tiles,overlap,max_level,true);
};

//tiles : {Array} of tiles.  tile is composed of start,end
// this returns an array with tile appended with a 'level' property representing a linear layout
// of non-overlapping Tiles

vq.utils.VisUtils.layoutTiles = function(tiles,overlap,max_level, treat_as_points){
    var points = treat_as_points || Boolean(false);
    var new_tiles = new Array(tiles.length);
    new_tiles = _.map(tiles,function(b) { return _.extend({},b,{tile_length : (b.end - b.start)});});  // generate a tile length property
    new_tiles = new_tiles.sort(function(a,b) { return (a.tile_length < b.tile_length) ? -1 :
            (a.tile_length > b.tile_length) ? 1 : a.start < b.start ? -1 : 1 ;}).reverse();         //sort all tiles by tile length
    if (new_tiles.length) {new_tiles[0].level = 0;}
    _.each(new_tiles,function(tile,index,array) {
            vq.utils.VisUtils.layoutTile(tile,index,array,overlap,max_level,treat_as_points);
    });
    return new_tiles;
};

vq.utils.VisUtils.layoutTile = function(tile,index,array,overlap,max_level, treat_as_points) {
        var points = treat_as_points || Boolean(false);
        var levels = array.slice(0,index)
                .map(
                function(a){
                    var t1 = vq.utils.VisUtils.extend({},a);
                    if (_.isNull(a.end))  t1.end = tile.start + 0.1;
                    else if (_.isNull(tile.end)) tile.end = tile.start + 0.1;
                    return vq.utils.VisUtils._isOverlapping(t1,tile,overlap || 0, points) ? a.level : null;
                }
                );
        levels = _.filter(levels, function(a) { return _.isFinite(a);}).sort(vq.utils.VisUtils.natural_order);
        var find = 0, l_index =0;
        while (find >= levels[l_index]) {
            if (find == levels[l_index]) { find++;}
            l_index++;
        }
        if (_.isUndefined(max_level)) { tile.level = find;}
        else
        {tile.level  = find <= max_level ? find : Math.floor(Math.random() * (max_level + 1));}
    };

vq.utils.VisUtils._isOverlapping = function(tile1,tile2,overlap, treat_as_points) {
    var point = treat_as_points || Boolean(false);
    if (point) return ((tile1.start-overlap) <= tile2.start && (tile1.start + overlap) >= tile2.start);
    else
    return ((tile1.start-overlap) <= tile2.end && (tile1.end + overlap) >= tile2.start);
};

vq.utils.VisUtils.tileCenter = function(tile) {
  if (!(_.isFinite(tile.end + tile.start)) && _.isNumber(tile.start)) { return tile.start;}
  return (tile.end + tile.start) >>> 1; // divide by 2 and drop fraction/sign.
};

//taken from PrototypeJS


  vq.utils.VisUtils.cumulativeOffset = function (element) {
    var valueT = 0, valueL = 0;
    if (element.parentNode) {
      do {
        valueT += element.offsetTop  || 0;
        valueL += element.offsetLeft || 0;
        element = element.offsetParent;
      } while (element);
    }
    return {left : valueL, top: valueT};
  };

 vq.utils.VisUtils.viewportOffset = function(forElement) {
    var valueT = 0, valueL = 0, docBody = document.body;

    var element = forElement;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      if (element.offsetParent == docBody &&
        element.style.position == 'absolute') break;
    } while (element = element.offsetParent);

    element = forElement;
    do {
      if (element != docBody) {
        valueT -= element.scrollTop  || 0;
        valueL -= element.scrollLeft || 0;
      }
    } while (element = element.parentNode);
    return {left:valueL, top:valueT};
  };

vq.utils.VisUtils.scrollOffset = function (element) {
    var valueT = 0, valueL = 0;
      do {
        valueT += element.scrollTop  || 0;
  	    valueL += element.scrollLeft || 0;
      } while (element = element.parentNode);
    return {left : valueL, top: valueT};
  };

vq.utils.VisUtils.outerHTML = function(node){
        // if IE, Chrome take the internal method otherwise build one
        return node.outerHTML || (
                                 function(n){
                                     var div = document.createElement('div'), h;
                                     div.appendChild( n.cloneNode(true) );
                                     h = div.innerHTML;
                                     div = null;
                                     return h;
                                 })(node);
};

vq.utils.VisUtils.translateToReferenceCoord = function(coord,panel) {
    var offset = vq.utils.VisUtils.scrollOffset(panel.root.canvas());
    return {x:coord.x + offset.left,y:coord.y+offset.top};
};

/* found on stackoverflow.com
    credit to "broofa"
 */

vq.utils.VisUtils.guid = function() {
   return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
    });
};

vq.utils.VisUtils.openBrowserTab= function(url) {
        var new_window = window.open(url,'_blank');
        new_window.focus();
} ;

vq.utils.VisUtils.disabler = function(e) {
    if(e.preventDefault) { e.preventDefault();}
    return false;
};

$.fn.disableSelection = function() {
    return this.each(function() {
        $(this).attr('unselectable', 'on')
               .css({'-moz-user-select':'none',
                    '-o-user-select':'none',
                    '-khtml-user-select':'none',
                    '-webkit-user-select':'none',
                    '-ms-user-select':'none',
                    'user-select':'none'})
               .each(function() {
                    $(this).attr('unselectable','on')
                    .bind('selectstart',function(){ return false; });
               });
    });
};


vq.utils.VisUtils.enableSelect = function(el){
    if(el.attachEvent){
        el.detachEvent("onselectstart",vq.utils.VisUtils.disabler);
    } else {
        el.removeEventListener("selectstart",vq.utils.VisUtils.disabler,false);
    }
};

vq.utils.VisUtils.insertGCFCode = function() {

    document.write(' \
<!--[if lt IE 9]> \
    <script type="text/javascript" \
     src="http://ajax.googleapis.com/ajax/libs/chrome-frame/1/CFInstall.min.js"></script> \
    <style> \
     .chromeFrameInstallDefaultStyle { \
       width: 100%;  \
       border: 5px solid blue; \
     } \
    </style> \
            <div id="notice"></div> \
            <div id="prompt"></div> \
    <script> \
          function displayGCFText() { \
            document.getElementById("notice").innerHTML = "Internet Explorer has been detected." + \
            "Please install the Google Chrome Frame if it is not already installed.  This will enable" + \
            "HTML5 features necessary for the web application.<p>"+ \
            "If the install panel does not appear, please enable Compatibility mode in your browser and reload this page."; \
            }; \
     window.attachEvent("onload", function() { \
       CFInstall.check({ \
         mode: "inline",  \
         node: "prompt" \
       }); \
     }); \
    </script> \
  <![endif]-->');
};

/**
 * @class Provides a set of static functions for use in converting
 * a google.visualization.DataTable object into a Protovis consumable
 * JSON array.
 *
 * Intended to be used as a static class object to reserve a useful namespace.
 *
 * For the Circvis project, the fundamental data element is <b>node</b> JSON object consisting of:
 *      {chromosome, start, end, value, options}
 *          {string} chromosome
 *          {integer} start
 *          {integer} end
 *          {string} value
 *          {string} options
 *
 *
 *
 */

vq.utils.GoogleDSUtils = {};

    /**     Converts any DataTable object into an array of JSON objects, each object consisting of a single row in the
     *      DataTable.  The property label is obtained from the getColumnLabel() function of the google.visualiztion.DataTable class.
     *
     *      Column types listed as a 'number' are passed in as numeric data.  All other data types are passed in as strings.
     *
     *      The returned JSON array conforms to the common input format of Protovis visualizations.
     *
     * @param googleDataTable - google.visualizations.DataTable object returned by a google datasource query
     * @return data_array - JSON array.
     */


    vq.utils.GoogleDSUtils.dataTableToArray = function(googleDataTable) {
        var table = googleDataTable,
        data_array=[],
        headers_array=[],
        column_type=[];
        if (table == null) { return [];}
        for (col=0; col<table.getNumberOfColumns(); col++){
            headers_array.push(table.getColumnLabel(col));
            column_type.push(table.getColumnType(col));
        }


        for (row=0; row<table.getNumberOfRows(); row++){
            var temp_hash={};
            for (col=0; col<table.getNumberOfColumns(); col++){
                if(column_type[col].toLowerCase() == 'number') {
                    temp_hash[headers_array[col]]=table.getValue(row,col);
                } else {
                    temp_hash[headers_array[col]]=table.getFormattedValue(row,col);
                }
            }
            data_array.push(temp_hash);
        }
        return data_array;
    };

    /**
     *  Converts a special DataTable object into a network object used by CircVis.
     *  For a DataTable with fields: chr1, start1, end1, value1, options1, chr2, start2, end2, value2, options2, linkValue
     *  the function returns an array of JSON objects consisting of two <b>node</b> JSON objects and a <b>linkValue</b>:
     *  {node1,node2,linkValue}
     *
     *  The JSON array can then be passed into the NETWORK.DATA.data_array parameter used to configure Circvis.
     *
     * @param googleDataTable - google.visualizations.DataTable object returned by a google datasource query
     * @returns network_json_array - a JSON array representation of a Google Visualizations DataTable object. The column label is assigned as the property label
     */

    vq.utils.GoogleDSUtils.dataTableToNetworkArray = function(googleDataTable) {
        var data_array = this.dataTableToArray(googleDataTable);
        return data_array.map(function(c) { return {node1 : {chr:c['chr1'],start:c['start1'],end:c['end1'],value:c['value1'],options:c['options1']},
        node2 : {chr:c['chr2'],start:c['start2'],end:c['end2'],value:c['value2'],options:c['options2']}, linkValue:c['linkValue']};});
    };

    /** @private */
    vq.utils.GoogleDSUtils.getColIndexByLabel = function(table,label) {
        for (col = 0; col < table.getNumberOfColumns(); col++) {
            if (label.toLowerCase() == table.getColumnLabel(col).toLowerCase()) {
                return col;
            }
        }
        return -1;
    };


/**
 * @class Constructs a utility object for use with multiple-source Ajax requests.
 * If data must be retrieved from several sources before a workflow may be started, this tool can be used to
 * check that all necessary data is available.
 *
 * @param {integer} timeout number of milliseconds between checks for valid data.  Defaults to 200ms.
 * @param {total_checks}  total number of checks to perform. Defaults to 20.
 * @param {callback}    function to call if all data is successfully found
 * @param {args}    an object containing the variables which will be assigned values by the Ajax responses.
 * @param {args}    function called if timeout reached without check object being filled.
 */

vq.utils.SyncDatasources = function(timeout,total_checks,success_callback,args,fail_callback){

        if (timeout && !isNaN(timeout)) {
            this.timeout = timeout;
        } else {
            this.timeout = 200;
        }
        if (total_checks && !isNaN(total_checks)) {
            this.num_checks_until_quit = total_checks;
        } else {
            this.num_checks_until_quit = 20;
        }
        if (args instanceof Object) {
            this.args = args;
        } else {
            console.log('Error: variable array not passed to timer initialize method.');
            return;
        }
        if (success_callback instanceof Function) {
            this.success_callback = success_callback
        } else {
            console.log('Error: callback function not passed to timer initialize method.');
            return;
        }
     if (fail_callback instanceof Function) {
            this.fail_callback = fail_callback
        }
        this.num_checks_so_far = 0;
    };

    /**
     * Initiates the data object poll.  After the maximum number of checks, a log is filed on the console and the object
     *  aborts the polling operation.
     */

    vq.utils.SyncDatasources.prototype.start_poll = function() {
        var that = this;
        setTimeout(function() { that.poll_args();},that.timeout);
    };

    /** @private */
    vq.utils.SyncDatasources.prototype.check_args = function(){
        var check = true;
        for (arg in this.args) {
            if (this.args[arg] == null) { check = false;}
        }
        return check;
    };

    /** @private */
    vq.utils.SyncDatasources.prototype.poll_args = function(){
        var that=this;
        if (this.check_args()) { this.success_callback.apply(); return false;}
        this.num_checks_so_far++;
        if(this.num_checks_so_far >= this.num_checks_until_quit) {
            console.log('Maximum number of polling events reached.  Datasets not loaded.  Aborting.');
            if (this.fail_callback === undefined) { return false;}
            else {this.fail_callback.apply(); return false;}
        }
        setTimeout(function() { that.poll_args();},that.timeout);
    };


 vq.sum = function(list,func) { 
    if (typeof func =='function')  {
        return _.reduce(list,function(a,b,index){ return a+func.call({},b,index);},0);
    } else if (typeof func == 'string') {
        return _.reduce(list,function(a,b){ return a[func]+b[func];},0);
    } else {
        return _.reduce(list,function(a,b){ return a+b;},0);
};
    };

//import from science.js

(function(root){
var science = {version: "1.9.1"}; // semver
science.stats = {};
science.stats.mean = function(x) {
  var n = x.length;
  if (n === 0) return NaN;
  var m = 0,
      i = -1;
  while (++i < n) m += (x[i] - m) / (i + 1);
  return m;
};

science.stats.variance = function(x) {
  var n = x.length;
  if (n < 1) return NaN;
  if (n === 1) return 0;
  var mean = science.stats.mean(x),
      i = -1,
      s = 0;
  while (++i < n) {
    var v = x[i] - mean;
    s += v * v;
  }
  return s / (n - 1);
};

science.stats.median = function(x) {
  return science.stats.quantiles(x, [.5])[0];
};
science.stats.mode = function(x) {
  x = x.slice().sort(science.ascending);
  var mode,
      n = x.length,
      i = -1,
      l = i,
      last = null,
      max = 0,
      tmp,
      v;
  while (++i < n) {
    if ((v = x[i]) !== last) {
      if ((tmp = i - l) > max) {
        max = tmp;
        mode = last;
      }
      last = v;
      l = i;
    }
  }
  return mode;
};
// Uses R's quantile algorithm type=7.
science.stats.quantiles = function(d, quantiles) {
  d = d.slice().sort(science.ascending);
  var n_1 = d.length - 1;
  return quantiles.map(function(q) {
    if (q === 0) return d[0];
    else if (q === 1) return d[n_1];

    var index = 1 + q * n_1,
        lo = Math.floor(index),
        h = index - lo,
        a = d[lo - 1];

    return h === 0 ? a : a + h * (d[lo] - a);
  });
};

science.ascending = function(a, b) {
  return a - b;
};
root.science = science;
})(vq);/* vq.events.js */

/** @namespace The namespace for event classes. **/
vq.events = {};

vq.events.Event = function(label,source,obj) {

    this.id = label || '';
    this.source =source || null;
    this.obj = obj || {} ;
};

vq.events.Event.prototype.dispatch = function() {
    vq.events.Dispatcher.dispatch(this);
};

/*
Dispatcher
    Manages Listeners
            Two types of listeners:
                    Global - event of type X from any source
                    Distinct - event of type X from source Z

                    addListener and removeListener are overloaded to accept both kinds
                    dispatchEvent accepts an vq.events.Event object
                            Event object is Global if source == null
                            Event object is Distinct if source typeof == 'string'
 */

vq.events.Dispatcher = (function() {
    //private methods and variables
        var eventList = {};
    return {
          addListener : function(label) {
            var id,handler;
            if (label === undefined || arguments.length < 2) { return; }
            if(arguments.length == 2 && typeof arguments[1] == 'function') {
                handler = arguments[1];
                id = null;
            } else if (arguments.length == 3 && typeof arguments[1] == 'string') {
                id = arguments[1], handler = arguments[2];
            } else { return; }
                if (eventList[label] === undefined) {
                    eventList[label] = {};
                }
                if (eventList[label][id] === undefined) {
                    eventList[label][id] = [];
                }
                 eventList[label][id].push(handler);
        },

        removeListener : function(label) {
            var id,handler;
            if (label === undefined || arguments.length < 2) { return; }
            if(arguments.length == 2 && typeof arguments[1] == 'function') {
                handler = arguments[1];
                id = null;
            } else if (arguments.length == 3 && typeof arguments[1] == 'string') {
                id = arguments[1], handler = arguments[2];
            }  else { return; }
            if (eventList[label] === undefined || eventList[label][id] === undefined) {
                return;
            }
            eventList[label][id].forEach(function(e,index) {
                if (e === handler) {
                    eventList[label][id].splice(index,1);
                }
            });
        },

        dispatch : function(event) {
            var source = event.source || null;
  	    var event_id = event.id || null;
            var i = null,f = null;
            if (event_id == null || eventList[event_id] === undefined) { return;}
            if (eventList[event_id][source] !== undefined) {
                i =eventList[event_id][source].length;
                while (i--) {
                     f =  eventList[event_id][source][i];
                   f.call(event,event.obj);
                }
            }
            if (eventList[event_id][null] !== undefined) {
                 i =eventList[event_id][null].length;
                while (i--) {
                    f =  eventList[event_id][null][i];
                   f.call(event,event.obj);
                }
            }
        }
};

})();

/* vq.hovercard.js */


/*
 * @class creates a Hovercard with options to persist the display and offer multiple actions, data, tools
 *
 * <pre>
 *     {
 *     timeout : {Number} - Milliseconds to persist the display after cursor has left the event source.  If self_hover is true, the
 *          hovercard also cancels the timer.
 *     target_mark : {HTMLElement} - Event source that represents the protovis Mark as an SVG/HTML Element
 *     data_config : {Object} - designates the display for the data section.  Each Object in the config consists of
 *              {title : property}
 *                      title : {String} - Title of the property to be displayed
 *                       property : {String/Function} - The string value of the property to be displayed or a function that returns a string.
 *                                                                  The function is passed the target's data as a parameter.
 *
 *      self_hover : {Boolean} - If true, placing the mouse cursor over the hovercard cancels the timer which hides the hovercard
 *      include_header : {Boolean} - If true, the header of the data panel is displayed.
 *       include_footer : {Boolean} - If true, the footer containing the CLOSE [X} action is displayed at the bottom of the hovercard
 *       include_frame : {Boolean} - If true, the frame that contains the hovercard actions (move,pin, etc) is displayed.
 *     </pre>
 */

vq.Hovercard = function(options) {
    this.id = vq.utils.VisUtils.guid();
    this.hovercard = document.createElement('div',this.id);
    $(this.hovercard).addClass('hovercard');
    this.lock_display = false;
    if (options) {
        this.timeout = options.timeout || 800;
        this.target_mark = options.target || null;
        this.data_config = options.data_config || null;
        this.tool_config = options.tool_config ||  null;
        this.self_hover = options.self_hover || true;
        this.offset = options.offset || {top:0, left:0};
        this.include_footer = options.include_footer != null ? options.include_footer : this.self_hover || false;
        this.include_header = options.include_header != null ? options.include_header :  this.self_hover || true;
        this.include_frame = options.include_frame != null ? options.include_frame :  false;
    }
};

vq.Hovercard.prototype.show = function(anchorTarget,dataObject) {
    var that = this;
    if (!anchorTarget) { throw 'vq.Hovercard.show: target div not found.'; return;}
    this.target =  anchorTarget;
    $('<div></div>').addClass('data').html(this.renderCard(dataObject)).appendTo(that.hovercard);
    if (this.tool_config) {
        $('<div></div>').addClass('links').html(this.renderTools(dataObject)).appendTo(that.hovercard);
    }
    if (this.include_footer) $(this.hovercard).append(this.renderFooter());

    this.placeInDocument();
    this.start = function() {that.startOutTimer();};
    this.cancel = function() {
        $(that.target_mark).off('mouseout',that.start,false);
        that.cancelOutTimer();
    };
    this.close = function() {that.destroy();};
    $(this.target_mark).on('mouseout',that.start);
    $(this.getContainer()).on('mouseover',that.cancel);
    $(this.getContainer()).on('mouseout',that.start);

};

vq.Hovercard.prototype.startOutTimer = function(param_timeout) {
    var that = this;
    var timeout = param_timeout || that.timeout;
    if (!this.outtimer_id){ this.outtimer_id = window.setTimeout(function(){ that.trigger(); }, timeout); }
};

vq.Hovercard.prototype.cancelOutTimer =  function() {
    if (this.outtimer_id){
        window.clearTimeout(this.outtimer_id);
        this.outtimer_id = null;
    }
};

vq.Hovercard.prototype.trigger = function (){
    if(this.outtimer_id) {
        window.clearTimeout(this.outtimer_id);
        this.outtimer_id = null;
        this.destroy();
    }
    return false;
};

vq.Hovercard.prototype.togglePin = function() {
    this.lock_display = !this.lock_display || false;
    var that = this;
    if ($(this.getContainer()).hasClass('pinned')) {
        $(this.getContainer()).on('mouseout',that.start).removeClass("pinned");
    } else {
        $(this.target_mark).off('mouseout',that.start);
        $(this.getContainer()).off('mouseout',that.start);
        this.cancelOutTimer();
        $(this.getContainer()).addClass("pinned");
    }
};

vq.Hovercard.prototype.placeInDocument = function(){
    var card = this.hovercard;
    var target = this.target;
    var offset = $(target).offset();
    card.style.display='block';
    $('body').append(card);
    $(card).offset({top: offset.top, // + offset.height,//+ (20 * this.transform.invert().k ) + 'px';
        left:  offset.left + $(card).outerWidth() > $('body').outerWidth() ? offset.left - $(card).outerWidth() : offset.left}); // + offset.width});// + (20 * this.transform.invert().k  ) + 'px';

    if (this.include_frame) {
        this.frame = this.renderFrame();
        $(card).prepend(this.frame);
        this.attachMoveListener();}
    $(card).show();

};

vq.Hovercard.prototype.hide = function() {
    if(!this.self_hover || !this.over_self) {
       $(this.hovercard).hide();
    }
};

vq.Hovercard.prototype.destroy = function() {
    this.hide();
    this.target_mark.removeEventListener('mouseout',this.start, false);
    this.getContainer().removeEventListener('mouseout',this.start,false);
    this.cancelOutTimer();
    if (this.getContainer().parentNode == document.body) {
        document.body.removeChild(this.getContainer());
    }
};

vq.Hovercard.prototype.isHidden = function() {
    return  $(this.hovercard).is(':hidden');
};

vq.Hovercard.prototype.renderCard = function(dataObject) {
    return  this.renderData(dataObject);
};

vq.Hovercard.prototype.attachMoveListener = function() {
    var that = this;
    var pos= {}, offset = {};

    function activateDrag(evt) {
        var ev = !evt?window.event:evt;
        //don't listen for mouseout if its a temp card
        if ($(that.getContainer()).hasClass("temp")) {
            $(that.getContainer()).off('mouseout',that.start);
        }
        //begin tracking mouse movement!
        $(window).on('mousemove',trackMouse);
        offset = vq.utils.VisUtils.cumulativeOffset(that.hovercard);
        pos.top = ev.clientY ? ev.clientY : ev.pageY;
        pos.left = ev.clientX ? ev.clientX : ev.pageX;
        //don't allow text selection during drag
        $(window).on('selectstart',vq.utils.VisUtils.disabler);
    }
    function disableDrag() {
        //stop tracking mouse movement!
        $(window).off('mousemove',trackMouse);
        //enable text selection after drag
        $(window).off('selectstart',vq.utils.VisUtils.disabler);
        //start listening again for mouseout if its not pinned
        if (!$(that.getContainer()).hasClass("pinned")) {
            $(that.getContainer()).on('mouseout',that.start);
        }
        pos = {};
    }
    function trackMouse(evt) {
        var ev = !evt?window.event:evt;
        var x = ev.clientX ? ev.clientX : ev.pageX;
        var y = ev.clientY ? ev.clientY : ev.pageY;
        $(that.hovercard).offset({left: offset.left + (x - pos.left),
            top : offset.top +  (y - pos.top)});
    }
    //track mouse button for begin/end of drag
    $(this.move_div).on('mousedown',activateDrag);
    $(this.move_div).on('mouseup' , disableDrag);
    //track mouse button in window, too.
    $(window).on('mouseup' , disableDrag);
};


vq.Hovercard.prototype.renderFrame = function() {
    var that = this;
    var frame = document.createElement('div');
    $(frame).addClass('tools');
    this.move_div = document.createElement('span');
    $(this.move_div).addClass('move').attr('title','Drag to move').html('<i class="icon-move"></i>').appendTo(frame);
    this.pin_div = document.createElement('span');
    $(this.pin_div).addClass('pin').attr('title','Click to pin').html('<i class="icon-pushpin"></i>')
        .on('click', pin_toggle)
        .appendTo(frame);
    function pin_toggle() {
        that.togglePin();
        return false;
    }
    return frame;
};

vq.Hovercard.prototype.renderTools = function(dataObject) {
    var that = this;
    var get = vq.utils.VisUtils.get;
    var table = document.createElement('table');
    var tBody = document.createElement("tbody");
    $(table).append(tBody);

    if (this.tool_config) {
        for (var key in this.tool_config) {
            try {
                if (!this.tool_config.hasOwnProperty(key)) continue;
                var link = document.createElement('a');
                var href = this.tool_config[key].href;
                if (_.isFunction(href) && href(dataObject)) {
                    link.setAttribute('href',href(dataObject));
                }else if (!_.isFunction(href) && href) {
                    link.setAttribute('href', href);
                }
                else {
                    continue;
                }

                // After a link is clicked, always destroy the hovercard.
                $(link).on("click", function() {
                    $(that.getContainer()).off('mouseover',that.cancel);
                    that.startOutTimer(1000);
                });

                //$(link).attr('target',"_blank");
                $(link).html(key);
                if(this.tool_config[key].key) {
                    var icon = document.createElement('i');
                    $(icon).addClass('icon-'+this.tool_config[key].key);
                    $(link).prepend(icon);
                }
                var trow = tBody.insertRow(-1);
                var tcell= trow.insertCell(-1);
                $(tcell).append(link);
            } catch(e) {
                console.warn('Data not found for tools in tooltip. ' + e);
            }
        }
    }
    return table;
};

vq.Hovercard.prototype.renderData = function(dataObject) {
    var get = vq.utils.VisUtils.get;
    var table = document.createElement('table');
    if (typeof dataObject == 'object') {
        if (this.include_header) {
            var thead = table.createTHead();
            var thead_row = thead.insertRow(-1);
            var thead_cell = thead_row.insertCell(-1);
            thead_cell.innerHTML = 'Property';
            thead_cell = thead_row.insertCell(-1);
            thead_cell.innerHTML = 'Value';
        }
        var tBody = document.createElement("tbody");
        table.appendChild(tBody);

        if (this.data_config) {
            for (var key in this.data_config) {
                try {
                    if (!this.data_config.hasOwnProperty(key)) continue;
                    var trow = tBody.insertRow(-1);
                    var tcell= trow.insertCell(-1);
                    tcell.innerHTML = '<b>' + key + '</b>:';
                    tcell.style.textAlign = 'right';
                    tcell= trow.insertCell(-1);
                    if (typeof  this.data_config[key] == 'function') {
                        tcell.innerHTML= '<span>' +  this.data_config[key](dataObject) + '</span>';
                    }else {
                        tcell.innerHTML= '<span>' +  get(dataObject,this.data_config[key]) + '</span>';
                    }
                } catch(e) {
                    console.warn('Data not found for tool tip: ' + e);
                }

            }
        } else {
            _.keys(dataObject).forEach(function(key) {
                try {
                    var trow = tBody.insertRow(-1);
                    var tcell= trow.insertCell(-1);
                    tcell.innerHTML = '<b>' + key + '</b>:';
                    tcell = trow.insertCell(-1);
                    tcell.innerHTML = '<span>' + get(dataObject,key) + '</span>';
                } catch (e) {
                    console.warn('Data not found for tool tip: ' + e);
                }
            });
        }

    }
    else if ( typeof dataObject == 'string') {
        return dataObject;
    }
    return table;
};

vq.Hovercard.prototype.getContainer = function() {
    return this.hovercard;
};

vq.Hovercard.prototype.renderFooter = function() {
    var that = this;
    var footer = document.createElement('div');
    $(footer).addClass('footer');
    // footer.setAttribute('style',"text-align:right;font-size:13px;margin-right:5px;color:rgb(240,10,10);cursor:pointer;");
    var close = document.createElement('span');
    function hideHovercard() {
        that.destroy();
        return false;
    }
    $(close).on('click',hideHovercard);
    $('<i></i>').addClass('icon-remove').html('').appendTo(close);
    $(footer).append(close);
    return footer;
};

/**
 *
 * @class provides an anchor div for a target object this is "in scope" or using the mouse cursor.
 *  The anchor div's location is used to instantiate a vq.Hovercard object that
 *  provides self_hover, moveable, pin-able and tools
 *
 *
 * The configuration object has the following options:
 *
 * <pre>
 *
 * {
 *  timeout : {Number} - number of milliseconds (ms) before the box is shown. Default is 1000,
 *  close_timeout : {Number} - number of milliseconds (ms) the box continues to appear after 'mouseout' - Default is 0,
 *  param_data : {Boolean} -  If true, the object explicitly passed into the function at event (mouseover) time is used as the
 *          data.  If false, the data point underlying the event source (panel, dot, etc) is used.  Default is false.
 *  on_mark : {Boolean} - If true, the box is placed in respect to the event source mark.  If false, the box is placed in
 *          respect to the cursor/mouse position.  Defaults to false.
 *
 * include_header : {Boolean} - Place Label/Value headers at top of box.  Defaults to true.
 * include_footer : {Boolean} - Place "Close" footer at bottom of box.  Defaults to false.
 * self_hover : {Boolean} - If true, the box will remain visible when the cursor is above it.  Creates the "hovercard" effect.
 *          The footer must be rendered to allow the user to close the box.  Defaults to false.
 * data_config : {Object} - Important!  This configures the content of the hovering box.  This object is identical to the
 *          "tooltip_items" configuration in Circvis.  Ex. { Chr : 'chr', Start : 'start', End : 'end'}.  Defaults to null
 * }
 *
 * </pre>
 *
 * @param opts {JSON Object} - Configuration object defined above.
 */

vq.hovercard = function(opts) {

    var hovercard, anchor_div;
    var hovercard_div_id =  'vq_hover';

    function createHovercard(d) {
        var mark = this;
        var obj = d3.select(this);
        var info = opts.param_data ? d : obj.datum();
        var mouse_x = d3.event.pageX, mouse_y = d3.event.pageY;
        opts.canvas_id = opts.canvas_id || $('div svg').get(0);
        opts.self_hover = true;
        opts.include_frame = true;
        opts.include_footer = true;
        opts.target = mark;

        var $canvas = $('#'+opts.canvas_id).first().parent();

        var c_id = opts.canvas_id || $canvas.attr('id') || 'fixme'; //this.root.canvas();
        if (!$('#' + c_id+'_rel').length) {
            $canvas.prepend('<div id='+ c_id+'_rel></div>');
            var relative_div = $('#'+c_id+'_rel');
            relative_div.css({'position':'relative','top':'0px','zIndex':'-1'});
        }
        else {
            relative_div = $('#' + c_id+'_rel');
        }

        if (!$('#'+hovercard_div_id).length) {
            $('<div id='+ hovercard_div_id + '></div>').appendTo(relative_div).css({'position':'absolute','zIndex':'-1'});
        }

        anchor_div = $('#' +hovercard_div_id).get(0);
        $(anchor_div).offset({'left': mouse_x, 'top': mouse_y});
        //opts.transform = t;

        hovercard = new vq.Hovercard(opts);
        hovercard.show(anchor_div,info);
    };
    return createHovercard;
};



return vq;
}));
