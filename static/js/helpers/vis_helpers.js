/**
 *
 * Copyright 2017, Institute for Systems Biology
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

define(['jquery'], function($) {
    var base_feature_search_url = BASE_URL + '/visualizations/feature_search/';

    return {
        isValidNumber: function(val) {
            return (
                val !== null && val !== undefined && (typeof(val) !== "string" ||
                (val.match(/^-?\d*\.?\d+$/) !== null)
            ));
        },
        get_min_max: function(data, selector) {
            var self=this;
            return [Math.floor(d3.min(data, function(d) {
                if (self.isValidNumber(d[selector])) {
                    return parseFloat(d[selector]);
                } else {
                    return 0
                }
            })), Math.ceil(d3.max(data, function(d) {
                if (self.isValidNumber(d[selector])) {
                    return parseFloat(d[selector]);
                } else {
                    return 0
                }
            }))];
        },
        values_only: function(data, attr) {
            var result = [];
            for (var i = 0; i < data.length; i++ ) {
                if (data[i][attr] !== null && data[i][attr] !== undefined && data[i][attr] != "None" && data[i][attr] !== "NA") {
                    result.push(data[i][attr]);
                }
            }
            return result
        },
        toggle_selection: function(){
            var toggle_class = $(this).siblings('text').html();

            var current_class = $(this).attr('class').indexOf('selected') == 0 ? 'unselected' : 'selected';
            if (current_class == 'selected') {
                d3.selectAll('.' + toggle_class).attr('class', toggle_class + ' ');
            } else {
                d3.selectAll('.' + toggle_class).attr('class', toggle_class + ' hidden');
            }
            d3.select(this).attr('class', current_class);
        },
        color_map: function(num_vals) {
            /* These colours come from the Google Style Palette http://www.google.com/design/spec/style/color.html#color-color-palette */
            var items = [
                '#2196F3', // Blue 500
                '#9C27B0', // Purple 500
                '#F44336', // Red 500
                '#4CAF50', // Green 500
                '#FFEB3B', // Yellow 500
                '#E91E63', // Pink 500
                '#3F51B5', // Indigo 500
                '#009688', // Teal 500
                '#FFC107', // Amber 500
                '#CDDC39', // Lime 500
                '#673AB7', // Deep Purple 500
                '#00BCD4', // Cyan 500
                '#8BC34A', // Light Green 500
                '#FF9800', // Orange 500

                '#64B5F6', // Blue 300
                '#BA68C8', // Purple 300
                '#E57373', // Red 300
                '#81C784', // Green 300
                '#FFF176', // Yellow 300
                '#F06292', // Pink 300
                '#7986CB', // Indigo 300
                '#4DB6AC', // Teal 300
                '#FFD54F', // Amber 300
                '#DCE775', // Lime 300
                '#9575CD', // Deep Purple 300
                '#4DD0E1', // Cyan 300
                '#AED581', // Light Green 300
                '#FFB74D', // Orange 300

                '#1976D2', // Blue 700
                '#7B1FA2', // Purple 700
                '#D32F2F', // Red 700
                '#388E3C', // Green 700
                '#FBC02D', // Yellow 700
                '#C2185B', // Pink 700
                '#303F9F', // Indigo 700
                '#00796B', // Teal 700
                '#FFA000', // Amber 700
                '#AFB42B', // Lime 700
                '#512DA8', // Deep Purple 700
                '#0097A7', // Cyan 700
                '#689F38', // Light Green 700
                '#F57C00' // Orange 700
            ];
            return items.slice(0, num_vals);
        },
        get_domain: function(data, attr) {
            var results = [];
            for (var i = 0; i < data.length; i++) {
                if (results.indexOf(data[i][attr]) == -1) {
                    results.push(data[i][attr]);
                }
            }
            return results;
        },
        hide_field_search_panel: function(obj) {
            var main_settings = $(obj).parents('.flyout-body').children('.main-settings');
            var cohort_settings = $(obj).parents('.flyout-body').children('.field-search');
            main_settings.show();
            cohort_settings.hide();
        },
        show_field_search_panel: function(obj) {
            var main_settings = $(obj).parents('.flyout-body').children('.main-settings');
            var feature_search_panel = $(obj).parents('.flyout-body').children('.field-search');
            feature_search_panel.attr('data-attribute', $(obj).attr('data-attribute'));
            main_settings.hide();
            feature_search_panel.show();
        },
        reset_field_search_panel: function(flyout_body) {
            flyout_body.find('.datatype-selector').val('');
            flyout_body.find('.search-field').each(function() {
                if (!$(this).hasClass('hidden')) {
                    $(this).toggleClass('hidden');
                }
            });
            flyout_body.find('.search-field select').each(function() { $(this).val(''); });
        },
        select2_formatting: function(item) {
            if (item.hasOwnProperty('type')) {
                return '<option var_type="'+item['type']+'" value="'+item['id']+'">'+item['text']+'</option>';
            } else {
                return '<option var_type="N" value="'+item['id']+'">'+item['text']+'</option>';
            }
        },

        /*  Gather options for a particular variable based on specified parameters
          * This performs a similar function to field_option_change_callback
          *
          * Arguments :
          *     datatype    : indicator of type of data gather options, eg. GEXP, etc
          *     filters     : an array of filters unique to the data type, eg [{filter : "", value : ""}, {},..]
          *     callback    : the return call on success
          */
        get_variable_field_options : function(datatype, filters, version, callback){
            if(typeof(callback) !== 'undefined'){
                var base_feature_search_url = BASE_URL + '/visualizations/feature_search/'+version+'?';
                if(version == 'v2') {
                    filters.push({filter: 'genomic_build', value: $('#workbook-build-'+workbook_id+' :selected').val()});
                }
                var feature_search_url = base_feature_search_url + "datatype=" + datatype;

                for (var i in filters) {
                    feature_search_url += "&" + filters[i].filter + "=" + filters[i].value; //+ ",";
                }
                feature_search_url = feature_search_url.substring(0, feature_search_url.length);

                // Re-initialize select box with new features from feature search url
                $.ajax({
                    type: 'GET',
                    url: feature_search_url,
                    success: function (data) {
                        data = data['items'] ? data['items'] : [];
                        callback(data);
                    }
                });
            } else {
                console.log("parameters on 'get_variable_field_options' is not correct");
            }
        },

        /*  Gather autocomplete interfaces for search parameters on TCGA data
          * This performs a similar function to field_option_change_callback
          *
          */
        get_datatype_search_interfaces : function(obj, datatype, version) {
            if(!version) {
                version = 'v2'
            }
            var value   = datatype;
            var helpers = this;
            var feature_search_url = base_feature_search_url + version + '?datatype=' + value;

            // Hide all field options
            $(obj).parents('.field-search').find('.search-field').each(function() {
                if (!$(this).hasClass('hidden')) {
                    $(this).toggleClass('hidden');
                }
            });

            // Select the options we're interested in
            var options = $(obj).parent();

            // For each option, if it requires and autocomplete box, initialize it
            options.find('select.field-options').each(function() {
                if ($(this).hasClass('select2')) {
                    var datatype = value;
                    var field = $(this).attr('data-field');
                    var feature_search_url = BASE_URL + '/visualizations/feature_field_search?datatype=' + datatype + '&field=' + field;
                    $(this).select2({
                        ajax: {
                            url: feature_search_url,
                            dataType: 'json',
                            data: function (params) {
                                return { keyword: params.term, page: params.page };
                            },
                            processResults: function (data, page) {
                                if(data['values']) {
                                    var items = $.map(data['values'], function (item) {
                                        var obj = {};
                                        obj.id = item;
                                        obj.text = item;
                                        return obj;
                                    });
                                    return {results: items};
                                } else {
                                    return {results: []};
                                }
                            }
                        },
                        id: function (item) { return item['id']; },
                        escapeMarkup: function (markup) { return markup; },
                        minimumInputLength: 1,
                        templateResult: helpers.select2_formatting,
                        templateSelection: helpers.select2_formatting,
                        width: '100%'
                    });
                }
            });

            // TODO: This code is only used in the variables page. Consider refactoring out.
            // If it's clinical treat it differently and only use the search-term-field autocomplete
            if (value == 'CLIN') {
                // Initialize clinical search box
                $(obj).parent().find('.search-term-field').select2({
                    ajax: {
                        url: feature_search_url,
                        dataType: 'json',
                        data: function (params) {
                            return { keyword: params.term, page: params.page };
                        },
                        processResults: function (data, page) {
                            if(data['items']) {
                                var items = $.map(data['items'], function (item) {
                                    var obj = {};
                                    obj.id = item['internal_feature_id'];
                                    obj.text = item['label'];
                                    obj.type = item['type'];
                                    return obj;
                                });
                                return {results: items};
                            } else {
                                return {results: []};
                            }
                        }
                    },
                    id: function (item) { return item['id']; },
                    escapeMarkup: function (markup) { return markup; },
                    minimumInputLength: 1,
                    templateResult: helpers.select2_formatting,
                    templateSelection: helpers.select2_formatting,
                    width: '100%'
                })
            }
        },

        field_search_change_callback: function(obj) {
            $(obj).parents('.field-search').find('button.select-field').attr('data-value', $(obj).find('select').val());
            $(obj).parents('.field-search').find('button.select-field').attr('data-label', $(obj).find('select option:selected').html());
        },
        select_field_callback: function(obj) {
            var value = $(obj).attr('data-value');
            var label = $(obj).attr('data-label');
            var feature_selected = $(obj).parents('.field-search').attr('data-attribute');
            $(obj).parents('.flyout-body').find('.'+feature_selected).attr('value', value).html(label);
            this.reset_field_search_panel($(obj).parents('.flyout-body'));
            this.hide_field_search_panel(obj);
        },
        close_field_search_callback: function(obj) {
            this.reset_field_search_panel($(obj).parents('.flyout-body'));
            this.hide_field_search_panel(obj);
        },
        get_no_legend_columns: function(name_list){
            var max_len = 0;
            for(var i=0; i<name_list.length; i++){
                if(name_list[i].length > max_len){
                    max_len = name_list[i].length;
                }
            }
            return Math.min(7, Math.floor(80/max_len));
        }
    }
});

