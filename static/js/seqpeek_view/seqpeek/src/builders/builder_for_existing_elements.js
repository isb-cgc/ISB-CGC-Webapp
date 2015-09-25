define   (
[
    '../util/data_adapters',
    '../util/gene_region_utils',
    '../util/region_layouts',
    '../seqpeek_viewport',
    '../seqpeek_svg_context',
    '../variant_layout',
    '../tracks/bar_plot_track',
    '../tracks/sample_plot_track',
    '../tracks/region_scale_track',
    '../tracks/horizontal_tick_track',
    '../tracks/protein_domain_track'
],
function (
    DataAdapters,
    GeneRegionUtils,
    RegionLayouts,
    ViewportFactory,
    SeqPeekSVGContextFactory,
    VariantLayoutFactory,
    BarPlotTrackFactory,
    SamplePlotTrackFactory,
    RegionTrackFactory,
    TickTrackFactory,
    ProteinDomainTrackFactory
) {
    var BAR_PLOT_TRACK_MAX_HEIGHT = 100,
        SAMPLE_PLOT_TRACK_MAX_HEIGHT = 100,
        TICK_TRACK_HEIGHT = 25,
        REGION_TRACK_HEIGHT = 10;

    var DEFAULT_BAR_PLOT_TRACK_CONFIG = {
        color_scheme: {
            'all': '#fd8f42'
        },
        bar_width: 5.0,
        height: BAR_PLOT_TRACK_MAX_HEIGHT,
        stem_height: 30.0,
        scaling: {
            type: 'log2nabs',
            min_height: 10,
            max_height: BAR_PLOT_TRACK_MAX_HEIGHT - 30,
            scaling_factor: 200
        },
        category_totals: {}
    };

    var DEFAULT_SAMPLE_PLOT_TRACK_CONFIG = {
        color_scheme: {
            'all': 'gray'
        },
        glyph_width: 5.0,
        height: SAMPLE_PLOT_TRACK_MAX_HEIGHT,
        stem_height: 30.0
    };

    var DEFAULT_REGION_LAYOUT_CONFIG = {
        intron_width: 5.0
    };

    var DEFAULT_VARIANT_LAYOUT_CONFIG = {
        variant_width: 5.0
    };

    var DEFAULT_REGION_TRACK_CONFIG = {
        color_scheme: {
            'exon': 'lightgray',
            'noncoding': 'gray'
        },
        height: REGION_TRACK_HEIGHT
    };

    var DEFAULT_TICK_TRACK_CONFIG = {
        height: TICK_TRACK_HEIGHT,
        tick_height: 10,
        tick_text_y: 22
    };

    var DEFAULT_PROTEIN_DOMAIN_TRACK_CONFIG = {
        domain_height: 10,
        height: 40,
        color_scheme: {
            'all': 'gray'
        }
    };

    var BuilderForExistingElementsPrototype = {
        _initialize: function(config) {
            // Custom configurations
            this.config = config;

            // Internal variables
            this.tracks_array = [];

            this.variant_layout_data = [];

            this.region_data = null;
            this.region_metadata = null;
            this.region_layout = null;

            this.viewport = null;
            this.scroll_handler = null;

            this.variant_layout = null;

            this.variant_source_accessor = DataAdapters.make_accessor(this.config.variant_data_source_field);
        },

        _initRegionLayout: function() {
            var self = this,
                config = _.extend(DEFAULT_REGION_LAYOUT_CONFIG, this.config.region_layout);

            self.region_data = GeneRegionUtils.buildRegionsFromArray(this.config.region_data);

            this.region_layout = RegionLayouts.BasicLayoutFactory
                .create({});

            _.each(config, function(value, function_key) {
                self.region_layout[function_key](value);
            });

            self.region_layout.process(self.region_data);
            self.region_metadata = self.region_layout.getMetadata();
        },

        _initViewport: function() {
            var self = this,
                region_metadata = self.region_metadata;

            this.viewport = ViewportFactory.createFromRegionData(this.region_layout, region_metadata, this.config.viewport.width);

            this.viewport.setViewportPosition({
                x: 0,
                y: 0
            });
        },

        _initVariantLayout: function() {
            var self = this,
                config = _.extend(DEFAULT_VARIANT_LAYOUT_CONFIG, this.config.variant_layout),
                location_field_name = this.config.variant_data_location_field;

            this.variant_layout = VariantLayoutFactory.create({});

            _.each(this.variant_layout_data, function(entry) {
                self.variant_layout.add_track_data(entry.data_array);
            });

            this.variant_layout
                .location_field(this.config.variant_data_location_field)
                .variant_type_field(this.config.variant_data_type_field)
                .regions(this.region_data)
                .processFlatArray(location_field_name);

            _.each(config, function(value, function_key) {
                self.variant_layout[function_key](value);
            });
        },

        _initBarPlotTrack: function(track_info) {
            var self = this,
                config = _.extend(DEFAULT_BAR_PLOT_TRACK_CONFIG, this.config.bar_plot_tracks, track_info.config),
                track_data = track_info.data,
                track_instance = BarPlotTrackFactory
                    .create()
                    .data(track_data, function(d) {return d;})
                    .regions(self.region_data, 'coordinate')
                    .variant_layout(self.variant_layout);

            _.each(config, function(value, function_key) {
                track_instance[function_key](value);
            });

            return track_instance;
        },

        _initSamplePlotTrack: function(track_info) {
            var self = this,
                config = _.extend(DEFAULT_SAMPLE_PLOT_TRACK_CONFIG, this.config.sample_plot_tracks, track_info.config),
                track_data = track_info.data,
                track_instance = SamplePlotTrackFactory
                    .create()
                    .data(track_data, function(d) {return d;})
                    .regions(self.region_data, 'coordinate')
                    .variant_layout(self.variant_layout);

            _.each(config, function(value, function_key) {
                track_instance[function_key](value);
            });

            return track_instance;
        },

        _initSampleBasedTrackContext: function(track_instance, track_info) {
            var self = this,
                element = track_info.element;

            return SeqPeekSVGContextFactory.createIntoSVG(element)
                .track(track_instance)
                .width(self.config.viewport.width)
                .scroll_handler(self.scroll_handler)
                .brush_callback(self.selection_handler)
                .region_layout(self.region_layout)
                .viewport(self.viewport);
        },

        _initRegionScaleTrack: function(track_info) {
            var config = _.extend(DEFAULT_REGION_TRACK_CONFIG, this.config.region_track, track_info.config),
                track_instance = RegionTrackFactory
                    .create()
                    .region_layout(this.region_layout)
                    .data(this.region_data);

            _.each(config, function(value, function_key) {
                track_instance[function_key](value);
            });

            return track_instance;
        },

        _initRegionDataDependentContext: function(track_instance, track_info) {
            var self = this,
                element = track_info.element;

            return SeqPeekSVGContextFactory.createIntoSVG(element)
                .track(track_instance)
                .width(self.config.viewport.width)
                .scroll_handler(self.scroll_handler)
                .brush_callback(self.selection_handler)
                .viewport(self.viewport)
                .region_layout(self.region_layout);
        },

        _initTickTrack: function(track_info) {
            var self = this,
                config = _.extend(DEFAULT_TICK_TRACK_CONFIG, this.config.tick_tracks, track_info.config);

            var track_instance = TickTrackFactory
                .create()
                .data(self.region_data);

            _.each(config, function(value, function_key) {
                track_instance[function_key](value);
            });

            return track_instance;
        },

        _initProteinDomainTrack: function(track_info) {
            var self = this,
                track_data = track_info.data,
                config = _.extend(DEFAULT_PROTEIN_DOMAIN_TRACK_CONFIG, this.config.protein_domain_tracks, track_info.config);

            var track_instance = ProteinDomainTrackFactory
                .create()
                .domain_data(track_data)
                .regions(self.region_data, 'coordinate')
                .variant_layout(self.variant_layout);

            _.each(config, function(value, function_key) {
                track_instance[function_key](value);
            });

            return track_instance;
        },

        _initTrackContexts: function() {
            var self = this;

            _.each(this.tracks_array, function(track_info) {
                var track_instance,
                    context;

                if (track_info.type == 'bar_plot') {
                    track_instance = self._initBarPlotTrack(track_info);
                    context = self._initSampleBasedTrackContext(track_instance, track_info);
                    track_instance.createStaticRenderData();
                }
                else if (track_info.type == 'sample_plot') {
                    track_instance = self._initSamplePlotTrack(track_info);
                    context = self._initSampleBasedTrackContext(track_instance, track_info);
                }
                else if (track_info.type == 'region_scale') {
                    track_instance = self._initRegionScaleTrack(track_info);
                    context = self._initRegionDataDependentContext(track_instance, track_info);
                }
                else if (track_info.type == 'tick') {
                    track_instance = self._initTickTrack(track_info);
                    context = self._initRegionDataDependentContext(track_instance, track_info);
                }
                else if (track_info.type == 'protein_domains') {
                    track_instance = self._initProteinDomainTrack(track_info);
                    context = self._initRegionDataDependentContext(track_instance, track_info);
                }
                else {
                    console.log("Skipping " + track_info.type);
                    return;
                }

                track_info.track_instance = track_instance;
                track_info.context = context;
            });
        },

        _initScrollHandler: function() {
            this.scroll_handler = _.bind(function(event) {
                this.viewport.setViewportPosition({
                    x: event.translate[0],
                    y: 0
                });

                this.viewport.setViewportScale(event.scale);

                this.variant_layout.doLayoutForViewport(this.viewport, 'coordinate');

                _.each(this.tracks_array, function(track_info) {
                    var context = track_info.context;
                    _.bind(context._updateViewportTranslation, context)();
                });

                if (this.config.scrollEventCallback !== undefined) {
                    this.config.scrollEventCallback({
                        viewport_x:  event.translate[0],
                        viewport_scale: event.scale,
                        visible_coordinates: this.viewport._getVisibleCoordinates()
                    });
                }
            }, this);
        },

        _initSelectionHandler: function() {
            this.selection_handler = _.bind(function(brush_extent) {
                this.brush_extent = brush_extent;

                _.each(this.tracks_array, function(track_info) {
                    var context = track_info.context;
                    _.bind(context._updateBrushExtent, context)(brush_extent);
                });

                if (_.isFunction(this.config.selection_handler)) {
                    var unique_identifiers = this.getSelectedSampleIDs();
                    this.config.selection_handler(unique_identifiers);
                }

            }, this);
        },

        ////////////////
        // Public API //
        ////////////////
        addBarPlotTrackWithArrayData: function(variant_array, track_container_element, track_config, skip_layout) {
            var type_field_name = this.config.variant_data_type_field,
                location_field_name = this.config.variant_data_location_field;

            var track_data = DataAdapters.group_by_location(variant_array, type_field_name, location_field_name);

            track_data.sort(function(x, y) {
                return (x["coordinate"] - y["coordinate"]);
            });

            DataAdapters.apply_statistics(track_data, function() {return 'all';});

            if (!skip_layout) {
                this.variant_layout_data.push({
                    data_array: variant_array
                });
            }

            var track_info = {
                type: 'bar_plot',
                data: track_data,
                element: track_container_element,
                config: track_config
            };

            this.tracks_array.push(track_info);

            return track_info;
        },

        addSamplePlotTrackWithArrayData: function(variant_array, track_container_element, track_config, skip_layout) {
            var type_field_name = this.config.variant_data_type_field,
                location_field_name = this.config.variant_data_location_field;

            var track_data = DataAdapters.group_by_location(variant_array, type_field_name, location_field_name);

            track_data.sort(function(x, y) {
                return (x["coordinate"] - y["coordinate"]);
            });

            DataAdapters.apply_statistics(track_data, function() {return 'all';});

            if (!skip_layout) {
                this.variant_layout_data.push({
                    data_array: variant_array
                });
            }

            var track_info = {
                type: 'sample_plot',
                data: track_data,
                element: track_container_element,
                config: track_config
            };

            this.tracks_array.push(track_info);

            return track_info;
        },

        addRegionScaleTrackToElement: function(track_container_element, track_config) {
            this.tracks_array.push({
                type: 'region_scale',
                element: track_container_element,
                config: track_config
            });
        },

        addTickTrackToElement: function(track_container_element, track_config) {
            this.tracks_array.push({
                type: 'tick',
                element: track_container_element,
                config: track_config
            });
        },

        addProteinDomainTrackToElement: function(domain_object, track_container_element, track_config) {
            this.tracks_array.push({
                type: 'protein_domains',
                data: domain_object,
                element: track_container_element,
                config: track_config
            });
        },

        scrollEventCallback: function(value) {
            this.config.scrollEventCallback = value;
        },

        getProcessedRegionData: function() {
            return this.region_data;
        },

        getRegionMetadata: function() {
            return this.region_metadata
        },

        setTrackHeightsByStatistics: function(track_type) {
            _.chain(this.tracks_array)
                .filter(function(track_info) {
                    return track_info.type == track_type;
                })
                .each(function(track_info) {
                    track_info.track_instance.setHeightFromStatistics();
                });
        },

        getTrackHeights: function(track_type) {
            var heights = _.chain(this.tracks_array)
                .filter(function(track_info) {
                    return track_info.type == track_type;
                })
                .map(function(track_info) {
                    return track_info.track_instance.getHeight()
                })
                .value();

            return heights;
        },

        getSelectedSampleIDs: function() {
            var self = this;

            if (this.brush_extent === undefined) {
                return;
            }

            // Map brush extent to coordinates
            var coordinate_extent = this.viewport.getCoordinateRangeForExtent(this.brush_extent);
            var start = parseInt(coordinate_extent[0]);
            var end = parseInt(coordinate_extent[1]);

            var identifier_list = [];

            // Find unique data point identifiers
            _.chain(this.tracks_array)

                .filter(function(track_info) {
                    return track_info["type"] == "sample_plot" ||
                        track_info["type"] == "bar_plot";
                })
                .each(function(track_info) {
                    DataAdapters.apply_to_variant_types(track_info.data, function(type_data, memo, data_by_location)  {
                        var coordinate = data_by_location.coordinate;

                        if (start <= coordinate && coordinate <= end) {
                            _.each(type_data.data, function (data_point) {
                                var identifier = self.variant_source_accessor(data_point);
                                identifier_list.push(identifier);
                            });
                        }
                    });
                });

            return _.uniq(identifier_list);
        },

        createInstances: function() {
            this._initRegionLayout();
            this._initVariantLayout();
            this._initViewport();

            this._initScrollHandler();
            this._initSelectionHandler();

            this._initTrackContexts();

            this.variant_layout.doLayoutForViewport(this.viewport, 'coordinate');
        },

        render: function() {
            _.each(this.tracks_array, function(track_info) {
                track_info.context.draw();
            });
        },

        draw: function() {
            this.createInstances();
            this.render();
        },

        /////////////////////////////////
        // Zoom / Selection toggle API //
        /////////////////////////////////

        toggleZoomMode: function() {
            _.each(this.tracks_array, function(track_info) {
                track_info.context.toggleZoomMode();
            });
        },

        toggleSelectionMode: function() {
            _.each(this.tracks_array, function(track_info) {
                track_info.context.toggleSelectionMode();
            });
        }
    };

    return {
        create: function(config) {
            var obj = Object.create(BuilderForExistingElementsPrototype, {});
            obj._initialize(config);
            return obj;
        }
    };
});