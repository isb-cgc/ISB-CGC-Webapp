(function(){

	var root = this;
	var _ = root._;

 	var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXTZ';
 	var chrom_keys = vq.data.genome.chrom_keys;
 	var chrom_attr = vq.data.genome.chrom_attr;
 	
 	var fg = root.FeatureGenerator = function(options) {

 		var defaults = {
 				fraction_not_genomic : 0,
 				nodes: {
 					fields : [ //{property:'mut', max:400, roundOff:true}
 						]
 				},
 				edges: { 
 				fields: [
 					]
 				}
 			};
 		this.options = {};
 		_.extend(this.options,defaults,options);
		this.clinical_labels = ['CLIN','SAMP'];
		this.genomic_labels = ['GEXP','METH','CNVR','MIRN','GNAB'];
		this.probability_odd_chr_label = 0.05;
		this.chrom_attr = {
	    '1' : { "length": 247249719 },
        '2' : { "length": 242951149 },     
        '3' : { "length": 199501827 },
        '4' : { "length": 191273063 },
        '5' : { "length": 180857866 },
        '6' : { "length": 170899992 },
        '7' : { "length": 158821424 },
        '8' : { "length": 146274826 },
        '9' : { "length": 140273252 },
        '10' : { "length": 135374737 },
	    '11' : { "length": 134452384 },
	    '12' : { "length": 132349534 },
	    '13' : { "length": 114142980 },
        '14' : { "length": 106368585 },
        '15' : { "length": 100338915 },
        '16' : { "length": 88827254 },
        '17' : { "length": 78774742 },
        '18' : { "length": 76117153 },
        '19' : { "length": 63811651 },
        '20' : { "length": 62435964 },
        '21' : { "length": 46944323 },
        '22' : { "length": 49691432 },
        'M' : { "length": 16571 },
        'X' : { "length": 154913754 },
        'Y' : { "length": 57772954  }
		};
	};

	_.extend(fg.prototype,{
		generateRandomFeature : function(fraction_not_genomic) { 
			var fraction = fraction_not_genomic || this.options.fraction_not_genomic;
			if(fraction && parseFloat(fraction) && fraction <= 1) {
				var node = Math.random() > fraction ? this.generateFeature() : this.generateClinicalNode();
			}
		    return node },

	   generateClinicalNode : function() {
		    var node = this.generateFeature();
		    var source = this.clinical_labels[(Math.random()*this.clinical_labels.length) >>> 0];
		    var label_arr = node.label.split(':');
		    label_arr[0] = ['B','C'][Math.random() * 2 >>> 0];
		    label_arr[1] = source;
		    label_arr[3] = label_arr[4] = label_arr[5] = "";
		    node.label = label_arr.join(':');
		    node.chr = node.start = node.end = node.source = node.mutation_count = "";
		    return node;
		},

	    generateFeature : function() {
	        var source = this.genomic_labels[(Math.random()*this.genomic_labels.length) >>> 0];
	        var label = _.chain(_.range(0,4)).reduce(function(a,b) { return a+chars[Math.random()*chars.length >>> 0];},'').value();
	        var in1 = Math.random()*(chrom_keys.length) >>> 0;
	        //put in unmapped chromsomes sometimes
	        var chr1 = chrom_keys[in1] + ['_random',''][+(Math.random() > this.probability_odd_chr_label)];
	       	var other_fields = this.options.nodes.fields.map(function(field) {
	       		var p = Math.random() * field.max; 
	       		if (field.roundOff) p = p >>> 0;
	       		return {property: field.property, value: p};
	       	});
	        //make a good start number with our without a good chromsome
	        var start1 = this.chrom_attr[chr1] ? Math.random() * (this.chrom_attr[chr1].length - 50000) >>> 0 : 20;
	        var feature = {label:'N:'+ source +':'+label+':'+chr1+':'+start1+':'+(start1+50000)+'::',chr:chr1,start:start1,end:start1
	                + 50000,source:source};
	        other_fields.forEach(function(field) {
	                	feature[field.property] = field.value;
	        	 });
	         return feature;
		 },
		
		generateAssociation : function(fraction_not_genomic) {
			var fraction = fraction_not_genomic || this.options.fraction_not_genomic;
	        var val1 = (Math.random()*0.3).toFixed(4);
	        var nodeType = [this.generateClinicalNode,this.generateFeature][+(Math.random() > fraction)];
	        var association =  {node1:nodeType.call(this), node2:this.generateFeature.call(this)};
	        var other_fields = this.options.edges.fields.map(function(field) {
	       		var p = Math.random() * field.max; 
	       		if (field.roundOff) p = p >>> 0;
	       		return {property: field.property, value: p};
	       	});
	       	other_fields.forEach(function(field) {
	                	association[field.property] = field.value;
	        	 });
	         return association;
    	}

	});

})();