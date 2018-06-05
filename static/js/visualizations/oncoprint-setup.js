/* globals cbio, QuerySession */
/* jshint devel: true, laxbreak: true*/
var stringListUnique = function(list) {
    var seen = {};
    var ret = [];
    for (var i=0; i<list.length; i++) {
	var string = list[i];
	if (!seen[string]) {
	    seen[string] = true;
	    ret.push(string);
	}
    }
    return ret;
};

var utils = {
    'isWebGLAvailable': function() {
	var canvas = document.createElement("canvas");
	var gl = canvas.getContext("webgl")
	  || canvas.getContext("experimental-webgl");
	return (gl && gl instanceof WebGLRenderingContext);
    },
    'getUnavailableMessageHTML': function() {
	return 'Oncoprint cannot be displayed because <a href="https://get.webgl.org/">your browser does not support WebGL</a>.';
    },
    'timeoutSeparatedLoop': function (array, loopFn) {
	// loopFn is function(elt, index, array) {
	var finished_promise = new $.Deferred();
	var loopBlock = function (i) {
	    if (i >= array.length) {
		finished_promise.resolve();
		return;
	    }

	    loopFn(array[i], i, array);
	    setTimeout(function () {
		loopBlock(i + 1);
	    }, 0);
	};
	loopBlock(0);
	return finished_promise.promise();
    },
    'sign': function (x) {
	if (x > 0) {
	    return 1;
	} else if (x < 0) {
	    return -1;
	} else {
	    return 0;
	}
    },
    'sign_of_diff': function(a,b) {
	if (a < b) {
	    return -1;
	} else if (a === b) {
	    return 0;
	} else if (a > b) {
	    return 1;
	}
    },
    'invertArray': function (arr) {
	var ret = {};
	for (var i = 0; i < arr.length; i++) {
	    ret[arr[i]] = i;
	}
	return ret;
    },
    'makeSVGElement': function (tag, attrs) {
	var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
	for (var k in attrs) {
	    if (attrs.hasOwnProperty(k)) {
		el.setAttribute(k, attrs[k]);
	    }
	}
	return el;
    },
    'objectValues': function(obj) {
	return Object.keys(obj).map(function(k) { return obj[k]; });
    },
    'proportionToPercentString': function(p) {
	var percent = 100*p;
	if (p < 0.03) {
	    // if less than 3%, use one decimal figure
	    percent = Math.round(10*percent)/10;
	} else {
	    percent = Math.round(percent);
	}
	return percent+'%';
    },
    'getIntegerRange': function(list_of_numbers) {
	var max = Number.NEGATIVE_INFINITY;
	var min = Number.POSITIVE_INFINITY;
	for (var i=0; i<list_of_numbers.length; i++) {
	    max = Math.max(list_of_numbers[i], max);
	    min = Math.min(list_of_numbers[i], min);
	}
	return [Math.floor(min), Math.ceil(max)];
    },
    'deepCopyObject': function (obj) {
	return $.extend(true, ($.isArray(obj) ? [] : {}), obj);
    }
};

var tooltip_utils = {
    'sampleViewAnchorTag': function (study_id, sample_id) {
	var href = cbio.util.getLinkToSampleView(study_id, sample_id);
	return '<a href="' + href + '" target="_blank">' + sample_id + '</a>';
    },
    'patientViewAnchorTag': function(study_id, patient_id) {
	var href = cbio.util.getLinkToPatientView(study_id, patient_id);
	return '<a href="' + href + '" target="_blank">' + patient_id + '</a>';
    },
    'makeGenePanelPopupLink': function(gene_panel_id) {
	var anchor = $('<a href="#" oncontextmenu="return false;">'+gene_panel_id+'</a>');
	anchor.ready(anchor.click(function() {
	    window.cbioportal_client.getGenePanelsByPanelId({panel_id:[gene_panel_id]}).then(function(response) {
		var genes = response[0].genes.map(function(g) { return g.hugoGeneSymbol; }).sort();
		var popup = open("", "_blank", "width=500,height=500");
		var div = popup.document.createElement("div");
		popup.document.body.appendChild(div);

		$('<h3 style="text-align:center;">'+gene_panel_id+'</h3><br>').appendTo(div);
		$('<span>'+genes.join("<br>")+'</span>').appendTo(div);
	    });
	}));
	return anchor;
    },
    'makeHeatmapTrackTooltip': function(genetic_alteration_type, data_type, link_id) {
	return function (d) {
	    var data_header = '';
	    var profile_data = 'NaN';
	    if (genetic_alteration_type === "MRNA_EXPRESSION") {
		data_header = 'MRNA: ';
	    } else if (genetic_alteration_type === "PROTEIN_LEVEL") {
		data_header = 'PROT: ';
	    }
	    if (d.profile_data) {
		profile_data = d.profile_data.toString();
	    }
	    var ret = data_header + '<b>' + profile_data + '</b><br>';
	    ret += (data_type === 'sample' ? (link_id ? tooltip_utils.sampleViewAnchorTag(d.study, d.sample) : d.sample) : (link_id ? tooltip_utils.patientViewAnchorTag(d.study, d.patient) : d.patient));
	    return ret;
	};
    },
    'makeGeneticTrackTooltip':function(data_type, link_id) {
	var listOfMutationOrFusionDataToHTML = function(data) {
	    return data.map(function(d) {
		var ret = $('<span>');
		ret.append('<b>'+d.amino_acid_change+'</b>');
		if (d.cancer_hotspots_hotspot) {
		    //ret.append('<img src="/static/img/cancer-hotspots.svg" title="Hotspot" style="height:11px; width:11px; margin-left:3px"/>');
		}
		if (d.oncokb_oncogenic) {
		    //ret.append('<img src="/static/img/oncokb-oncogenic-1.svg" title="'+d.oncokb_oncogenic+'" style="height:11px; width:11px;margin-left:3px"/>');
		}
		//If we have data for the binary custom driver annotations, append an icon to the tooltip with the annotation information
		if (d.driver_filter && showBinaryCustomDriverAnnotation === "true") {
		    //ret.append('<img src="/static/img/driver.png" title="'+d.driver_filter+': '+d.driver_filter_annotation+'" alt="driver filter" style="height:11px; width:11px;margin-left:3px"/>');
		}
		//If we have data for the class custom driver annotations, append an icon to the tooltip with the annotation information
		if (d.driver_tiers_filter && showTiersCustomDriverAnnotation === "true") {
		    //ret.append('<img src="/static/img/driver_tiers.png" title="'+d.driver_tiers_filter+': '+d.driver_tiers_filter_annotation+'" alt="driver tiers filter" style="height:11px; width:11px;margin-left:3px"/>');
		}
		return ret;
	    });
	};
	var listOfCNAToHTML = function(data) {
	    return data.map(function(d) {
		var ret = $('<span>');
		ret.append('<b>'+d.cna+'</b>');
		if (d.oncokb_oncogenic) {
		    ret.append('<img src="/static/img/oncokb-oncogenic-1.svg" title="'+d.oncokb_oncogenic+'" style="height:11px; width:11px;margin-left:3px"/>');
		}
		return ret;
	    });
	};
	var oncogenic = ["likely oncogenic", "predicted oncogenic", "oncogenic"];
	return function (d) {
	    var ret = $('<div>');
	    var mutations = [];
	    var cna = [];
	    var mrna = [];
	    var prot = [];
	    var fusions = [];
	    for (var i = 0; i < d.data.length; i++) {
		var datum = d.data[i];
		if (datum.genetic_alteration_type === "MUTATION_EXTENDED") {
		    var tooltip_datum = {'amino_acid_change': datum.amino_acid_change, 'driver_filter': datum.driver_filter,
			                 'driver_filter_annotation': datum.driver_filter_annotation, 'driver_tiers_filter': datum.driver_tiers_filter,
			                 'driver_tiers_filter_annotation': datum.driver_tiers_filter_annotation};
		    if (datum.cancer_hotspots_hotspot) {
			tooltip_datum.cancer_hotspots_hotspot = true;
		    }
		    if (typeof datum.oncokb_oncogenic !== "undefined" && oncogenic.indexOf(datum.oncokb_oncogenic) > -1) {
			tooltip_datum.oncokb_oncogenic = datum.oncokb_oncogenic;
		    }
		    (datum.oncoprint_mutation_type === "fusion" ? fusions : mutations).push(tooltip_datum);
		} else if (datum.genetic_alteration_type === "COPY_NUMBER_ALTERATION") {
		    var disp_cna = {'-2': 'HOMODELETED', '-1': 'HETLOSS', '1': 'GAIN', '2': 'AMPLIFIED'};
		    if (disp_cna.hasOwnProperty(datum.profile_data)) {
			var tooltip_datum = {
			    cna: disp_cna[datum.profile_data]
			};
			if (typeof datum.oncokb_oncogenic !== "undefined" && oncogenic.indexOf(datum.oncokb_oncogenic) > -1) {
			    tooltip_datum.oncokb_oncogenic = datum.oncokb_oncogenic;
			}
			cna.push(tooltip_datum);
		    }
		} else if (datum.genetic_alteration_type === "MRNA_EXPRESSION" || datum.genetic_alteration_type === "PROTEIN_LEVEL") {
		    if (datum.oql_regulation_direction) {
			(datum.genetic_alteration_type === "MRNA_EXPRESSION" ? mrna : prot)
				.push(datum.oql_regulation_direction === 1 ? "UPREGULATED" : "DOWNREGULATED");
		    }
		}
	    }
	    if (fusions.length > 0) {
		ret.append('Fusion: ');
		fusions = listOfMutationOrFusionDataToHTML(fusions);
		for (var i = 0; i < fusions.length; i++) {
		    if (i > 0) {
			ret.append(",");
		    }
		    ret.append(fusions[i]);
		}
		ret.append('<br>');
	    }
	    if (mutations.length > 0) {
		ret.append('Mutation: ');
		mutations = listOfMutationOrFusionDataToHTML(mutations);
		for (var i = 0; i < mutations.length; i++) {
		    if (i > 0) {
			ret.append(", ");
		    }
		    ret.append(mutations[i]);
		}
		ret.append('<br>');
	    }
	    if (cna.length > 0) {
		ret.append('Copy Number Alteration: ');
		cna = listOfCNAToHTML(cna);
		for (var i = 0; i < cna.length; i++) {
		    if (i > 0) {
			ret.append(",");
		    }
		    ret.append(cna[i]);
		}
		ret.append('<br>');
	    }
	    if (mrna.length > 0) {
		ret.append('MRNA: <b>' + mrna.join(", ") + '</b><br>');
	    }
	    if (prot.length > 0) {
		ret.append('PROT: <b>' + prot.join(", ") + '</b><br>');
	    }
	    if (typeof d.coverage !== "undefined") {
		ret.append("Coverage: ");
		var coverage_elts = d.coverage.filter(function (x) {
		    return x !== "1"; /* code for whole-exome seq */
		}).map(function (id) {
		    return tooltip_utils.makeGenePanelPopupLink(id);
		});
		if (d.coverage.indexOf("1") > -1) {
		    coverage_elts.push("Whole-Exome Sequencing");
		}
		for (var i = 0; i < coverage_elts.length; i++) {
		    if (i > 0) {
			ret.append(",");
		    }
		    ret.append(coverage_elts[i]);
		}
		ret.append("<br>");
	    }
	    if (d.na) {
		ret.append('Not sequenced');
		ret.append('<br>');
	    }
	    ret.append((data_type === 'sample' ? (link_id ? tooltip_utils.sampleViewAnchorTag(d.study_id, d.sample) : d.sample) : (link_id ? tooltip_utils.patientViewAnchorTag(d.study_id, d.patient) : d.patient)));
	    return ret;
	};
    },
    'makeClinicalTrackTooltip':function(attr, data_type, link_id) {
	return function(d) {
	    var ret = '';
	    if (attr.attr_id === "NO_CONTEXT_MUTATION_SIGNATURE") {
		for (var i=0; i<attr.categories.length; i++) {
		    ret += '<span style="color:' + attr.fills[i] + ';font-weight:bold;">'+attr.categories[i]+'</span>: '+d.attr_val_counts[attr.categories[i]]+'<br>';
		}
	    } else {
		var attr_vals = ((d.attr_val_counts && Object.keys(d.attr_val_counts)) || []);
		if (attr_vals.length > 1) {
		    ret += 'values:<br>';
		    for (var i = 0; i < attr_vals.length; i++) {
			var val = attr_vals[i];
			ret += '<b>' + val + '</b>: ' + d.attr_val_counts[val] + '<br>';
		    }
		} else if (attr_vals.length === 1) {
		    ret += 'value: <b>' + attr_vals[0] + '</b><br>';
		}
	    }
	    ret += (link_id ? (data_type === 'sample' ? tooltip_utils.sampleViewAnchorTag(d.study_id, d.sample) : tooltip_utils.patientViewAnchorTag(d.study_id, d.patient))
			    : (data_type === 'sample' ? d.sample : d.patient));
	    return ret;
	};
    }
};

var makeComparatorMetric = function(array_spec) {
    var metric = {};
    for (var i=0; i<array_spec.length; i++) {
	var equiv_values = [].concat(array_spec[i]);
	for (var j=0; j<equiv_values.length; j++) {
	    metric[equiv_values[j]] = i;
	}
    }
    return metric;
};
var comparator_utils = {
    'makeGeneticComparator': function (distinguish_mutation_types, distinguish_recurrent) {
	var fusion_key = 'disp_fusion';
	var cna_key = 'disp_cna';
	var cna_order = makeComparatorMetric(['amp', 'homdel', 'gain', 'hetloss', 'diploid', undefined]);
	var mut_type_key = 'disp_mut';
	var mut_order = (function () {
	    var _order;
	    if (!distinguish_mutation_types && !distinguish_recurrent) {
		return function (m) {
		    return ({'true': 1, 'false': 2})[!!m];
		}
	    } else if (!distinguish_mutation_types && distinguish_recurrent) {
		_order = makeComparatorMetric([["3'utr", "5'utr", "upstream", "downstream", "intergenic", "transcript", "mirna", 'inframe_rec', 'missense_rec', 'promoter_rec', 'trunc_rec', 'inframe', 'promoter', 'regulatory', 'intron', 'trunc'], 'missense', undefined]);
	    } else if (distinguish_mutation_types && !distinguish_recurrent) {
		_order = makeComparatorMetric([["3'utr", "5'utr", "upstream", "downstream"], ["intergenic", "transcript", "mirna"], ['trunc', 'trunc_rec'], ['inframe','inframe_rec'], ['promoter', 'promoter_rec'], ['missense', 'missense_rec'], ['intron'], ['regulatory'], undefined, true, false]);
	    } else if (distinguish_mutation_types && distinguish_recurrent) {
		_order = makeComparatorMetric(["3'utr", "5'utr", "upstream", "downstream", "intergenic", "transcript", "mirna", 'trunc_rec', 'inframe_rec', 'promoter_rec', 'missense_rec', 'trunc', 'inframe', 'promoter', 'missense', 'regulatory', 'intron', undefined, true, false]);
	    }
	    return function(m) {
		return _order[m];
	    }
	})();
	var mrna_key = 'disp_mrna';
	var rppa_key = 'disp_prot';
	var regulation_order = makeComparatorMetric(['up', 'down', undefined]);

	var mandatory = function(d1, d2) {
	    // Test fusion
	    if (d1[fusion_key] && !(d2[fusion_key])) {
		return -1;
	    } else if (!(d1[fusion_key]) && d2[fusion_key]) {
		return 1;
	    }

	    // Next, CNA
	    var cna_diff = utils.sign(cna_order[d1[cna_key]] - cna_order[d2[cna_key]]);
	    if (cna_diff !== 0) {
		return cna_diff;
	    }




	    // Next, mutation type

		var d1var, d2var;
	    if(d1[mut_type_key] == null){
	    	d1 = 'undefined';
		}
		else{
	    	d1 = Object.keys(d1[mut_type_key]).sort(mut_order)[0];
		}
		if(d2[mut_type_key] == null){
	    	d2 = 'undefined';
		}
		else{
	    	d2 = Object.keys(d2[mut_type_key]).sort(mut_order)[0];
		}

		//var mut_type_diff = utils.sign(mut_order(d1[mut_type_key] == null ? 'undefined': Object.keys(d1[mut_type_key]))
		//									- mut_order(d2[mut_type_key] == null ? 'undefined' : d2[mut_type_key][0]));
		var mut_type_diff = utils.sign(mut_order(d1) - mut_order(d2));
	    if (mut_type_diff !== 0) {
			return mut_type_diff;
		}

	    // Next, mrna expression
	    var mrna_diff = utils.sign(regulation_order[d1[mrna_key]] - regulation_order[d2[mrna_key]]);
	    if (mrna_diff !== 0) {
		return mrna_diff;
	    }

	    // Next, protein expression
	    var rppa_diff = utils.sign(regulation_order[d1[rppa_key]] - regulation_order[d2[rppa_key]]);
	    if (rppa_diff !== 0) {
		return rppa_diff;
	    }

	    // If we reach this point, there's no order difference
	    return 0;
	}
	var preferred = function (d1, d2) {
	    // First, test if either is not sequenced
	    var ns_diff = utils.sign(+(!!d1.na) - (+(!!d2.na)));
	    if (ns_diff !== 0) {
		return ns_diff;
	    }

	    return mandatory(d1, d2);
	};
	return {
	    preferred: preferred,
	    mandatory: mandatory
	};
    },
    'makeNumericalComparator': function (value_key) {
	return function (d1, d2) {
	    if (d1.na && d2.na) {
		return 0;
	    } else if (d1.na && !d2.na) {
		return 2;
	    } else if (!d1.na && d2.na) {
		return -2;
	    } else {
		return (d1[value_key] < d2[value_key] ? -1 : (d1[value_key] === d2[value_key] ? 0 : 1));
	    }
	};
    },
    'stringClinicalComparator': function (d1, d2) {
	if (d1.na && d2.na) {
	    return 0;
	} else if (d1.na && !d2.na) {
	    return 2;
	} else if (!d1.na && d2.na) {
	    return -2;
	} else {
	    return d1.attr_val.localeCompare(d2.attr_val);
	}
    },
    'makeCountsMapClinicalComparator': function(categories) {
	return function (d1, d2) {
	    if (d1.na && d2.na) {
		return 0;
	    } else if (d1.na && !d2.na) {
		return 2;
	    } else if (!d1.na && d2.na) {
		return -2;
	    } else {
		var d1_total = 0;
		var d2_total = 0;
		for (var i = 0; i < categories.length; i++) {
		    d1_total += (d1.attr_val[categories[i]] || 0);
		    d2_total += (d2.attr_val[categories[i]] || 0);
		}
		if (d1_total === 0 && d2_total === 0) {
		    return 0;
		} else if (d1_total === 0) {
		    return 1;
		} else if (d2_total === 0) {
		    return -1;
		} else {
		    var d1_max_category = 0;
		    var d2_max_category = 0;
		    for (var i=0; i<categories.length; i++) {
			if (d1.attr_val[categories[i]] > d1.attr_val[categories[d1_max_category]]) {
			    d1_max_category = i;
			}
			if (d2.attr_val[categories[i]] > d2.attr_val[categories[d2_max_category]]) {
			    d2_max_category = i;
			}
		    }
		    if (d1_max_category < d2_max_category) {
			return -1;
		    } else if (d1_max_category > d2_max_category) {
			return 1;
		    } else {
			var cmp_category = categories[d1_max_category];
			var d1_prop = d1.attr_val[cmp_category]/d1_total;
			var d2_prop = d2.attr_val[cmp_category]/d2_total;
			return utils.sign(d1_prop - d2_prop);
		    }
		}
	    }
	}
    }

};
comparator_utils.numericalClinicalComparator = comparator_utils.makeNumericalComparator('attr_val');
comparator_utils.heatmapComparator = comparator_utils.makeNumericalComparator('profile_data');


window.CreateOncoprinterWithToolbar = function (plot_selector, _ctr_selector, _toolbar_selector) {

    ctr_selector = $(plot_selector).find(_ctr_selector);
	toolbar_selector = $(plot_selector).find(_toolbar_selector);

    $(plot_selector).find('.oncoprint .oncoprint-diagram-toolbar-buttons').show();

    if (!utils.isWebGLAvailable()) {
        $(ctr_selector).append("<p>"+utils.getUnavailableMessageHTML()+"</p>");
        $(toolbar_selector).hide();
        $("#inner-container").hide();
            return;
    }

    $(ctr_selector).css({'position':'relative'});

    var LoadingBar = (function() {
	var $loading_bar_svg = $('<svg width="100" height="50"></svg><br>')
				.appendTo(ctr_selector)
				.append(utils.makeSVGElement("rect", {
							    "width":100,
							    "height":25,
							    "stroke":"black",
							    "fill":"white"
							}));
	$loading_bar_svg.append(utils.makeSVGElement("rect", {
							    "width":100,
							    "height":25,
							    "stroke":"black",
							    "fill":"white"
							}));
	var $loading_bar = $(utils.makeSVGElement("rect", {
							"width":0,
							"height":25,
							"fill":"green",
							"stroke":"dark green"}))
				.appendTo($loading_bar_svg);
	var $loading_bar_msg = $(utils.makeSVGElement("text", {
					    'x': 2,
					    'y':15,
					    'font-size':11,
					    'font-family':'Arial',
					    'font-weight':'normal',
					    'text-anchor':'start',
					}))
		.appendTo($loading_bar_svg);

	return {
	    'hide': function() {
		$loading_bar_svg.hide();
	    },
	    'show': function() {
		$loading_bar_svg.show();
	    },
	    'msg': function(str) {
		$loading_bar_msg[0].textContent = str;
	    },
	    'update': function(proportion) {
		$loading_bar.attr('width', proportion*parseFloat($loading_bar_svg.attr('width')));
	    },
	    'DOWNLOADING_MSG': 'Downloading data..'
	};
    })();

    LoadingBar.hide();

    var oncoprint = new window.Oncoprint(ctr_selector, 1050);

    var toolbar_fade_out_timeout;
    $(toolbar_selector).css({'visibility':'visible'});
    $(ctr_selector).add(toolbar_selector).on("mouseover", function(evt) {
	$(toolbar_selector).stop().animate({opacity:1});
	clearTimeout(toolbar_fade_out_timeout);
    });
    $(ctr_selector).add(toolbar_selector).on("mouseleave", function(evt) {
	clearTimeout(toolbar_fade_out_timeout);
	toolbar_fade_out_timeout = setTimeout(function() {
	    $(toolbar_selector).stop().animate({opacity:0});
	}, 700);
    });

    var State = (function () {

        var setSortOrder = function (order) {
            oncoprint.setSortConfig({'type': 'order', 'order': order});
        };

        var getPercent = function (proportion) {
            return Math.round(proportion * 100) + '%';
        }

        return {
            'first_genetic_alteration_track': null,
            'genetic_alteration_tracks': {}, // track_id -> gene
			'using_sample_data': true,
            'cell_padding_on': true,
            'unaltered_cases_hidden': false,
            'mutations_colored_by_type': true,
            'sorted_by_mutation_type': true,
            'user_specified_order': null,
            'altered_ids': [],
            'unaltered_ids': [],
            'ids': [],
            'trackIdsInOriginalOrder': {},
            'addGeneticTracks': function (genes) {
                genes = [].concat(genes);
                oncoprint.suppressRendering();
                var track_ids = [];
                for (var i = 0; i < genes.length; i++) {
                    var track_params = {
                        'rule_set_params': (this.mutations_colored_by_type ?
                            window.geneticrules.genetic_rule_set_different_colors_no_recurrence :
                            window.geneticrules.genetic_rule_set_same_color_for_all_no_recurrence),
                        'label': genes[i],
                        'target_group': 1,
                        'sortCmpFn': comparator_utils.makeGeneticComparator(this.sorted_by_mutation_type),
                        'tooltipFn': tooltip_utils.makeGeneticTrackTooltip('sample', false),
                        'na_z': 1.1
                    };
                    var new_track_id = oncoprint.addTracks([track_params])[0];
                    track_ids.push(new_track_id);
                    State.genetic_alteration_tracks[new_track_id] = genes[i];
                    if (State.first_genetic_alteration_track === null) {
                        State.first_genetic_alteration_track = new_track_id;
                    } else {
                        oncoprint.shareRuleSet(State.first_genetic_alteration_track, new_track_id);
                    }
                }
                oncoprint.releaseRendering();
                return track_ids;
            },
            setData: function (data_by_gene, id_key, altered_ids_by_gene, id_order, gene_order) {

                if (id_order) {
                    oncoprint.setSortConfig({'type': 'order', 'order': id_order});
                } else {
                	oncoprint.setSortConfig({'type': 'tracks'});
                }

                LoadingBar.show();
                LoadingBar.update(0);

                oncoprint.removeAllTracks();

                this.first_genetic_alteration_track = null;
                this.genetic_alteration_tracks = {};
                this.addGeneticTracks(Object.keys(data_by_gene));

                var present_ids = {};
                for (var gene in data_by_gene) {
                    if (data_by_gene.hasOwnProperty(gene)) {
                        var data = data_by_gene[gene];
                        for (var i = 0; i < data.length; i++) {
                            present_ids[data[i][id_key]] = false;
                        }
                    }
                }
                id_order = id_order || Object.keys(present_ids);
                for (var i = 0; i < id_order.length; i++) {
                    if (present_ids.hasOwnProperty(id_order[i])) {
                        present_ids[id_order[i]] = true;
                    }
                }
                this.ids = Object.keys(present_ids).filter(function (x) {
                    return !!present_ids[x];
                });

                var altered_percentage_by_gene = {};
                for (var gene in altered_ids_by_gene) {
                    if (altered_ids_by_gene.hasOwnProperty(gene)) {
                        var altered_id_count = altered_ids_by_gene[gene].filter(function (x) {
                            return !!present_ids[x];
                        }).length;
                        altered_percentage_by_gene[gene] = Math.round(100 * altered_id_count / this.ids.length);
                    }
                }

                var altered_ids = {};
                for (var gene in altered_ids_by_gene) {
                    if (altered_ids_by_gene.hasOwnProperty(gene)) {
                        var _altered_ids = altered_ids_by_gene[gene];
                        for (var i = 0; i < _altered_ids.length; i++) {
                            altered_ids[_altered_ids[i]] = true;
                        }
                    }
                }
                this.altered_ids = Object.keys(altered_ids).filter(function (x) {
                    return !!present_ids[x];
                });

                this.unaltered_ids = [];
                for (var i = 0; i < this.ids.length; i++) {
                    if (!altered_ids[this.ids[i]]) {
                        this.unaltered_ids.push(this.ids[i]);
                    }
                }

                oncoprint.suppressRendering();
                oncoprint.keepSorted(false);
                var tracks_done = 0;
                var tracks_total = Object.keys(this.genetic_alteration_tracks).length;
                for (var track_id in this.genetic_alteration_tracks) {
                    if (this.genetic_alteration_tracks.hasOwnProperty(track_id)) {
                        var gene = this.genetic_alteration_tracks[track_id];
                        oncoprint.setTrackData(track_id, data_by_gene[gene], id_key);
                        oncoprint.setTrackInfo(track_id, altered_percentage_by_gene[gene] + '%');
                        LoadingBar.update(tracks_done / tracks_total);
                    }
                }

                if (gene_order) {
                    var gene_to_track = {};
                    for (var track_id in this.genetic_alteration_tracks) {
                        if (this.genetic_alteration_tracks.hasOwnProperty(track_id)) {
                            gene_to_track[this.genetic_alteration_tracks[track_id]] = parseInt(track_id, 10);
                        }
                    }
                    for (var i = 0; i < gene_order.length; i++) {
                        var gene = gene_order[i];
                        if (i === 0) {
                            oncoprint.moveTrack(gene_to_track[gene], null);
                        } else {
                            var prev_gene = gene_order[i - 1];
                            oncoprint.moveTrack(gene_to_track[gene], gene_to_track[prev_gene]);
                        }
                    }
                }
                oncoprint.keepSorted();
                oncoprint.releaseRendering();

                oncoprint.setHorzZoomToFit(this.altered_ids);
                oncoprint.scrollTo(0);

                LoadingBar.hide();

            },
            getIds: function () {
                return this.ids.slice();
            },
            getUnalteredIds: function () {
                return unaltered_ids;
            },
        };
    })();

    var Toolbar = (function() {
	var events = [];
	var qtips = [];
	var elements = [];

	return {
	    'addEventHandler': function($elt, evt, callback) {
		$elt.on(evt, callback);
		events.push({'$elt':$elt, 'evt':evt, 'callback':callback});
	    },
	    'onMouseDownAndClick': function($elt, mousedown_callback, click_callback) {
		this.addEventHandler($elt, 'mousedown', mousedown_callback);
		this.addEventHandler($elt, 'click', click_callback);
	    },
	    'onHover': function($elt, enter_callback, leave_callback) {
		this.addEventHandler($elt, 'mouseenter', enter_callback);
		this.addEventHandler($elt, 'mouseleave', leave_callback);
	    },
	    'onClick': function($elt, callback) {
		this.addEventHandler($elt, 'click', callback);
	    },
	    'destroy': function() {
		// Destroy events
		for (var i=0; i<events.length; i++) {
		    var event = events[i];
		    event['$elt'].off(event['evt'], event['callback']);
		}

		// Destroy qtips

		// Destroy elements
	    },
	};
    })();

    oncoprint.setCellPaddingOn(State.cell_padding_on);

    (function setUpToolbar() {
	var zoom_discount = 0.7;
	var to_remove_on_destroy = [];
	var to_remove_qtip_on_destroy = [];


	var appendTo = function ($elt, $target) {
	    $elt.appendTo($target);
	    to_remove_on_destroy.push($elt);
	};
	var addQTipTo = function ($elt, qtip_params) {
	    $elt.qtip(qtip_params);
	    to_remove_qtip_on_destroy.push($elt);
	};

	var setUpHoverEffect = function ($elt) {
	    $elt.hover(function () {
		$(this).css({'fill': '#0000FF',
		    'font-size': '18px',
		    'cursor': 'pointer'});
	    },
		    function () {
			$(this).css({'fill': '#87CEFA',
			    'font-size': '12px'});
		    }
	    );
	};

	var setUpButton = function ($elt, img_urls, qtip_descs, index_fn, callback) {
	    index_fn = index_fn || function() { return 0; };
	    var updateButton = function () {
		if (img_urls.length > 0) {
		    $elt.find('img').attr('src', img_urls[index_fn()]);
		}
		$elt.css({'background-color':'#efefef'});
	    };
	    var hoverButton = function () {
		if (img_urls.length > 0) {
		    $elt.find('img').attr('src', img_urls[(index_fn() + 1) % img_urls.length]);
		}
		$elt.css({'background-color':'#d9d9d9'});
	    };
	    if (qtip_descs.length > 0) {
		addQTipTo($elt, {
		    content: {text: function () {
			    return qtip_descs[index_fn()];
			}},
		    position: {my: 'bottom middle', at: 'top middle', viewport: $(window)},
		    style: {classes: 'qtip-light qtip-rounded qtip-shadow qtip-lightwhite'},
		    show: {event: "mouseover"},
		    hide: {fixed: true, delay: 100, event: "mouseout"}
		});
	    }
	    Toolbar.onHover($elt, function() {
		hoverButton();
	    }, function() {
		updateButton();
	    });
	    Toolbar.onMouseDownAndClick($elt, function() {
		$elt.css({'background-color':'#c7c7c7'});
	    },
	    function() {
		callback();
		updateButton();
	    });
	    updateButton();
	};
	var $zoom_slider = (function setUpZoom() {
	    var zoom_elt = $(toolbar_selector).find('.oncoprint_diagram_slider_icon');
	    var $slider = $('<input>', {
		type: "range",
		min: 0,
		max: 1,
		step: 0.0001,
		value: 1,
		change: function (evt) {
		    if (evt.originalEvent) {
			this.value = oncoprint.setHorzZoom(parseFloat(this.value));
		    } else {
			this.value = oncoprint.getHorzZoom();
		    }
		},
	    });

	    $('.oncoprint_zoom_scale_input').on("keypress", function(e) {
		if (e.keyCode === 13) {
		    // 'Enter' key
		    var new_zoom = parseFloat($('.oncoprint_zoom_scale_input').val())/100;
		    new_zoom = Math.min(1, new_zoom);
		    new_zoom = Math.max(0, new_zoom);
		    oncoprint.setHorzZoom(new_zoom);
		}
	    });
	    oncoprint.onHorzZoom(function() {
		$zoom_slider.trigger('change');
		$('.oncoprint_zoom_scale_input').val(Math.round(10000*oncoprint.getHorzZoom())/100);
	    });

	    appendTo($slider, zoom_elt);
	    addQTipTo($slider, {
		id: 'oncoprint_zoom_slider_tooltip',
		prerender: true,
		content: {text: 'Zoom in/out of oncoprint'},
		position: {my: 'bottom middle', at: 'top middle', viewport: $(window)},
		style: {classes: 'qtip-light qtip-rounded qtip-shadow qtip-lightwhite'},
		show: {event: "mouseover"},
		hide: {fixed: true, delay: 100, event: "mouseout"}
	    });
	    // use aria-labelledby instead of aria-describedby, as Section 508
	    // requires that inputs have an explicit label for accessibility
	    $slider.attr('aria-labelledby', 'qtip-oncoprint_zoom_slider_tooltip');
	    $slider.removeAttr('aria-describedby');
	    setUpHoverEffect($slider);

	    setUpButton($(toolbar_selector).find('.oncoprint_zoomout'), [], ["Zoom out of oncoprint"], null, function () {
		oncoprint.setHorzZoom(oncoprint.getHorzZoom()*zoom_discount);
	    });
	    setUpButton($(toolbar_selector).find('.oncoprint_zoomin'), [], ["Zoom in to oncoprint"], null, function () {
		oncoprint.setHorzZoom(oncoprint.getHorzZoom()/zoom_discount);
	    });

	    return $slider;
	})();

	(function setUpToggleCellPadding() {
	    setUpButton($(toolbar_selector).find('.oncoprint-diagram-removeWhitespace-icon'),
		    [static_img_url +'unremoveWhitespace.svg',static_img_url +'removeWhitespace.svg'],
		    ["Remove whitespace between columns", "Show whitespace between columns"],
		    function () {
			return (State.cell_padding_on ? 0 : 1);
		    },
		    function () {
			State.cell_padding_on = !State.cell_padding_on;
			oncoprint.setCellPaddingOn(State.cell_padding_on);
		    });
	})();
	(function setUpHideUnalteredCases() {
	    setUpButton($(toolbar_selector).find('.oncoprint-diagram-removeUCases-icon'),
		    [static_img_url +'unremoveUCases.svg', static_img_url +'removeUCases.svg'],
		    ['Hide unaltered cases', 'Show unaltered cases'],
		    function () {
			return (State.unaltered_cases_hidden ? 1 : 0);
		    },
		    function () {
			State.unaltered_cases_hidden = !State.unaltered_cases_hidden;
			if (State.unaltered_cases_hidden) {
			    oncoprint.hideIds(State.unaltered_ids, true);
			} else {
			    oncoprint.hideIds([], true);
			}
		    });
	})();
	(function setUpZoomToFit() {
	    setUpButton($(toolbar_selector).find('.oncoprint_zoomtofit'), [], ["Zoom to fit altered cases in screen"], null, function () {
		oncoprint.setHorzZoomToFit(State.altered_ids);
		oncoprint.scrollTo(0);
	    });
	})();
	(function setUpChangeMutationRuleSet() {
	    $('.oncoprint_diagram_showmutationcolor_icon').show();
	    $('.oncoprint_diagram_mutation_color').hide();
	    var setGeneticAlterationTracksRuleSet = function(rule_set_params) {
		var genetic_alteration_track_ids = Object.keys(State.genetic_alteration_tracks);
		oncoprint.setRuleSet(genetic_alteration_track_ids[0], rule_set_params);
		for (var i = 1; i < genetic_alteration_track_ids.length; i++) {
		    oncoprint.shareRuleSet(genetic_alteration_track_ids[0], genetic_alteration_track_ids[i]);
		}
	    };

	    setUpButton($(toolbar_selector).find('.oncoprint_diagram_showmutationcolor_icon'),
		    [static_img_url +'colormutations.svg', static_img_url +'uncolormutations.svg',static_img_url +'mutationcolorsort.svg'],
		    ['Show all mutations with the same color', 'Color-code mutations but don\'t sort by type', 'Color-code mutations and sort by type', ],
		    function () {
			if (State.mutations_colored_by_type && State.sorted_by_mutation_type) {
			    return 0;
			} else if (!State.mutations_colored_by_type) {
			    return 1;
			} else if (State.mutations_colored_by_type && !State.sorted_by_mutation_type) {
			    return 2;
			}
		    },
		    function () {
			oncoprint.keepSorted(false);
			oncoprint.suppressRendering();
			var genetic_alteration_track_ids = Object.keys(State.genetic_alteration_tracks);
			if (State.mutations_colored_by_type && !State.sorted_by_mutation_type) {
			    State.sorted_by_mutation_type = true;
			    for (var i=0; i<genetic_alteration_track_ids.length; i++) {
				oncoprint.setTrackSortComparator(genetic_alteration_track_ids[i], comparator_utils.makeGeneticComparator(true));
			    }
			} else if (State.mutations_colored_by_type && State.sorted_by_mutation_type) {
			    State.mutations_colored_by_type = false;
			    setGeneticAlterationTracksRuleSet(window.geneticrules.genetic_rule_set_same_color_for_all_no_recurrence);
			} else if (!State.mutations_colored_by_type) {
			    State.mutations_colored_by_type = true;
			    State.sorted_by_mutation_type = false;
			    setGeneticAlterationTracksRuleSet(window.geneticrules.genetic_rule_set_different_colors_no_recurrence);
				for (var i=0; i<genetic_alteration_track_ids.length; i++) {
				oncoprint.setTrackSortComparator(genetic_alteration_track_ids[i], comparator_utils.makeGeneticComparator(false));
			    }
			}
			oncoprint.keepSorted();
			oncoprint.releaseRendering();
		    });
	})();
	(function setUpDownload() {
	    var xml_serializer = new XMLSerializer();
	    addQTipTo($(toolbar_selector).find('.oncoprint-diagram-downloads-icon'), {
				style: {classes: 'qtip-light qtip-rounded qtip-shadow qtip-lightwhite'},
				show: {event: "mouseover"},
				hide: {fixed: true, delay: 100, event: "mouseout"},
				position: {my: 'top center', at: 'bottom center', viewport: $(window)},
				content: {
					text: function() {
						return "<button class='oncoprint-diagram-download' type='png' style='cursor:pointer;width:90px;'>PNG</button> <br/>" +
							"<button class='oncoprint-diagram-download' type='svg' style='cursor:pointer;width:90px;'>SVG</button> <br/>" +
							"<button class='oncoprint-sample-download'  type='txt' style='cursor:pointer;width:90px;'>"+(State.using_sample_data ? "Sample" : "Patient")+" order</button>";
					    }
					    //TODO: add svgToPdf conversion from server side
					    //"<button class='oncoprint-diagram-download' type='pdf' style='cursor:pointer;width:90px;'>PDF</button> <br/>" +

				},
				events: {
					render: function (event) {
						$('body').on('click', '.oncoprint-diagram-download', function () {
							var fileType = $(this).attr("type");
							var two_megabyte_limit = 2000000;
							if (fileType === 'pdf')
							{
							    var svg = oncoprint.toSVG(true);
							    var serialized = cbio.download.serializeHtml(svg);
							    if (serialized.length > two_megabyte_limit) {
								alert("Oncoprint too big to download as PDF - please download as SVG");
								return;
							    }
							    cbio.download.initDownload(serialized, {
								filename: "oncoprint.pdf",
								contentType: "application/pdf",
								servletName: "svgtopdf.do"
							    });
							}
							else if (fileType === 'svg')
							{
								cbio.download.initDownload(oncoprint.toSVG(), {filename: "oncoprint.svg"});
							} else if (fileType === 'png')
							{
							    var img = oncoprint.toCanvas(function(canvas, truncated) {
								canvas.toBlob(function(blob) {
								    if (truncated) {
									alert("Oncoprint too large - PNG truncated to "+canvas.getAttribute("width")+" by "+canvas.getAttribute("height"));
								    }
								    saveAs(blob, "oncoprint.png");
								}, 'image/png');
							    }, 2);
							}
						});

						$('body').on('click', '.oncoprint-sample-download', function () {
							var idTypeStr = (State.using_sample_data ? "Sample" : "Patient");
							var content = idTypeStr + " order in the Oncoprint is: \n";
							content += oncoprint.getIdOrder().join('\n');
							var downloadOpts = {
								filename: 'OncoPrint' + idTypeStr + 's.txt',
								contentType: "text/plain;charset=utf-8",
								preProcess: false};

							// send download request with filename & file content info
							cbio.download.initDownload(content, downloadOpts);
						});
					}
				}
	    });
	})();
    })();
    return function(data_by_gene, id_key, altered_ids_by_gene, id_order, gene_order) {
	State.setData(data_by_gene, id_key, altered_ids_by_gene, id_order, gene_order);
    };
}