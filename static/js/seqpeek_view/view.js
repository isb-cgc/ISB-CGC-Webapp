define([
    "seqpeek/src/util/data_adapters",
    'seqpeek/src/builders/builder_for_existing_elements',
    "seqpeek/src/util/mini_locator",

    "./color_mapping/lesk_amino_acid",
    "./color_mapping/substitution_type"
],
function (
    SeqPeekDataAdapters, SeqPeekBuilder, SeqPeekMiniLocatorFactory,

    AminoAcidColorMappingFactory,
    SubstitutionTypeColorMappingFactory
) {
        var SAMPLE_HIGHLIGHT_MODES = {
            ALL: 1,
            HIGHLIGHT_SELECTED: 2
        };

        var DISPLAY_MODES = {
            ALL: 1,
            PROTEIN: 2
        };

    var INTERACTION_MODES = {
        ZOOM: 1,
        SELECT: 2
    };

        var MINI_LOCATOR_WIDTH = 400;
        var MINI_LOCATOR_HEIGHT = 24;

        var Y_AXIS_SCALE_WIDTH = 50;

        var VARIANT_TRACK_MAX_HEIGHT = 150;
        var TICK_TRACK_HEIGHT = 25;
        var REGION_TRACK_HEIGHT = 5;
        var PROTEIN_DOMAIN_HEIGHT = 20;
        var VIEWPORT_WIDTH = 900;
        var SAMPLE_PLOT_TRACK_STEM_HEIGHT = 30;
        var TRACK_SVG_WIDTH = VIEWPORT_WIDTH + Y_AXIS_SCALE_WIDTH;

        var EMPTY_TRACK_HEIGHT = 30;

        var AMINO_ACID_POSITION_FIELD_NAME = "uniprot_aapos";
        var COORDINATE_FIELD_NAME = "uniprot_aapos";
        var TYPE_FIELD_NAME = "variant_classification";
        var AMINO_ACID_MUTATION_FIELD_NAME = "amino_acid_mutation";
        var AMINO_ACID_WILDTYPE_FIELD_NAME = "amino_acid_wildtype";
        var DNA_CHANGE_FIELD_NAME = "dna_change";

        var SAMPLE_ID_FIELD_NAME = "sample_barcode";

        var DNA_CHANGE_KEY_FN = function(data_point) {
            var id = data_point[DNA_CHANGE_FIELD_NAME];
            var base_pairs = id.split("->");

            // Single base substitution?
            if (base_pairs[0] != "-" && base_pairs[0].length == 1 &&
                base_pairs[1] != "-" && base_pairs[1].length == 1) {
                return "SUBSTITUTION";
            }
            // Deletion?
            else if (base_pairs[1] == "-") {
                return "DELETION";
            }
            // Insertion of single base pair?
            else if (base_pairs[0] == "-" && base_pairs[1].length == 1) {
                return "INSERTION";
            }
            // Insertion of two or more base pairs?
            else if (base_pairs[0] == "-" && base_pairs[1].length > 1) {
                return "INSERTION+";
            }
            else {
                return "UNKNOWN " + id;
            }
        };

        var MUTATION_TYPE_KEY_FN = function(data_point) {
            return data_point[TYPE_FIELD_NAME];
        };

        var PROTEIN_CHANGE_KEY_FN = function(data_row) {
            return data_row[AMINO_ACID_MUTATION_FIELD_NAME] + "-" + data_row[AMINO_ACID_WILDTYPE_FIELD_NAME];
        };

        var GROUP_BY_CATEGORIES_FOR_PROTEIN_VIEW = {
            "Mutation Type": TYPE_FIELD_NAME,
            "DNA Change": DNA_CHANGE_KEY_FN,
            "Protein Change": PROTEIN_CHANGE_KEY_FN
        };

        var MUTATION_TYPE_COLOR_MAP = {
            Nonsense_Mutation: "#71C560",
            Silent: "#9768C4",
            Frame_Shift_Del: "#98B8B8",
            Frame_Shift_Ins: "#98B8B8",
            Missense_Mutation: "#4F473D",
            In_Frame_Ins: "#C1B14C",
            In_Frame_Del: "#C1B14C"
        };

        var TCGA_SIX_CATEGORIES = [
            "#71C560",
            "#9768C4",
            "#98B8B8",
            "#4F473D",
            "#C1B14C",
            "#B55381"
        ];

        var DNA_CHANGE_COLOR_MAP = {
            "SUBSTITUTION": {label: "Substitution", color: TCGA_SIX_CATEGORIES[0]},
            "DELETION":  {label: "Deletion", color:TCGA_SIX_CATEGORIES[1]},
            "INSERTION": {label: "Insertion (single base pair)", color:TCGA_SIX_CATEGORIES[2]},
            "INSERTION+": {label: "Insertion (multiple base pairs)", color: TCGA_SIX_CATEGORIES[3]}
        };

        var LOLLIPOP_COLOR_SCALE = d3.scale.category20();

        var NOT_SELECTED_DATA_POINT_COLOR = "rgba(170,170,170,0.2)";
        var UNKNOWN_TYPE_COLOR = "rgba(170,170,170,1.0)";

        var amino_acid_wildtype_color_map = AminoAcidColorMappingFactory.create();
        amino_acid_wildtype_color_map._amino_acid_mutation_field_name = AMINO_ACID_WILDTYPE_FIELD_NAME;

        var COLOR_BY_CATEGORIES = {
            "Mutation Type": {
                data_getter: MUTATION_TYPE_KEY_FN,
                getGroup: MUTATION_TYPE_KEY_FN,
                getGroupLabel: MUTATION_TYPE_KEY_FN,
                getKey: MUTATION_TYPE_KEY_FN,
                getColor: function (data_point) {
                    var id = MUTATION_TYPE_KEY_FN(data_point);
                    if (_.has(MUTATION_TYPE_COLOR_MAP, id)) {
                        return {
                            label: id,
                            color: MUTATION_TYPE_COLOR_MAP[id]
                        };
                    }
                    else {
                        return {
                            label: id,
                            color: UNKNOWN_TYPE_COLOR
                        };
                    }
                }
            },
            "Amino Acid Mutation": AminoAcidColorMappingFactory.create(),
            "Amino Acid Wildtype": amino_acid_wildtype_color_map,
            "Substitution Type": SubstitutionTypeColorMappingFactory.create()
        };

        var COLOR_BY_CATEGORIES_FOR_BAR_PLOT = {
            "Mutation Type": function(category_name, type_name) {
                if (_.has(MUTATION_TYPE_COLOR_MAP, type_name)) {
                    return MUTATION_TYPE_COLOR_MAP[type_name];
                }
                else {
                    return UNKNOWN_TYPE_COLOR;
                }
            },
            "DNA Change": function(category_name, type_name) {
                return LOLLIPOP_COLOR_SCALE(type_name);
            },
            "Protein Change": function(category_name, type_name) {
                return LOLLIPOP_COLOR_SCALE(type_name);
            }
        };

    var prototype = {
        initialize: function(target_table, data_bundle) {
            this.$target_table = $(target_table);
            this.data_bundle = data_bundle;

            this.sample_track_type = "sample_plot";
            this.sample_track_type_user_setting = this.sample_track_type;

            this.sample_highlight_mode = SAMPLE_HIGHLIGHT_MODES.ALL;
            this.current_view_mode = DISPLAY_MODES.PROTEIN;
            this.current_interaction_mode = INTERACTION_MODES.ZOOM;

            this.selected_group_by = this.__get_current_group_by("Mutation Type");
            this.selected_color_by_key = "Mutation Type";
            this.selected_color_by = this.__get_current_sample_color_by(this.selected_color_by_key);
            this.selected_bar_plot_color_by = COLOR_BY_CATEGORIES_FOR_BAR_PLOT["Mutation Type"];

            this.selected_patient_ids = [];

            this.selected_samples_map = null;
            this.selection_handler = null;
        },

        __get_current_sample_color_by: function(color_by_key) {
            return COLOR_BY_CATEGORIES[color_by_key];
        },

        __get_current_group_by: function(group_by_key) {
            return GROUP_BY_CATEGORIES_FOR_PROTEIN_VIEW[group_by_key];
        },

        render: function () {
            var seqpeek_data = [];
            var protein_data = this.data_bundle['protein'];
            var region_data = this.data_bundle['regions'];

            _.each(this.data_bundle['tracks'], function (track) {
                seqpeek_data.push({
                    variants: track['mutations'],
                    tumor_type: track['label'],
                    row_id: track['row_id'],
                    is_summary_track: track['type'] == 'summary',
                    track_type: track['type'] == 'summary' ? 'bar_plot' : undefined,
                    y_axis_type: this.sample_track_type_user_setting == "sample_plot" ? "lin" : "log2"
                });
            }, this);

            _.each(seqpeek_data, function(track_obj) {
                track_obj.target_element = this.$target_table.find("#" + track_obj.row_id)[0];
            }, this);

            var seqpeek_tick_track_element = _.first(this.$target_table.find("#seqpeek-tick-element"));

            this.maximum_samples_in_location = this.__find_maximum_samples_in_location(seqpeek_data);

            this.__render_tracks(seqpeek_data, region_data, protein_data['matches'], seqpeek_tick_track_element);
        },

        __build_seqpeek_config: function(region_array) {
            var self = this;

            var sample_plot_color_by_function = function(data_point) {
                if (self.sample_highlight_mode == SAMPLE_HIGHLIGHT_MODES.ALL) {
                    return self.selected_color_by.getColor(data_point).color;
                }
                else {
                    if (_.has(self.selected_samples_map, data_point["patient_id"])) {
                        return self.selected_color_by.getColor(data_point).color;
                    }
                    else {
                        return NOT_SELECTED_DATA_POINT_COLOR;
                    }
                }
            };

            return {
                region_data: region_array,
                viewport: {
                    width: VIEWPORT_WIDTH
                },
                bar_plot_tracks: {
                    bar_width: 5.0,
                    height: VARIANT_TRACK_MAX_HEIGHT,
                    stem_height: SAMPLE_PLOT_TRACK_STEM_HEIGHT,
                    color_scheme: this.selected_bar_plot_color_by
                },
                sample_plot_tracks: {
                    height: VARIANT_TRACK_MAX_HEIGHT,
                    stem_height: 30,
                    color_scheme: sample_plot_color_by_function
                },
                region_track: {
                    height: REGION_TRACK_HEIGHT,
                    color_scheme: {
                        "exon": "#555555"
                    }
                },
                protein_domain_tracks: {
                    source_key: "dbname",
                    source_order: ["PFAM", "SMART", "PROFILE"],
                    color_scheme: {
                        "PFAM": "lightgray",
                        "SMART": "darkgray",
                        "PROFILE": "gray"
                    },
                    label: function(match) {
                        return match["name"]
                    },
                    domain_height: PROTEIN_DOMAIN_HEIGHT
                },
                tick_track: {
                    height: TICK_TRACK_HEIGHT
                },
                region_layout: {
                    intron_width: 10,
                    exon_width: VIEWPORT_WIDTH

                },
                variant_layout: {
                    variant_width: 5.0
                },
                variant_data_location_field: AMINO_ACID_POSITION_FIELD_NAME,
                variant_data_type_field: this.selected_group_by,
                variant_data_source_field: SAMPLE_ID_FIELD_NAME,
                selection_handler: _.bind(this.__seqpeek_selection_handler, this)
            };
        },

        __render_tracks: function(tracks, region_array, protein_domain_matches, seqpeek_tick_track_element) {
            var seqpeek_config = this.__build_seqpeek_config(region_array);
            var seqpeek = SeqPeekBuilder.create(seqpeek_config);

            _.each(tracks, function(track_obj) {
                var track_elements_svg = d3.select(track_obj.target_element)
                    .append("svg")
                    .attr("width", TRACK_SVG_WIDTH)
                    .attr("height", VARIANT_TRACK_MAX_HEIGHT + PROTEIN_DOMAIN_HEIGHT)
                    .style("pointer-events", "none");

                var sample_plot_track_g = track_elements_svg
                    .append("g")
                    .style("pointer-events", "none")
                    .call(this.__set_track_g_position);

                var region_track_g = track_elements_svg
                    .append("g")
                        .style("pointer-events", "none")
                        .call(this.__set_track_g_position)
                    .append("g")
                    .style("pointer-events", "none");

                track_obj.track_info = this.__add_data_track(track_obj, seqpeek, sample_plot_track_g);
                track_obj.variant_track_svg = track_elements_svg;
                track_obj.sample_plot_track_g = sample_plot_track_g;

                seqpeek.addRegionScaleTrackToElement(region_track_g, { });

                seqpeek.addProteinDomainTrackToElement(protein_domain_matches, region_track_g, { });

                track_obj.region_track_svg = region_track_g;
            }, this);

            var tick_track_g = d3.select(seqpeek_tick_track_element)
                .append("svg")
                    .attr("width", TRACK_SVG_WIDTH)
                    .attr("height", TICK_TRACK_HEIGHT)
                    .style("pointer-events", "none")
                .append("svg:g")
                    .call(this.__set_track_g_position);

            seqpeek.addTickTrackToElement(tick_track_g);

            seqpeek.createInstances();

            _.each(tracks, function(track_obj) {
                var track_info = track_obj.track_info;
                var track_instance = track_info.track_instance;

                track_instance.setHeightFromStatistics();
                var variant_track_height = track_instance.getHeight();
                var track_screen_height;

                if (variant_track_height > 0) {
                    track_screen_height = variant_track_height
                }
                else {
                    track_screen_height = EMPTY_TRACK_HEIGHT
                }

                var total_track_height = track_screen_height + PROTEIN_DOMAIN_HEIGHT;

                track_obj.variant_track_svg.attr("height", total_track_height);
                track_obj.region_track_svg
                    .attr("transform", "translate(0," + (track_screen_height) + ")");

                this.__render_scales(track_obj.variant_track_svg, total_track_height, track_instance.statistics, track_obj.y_axis_type);
            }, this);

            var regions_start_coordinate = seqpeek.getRegionMetadata().start_coordinate;
            var regions_end_coordinate = seqpeek.getRegionMetadata().end_coordinate;

            var mini_locator_scale = MINI_LOCATOR_WIDTH / seqpeek.getRegionMetadata().total_width;
            this.__create_mini_locator(seqpeek.getProcessedRegionData(), seqpeek.region_layout, mini_locator_scale, regions_start_coordinate, regions_end_coordinate);

            seqpeek.scrollEventCallback(_.bind(function(d) {
                var visible_coordinates = d.visible_coordinates;
                this.mini_locator.render(visible_coordinates[0], visible_coordinates[1]);
            }, this));
            seqpeek.render();

            this.seqpeek = seqpeek;
        },

        __create_mini_locator: function(region_data, region_layout, scale, start_coordinate, end_coordinate) {
            var $mini_locator = this.$target_table.find("#seqpeek-mini-locator")
                .attr("width", MINI_LOCATOR_WIDTH)
                .attr("height", MINI_LOCATOR_HEIGHT);

            this.mini_locator = SeqPeekMiniLocatorFactory.create($mini_locator[0])
                .data(region_data)
                .region_layout(region_layout)
                .scale(scale);

            this.mini_locator.render(start_coordinate, end_coordinate);
        },

        __set_track_g_position: function(track_selector) {
            track_selector
                .attr("transform", "translate(" + Y_AXIS_SCALE_WIDTH + ",0)");
        },

        __render_scales: function(track_selector, total_track_height, track_statistics, scale_type_label) {
            if (track_statistics.max_samples_in_location == 2) {
                this.__render_scales_minimal(track_selector, total_track_height, track_statistics, scale_type_label, true);
            }
            if (track_statistics.max_samples_in_location <= 2) {
                this.__render_scales_minimal(track_selector, total_track_height, track_statistics, scale_type_label, false);
            }
            else {
                this.__render_scales_full(track_selector, total_track_height, track_statistics, scale_type_label, false);
            }
        },

        __render_scales_full: function(track_selector, total_track_height, track_statistics, scale_type_label, include_text) {
            var y_axis_label_font_size = 10;
            var y_axis_label_x = 10;

            var right = Y_AXIS_SCALE_WIDTH - 10;
            var scale_start = -(REGION_TRACK_HEIGHT + SAMPLE_PLOT_TRACK_STEM_HEIGHT);
            var type_label_x = 20.0;
            var type_label_y = scale_start + 15.0;

            var axis = track_selector
                .append("svg:g")
                .attr("class", "y-axis")
                .attr("transform", "translate(0," + total_track_height + ")");

            axis
                .append("svg:line")
                .attr("y1", scale_start)
                .attr("x1", right)
                .attr("y2", -total_track_height)
                .attr("x2", right)
                .style("stroke", "black");

            var domain = [
                track_statistics.min_samples_in_location,
                track_statistics.max_samples_in_location
            ];

            var scale = d3.scale.linear().domain(domain).range([scale_start, -total_track_height]);
            var ticks = [
                {
                    text: domain[0],
                    y: scale(domain[0]),
                    text_y: -5
                },
                {
                    text: domain[1],
                    y: scale(domain[1]) + 1,
                    text_y: +13
                }
            ];

            var tick_g = axis
                .selectAll(".tick")
                .data(ticks)
                .enter()
                .append("svg:g")
                    .attr("class", "y-axis-tick")
                    .attr("transform", function(d) {
                        return "translate(0," + d.y + ")";
                    });

            tick_g
                .append("svg:line")
                    .attr("y1", 0.0)
                    .attr("y2", 0.0)
                    .attr("x1", right - 10)
                    .attr("x2", right)
                    .style("stroke", "black");
            tick_g
                .append("svg:text")
                .attr("x", right - 15)
                .attr("y", function(d) {
                    return d.text_y;
                })
                .text(function(d) {
                    return d.text;
                })
                .style("text-anchor", "end");

            axis.append("svg:text")
                .attr("x", type_label_x)
                .attr("y", type_label_y)
                .text(scale_type_label);

            if (include_text) {
                axis.append("svg:text")
                    .attr("x", 0)
                    // Use the "y" attribute for horizontal positioning, because of the rotation.
                    .attr("y", y_axis_label_x)
                    .attr("transform", "rotate(-90)")
                    .attr("font-size", y_axis_label_font_size)
                    .text("Samples in location");
            }
        },

        __render_scales_minimal: function(track_selector, total_track_height, track_statistics, scale_type_label, draw_min_max) {
            var y_axis_label_font_size = 10;
            var y_axis_label_x = 10;

            var right = Y_AXIS_SCALE_WIDTH - 10;
            var scale_start = -(REGION_TRACK_HEIGHT + SAMPLE_PLOT_TRACK_STEM_HEIGHT);
            var type_label_x = 20.0;
            var type_label_y = scale_start + 30.0;

            var axis = track_selector
                .append("svg:g")
                .attr("class", "y-axis")
                .attr("transform", "translate(0," + total_track_height + ")");

            if (draw_min_max == true) {
                axis.append("svg:text")
                    .attr("x", right - 15)
                    .attr("y", -total_track_height + 10)
                    .attr("font-size", y_axis_label_font_size)
                    .text("max " + track_statistics.max_samples_in_location);

                axis.append("svg:text")
                    .attr("x", right - 15)
                    .attr("y", -total_track_height + 20)
                    .attr("font-size", y_axis_label_font_size)
                    .text("min " + track_statistics.min_samples_in_location);
            }

            axis.append("svg:text")
                .attr("x", type_label_x)
                .attr("y", type_label_y)
                .text(scale_type_label);

            axis.append("svg:text")
                .attr("x", 0)
                // Use the "y" attribute for horizontal positioning, because of the rotation.
                .attr("y", y_axis_label_x)
                .attr("transform", "rotate(-90)")
                .attr("font-size", y_axis_label_font_size)
                .text("Samples");
        },

        __find_maximum_samples_in_location: function(mutation_data) {
            var track_maximums = [];
            _.each(mutation_data, function(track_obj) {
                var grouped_data = SeqPeekDataAdapters.group_by_location(track_obj.variants, this.selected_group_by, COORDINATE_FIELD_NAME);
                SeqPeekDataAdapters.apply_statistics(grouped_data, function() {return 'all';});

                var max_number_of_samples_in_position = d3.max(grouped_data, function(data_by_location) {
                    return d3.max(data_by_location["types"], function(data_by_type) {
                        return data_by_type.statistics.total;
                    });
                });

                track_maximums.push(max_number_of_samples_in_position);
            }, this);

            return d3.max(track_maximums);
        },

        __add_data_track: function(track_obj, seqpeek_builder, track_target_svg) {
            var track_type = track_obj.track_type || this.sample_track_type_user_setting;
            var variants = track_obj.variants;

            if (track_type == "sample_plot") {
                return seqpeek_builder.addSamplePlotTrackWithArrayData(variants, track_target_svg, {
                }, track_obj.is_summary_track);
            }
            else {
                return seqpeek_builder.addBarPlotTrackWithArrayData(track_obj.variants, track_target_svg, {
                    max_samples_in_location: this.maximum_samples_in_location
                }, track_obj.is_summary_track);
            }
        },

        toggle_interaction_mode: function() {
            if (this.current_interaction_mode == INTERACTION_MODES.SELECT) {
                this.current_interaction_mode = INTERACTION_MODES.ZOOM;
            }
            else {
                this.current_interaction_mode = INTERACTION_MODES.SELECT;
            }

            this.__apply_interaction_mode(this.current_interaction_mode);
        },

        set_selection_handler: function(handler) {
            this.selection_handler = handler;
        },

        get_interaction_mode: function() {
            var mode_string_desc = {};
            mode_string_desc[INTERACTION_MODES.ZOOM] = 'zoom';
            mode_string_desc[INTERACTION_MODES.SELECT] = 'select';

            return mode_string_desc[this.current_interaction_mode];
        },

        __apply_interaction_mode: function(mode) {
            if (this.seqpeek === undefined) {
                return;
            }

            if (mode == INTERACTION_MODES.SELECT) {
                this.seqpeek.toggleSelectionMode();
            }
            else if (mode == INTERACTION_MODES.ZOOM) {
                this.seqpeek.toggleZoomMode();
            }
        },

        __seqpeek_selection_handler: function(id_list) {
            this.selected_patient_ids = id_list;

            if (! _.isFunction(this.selection_handler)) {
                return;
            }

            this.selection_handler(this.selected_patient_ids);
        }
    };

    return {
        create: function(target_table, data_bundle) {
            var view = Object.create(prototype, {});
            view.initialize(target_table, data_bundle);
            return view;
        }
    }
});
