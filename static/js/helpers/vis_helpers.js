/**
 *
 * Copyright 2015, Institute for Systems Biology
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
    var base_feature_search_url = base_api_url + '/_ah/api/feature_type_api/v1/feature_search?';
    var feature_search_url = base_feature_search_url;
    return {
        get_min_max: function(data, selector) {
            return [Math.floor(d3.min(data, function(d) {
                if (d[selector] && d[selector] != "NA") {
                    return parseFloat(d[selector]);
                } else {
                    return 0
                }
            })),
                    Math.ceil(d3.max(data, function(d) {
                if (d[selector] && d[selector] != "NA") {
                    return parseFloat(d[selector]);
                } else {
                    return 0
                }
            }))];
        },
        values_only: function(data, attr) {
            var result = [];
            for (var i = 0; i < data.length; i++ ) {
                if (data[i][attr] && data[i][attr] != 'None') {
                    result.push(data[i][attr]);
                }
            }
            return result
        },
        categorize_ages: function(age_array) {
            categorized_array = [];
            for (i=0; i<8; i++) {
                categorized_array[i] = {};
            }
            // bug: can't just return the length
            categorized_array[1]['value'] = '10 to 39';
            categorized_array[1]['count'] = 0;
            categorized_array[2]['value'] = '40 to 49';
            categorized_array[2]['count'] = 0;
            categorized_array[3]['value'] = '50 to 59';
            categorized_array[3]['count'] = 0;
            categorized_array[4]['value'] = '60 to 69';
            categorized_array[4]['count'] = 0;
            categorized_array[5]['value'] = '70 to 79';
            categorized_array[5]['count'] = 0;
            categorized_array[6]['value'] = '80 and up';
            categorized_array[6]['count'] = 0;
            categorized_array[7]['value'] = 'None';
            categorized_array[7]['count'] = 0;
            for (var i = 0; i < age_array.length; i++) {
                if (parseFloat(age_array[i]['value']) < 40) {
                    categorized_array[1]['count'] += parseInt(age_array[i]['count']);
                } else if (parseFloat(age_array[i]['value']) < 50) {
                    categorized_array[2]['count'] += parseInt(age_array[i]['count']);
                } else if (parseFloat(age_array[i]['value']) < 60) {
                    categorized_array[3]['count'] += parseInt(age_array[i]['count']);
                } else if (parseFloat(age_array[i]['value']) < 70) {
                    categorized_array[4]['count'] += parseInt(age_array[i]['count']);
                } else if (parseFloat(age_array[i]['value']) < 80) {
                    categorized_array[5]['count'] += parseInt(age_array[i]['count']);
                } else if (parseFloat(age_array[i]['value']) >= 80) {
                    categorized_array[6]['count'] += parseInt(age_array[i]['count']);
                } else if (parseFloat(age_array[i]['value']) == 'None'){
                    categorized_array[7]['count'] += parseInt(age_array[i]['count']);
                }
            }
            return categorized_array;
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
        get_cookie: function(name) {
            var cookieValue = null;
            if (document.cookie && document.cookie != '') {
                var cookies = document.cookie.split(';');
                for (var i = 0; i < cookies.length; i++) {
                    var cookie = jQuery.trim(cookies[i]);
                    // Does this cookie string begin with the name we want?
                    if (cookie.substring(0, name.length + 1) == (name + '=')) {
                        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                        break;
                    }
                }
            }
            return cookieValue;
        },
        hide_cohort_panel: function(obj) {
            var main_settings = $(obj).parents('.flyout-body').children('.main-settings');
            var cohort_settings = $(obj).parents('.flyout-body').children('.cohort-search');
            main_settings.show();
            cohort_settings.hide();
        },

        show_cohort_panel: function(obj) {
            var main_settings = $(obj).parents('.flyout-body').children('.main-settings');
            var cohort_settings = $(obj).parents('.flyout-body').children('.cohort-search');
            main_settings.hide();
            cohort_settings.show();
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
        show_flyout_callback: function(obj) {
            $(obj).parents('.plot').find($(obj).attr('data-target')).animate({
                right: '-1px'
            }, 800);
        },
        hide_flyout_callback: function(obj) {
            $(obj).parents('.fly-out').animate({
                right: '-300px'
            }, 800);
        },
        delete_plot_callback: function(obj) {
            $('.modal').modal('hide');
            $.ajax({
                type: 'POST',
                url: '/visualizations/delete_plot/',
                data: $(obj).serialize(),
                success: function(data) {
                    $(obj).parents('.plot').remove();
                },
                error: function(error) {
                    console.log('Failed to delete plot.')
                    obj.reset();
                }
            })
        },
        remove_cohort_callback: function(obj) {
            $(obj).parents('div.filter-label').remove();
        },
        select_cohort_callback: function(obj, value, label) {
            var span_obj = $('<div class="filter-label label label-default space-right-5" value="' + value + '" name="cohort-ids">'
                        + label
                        + '<a role="button" class="remove-cohort space-left-5" aria-label="Remove Cohort Button"><i class="fa fa-times"></i></a>'
                        + '</div>');
            var helpers = this;
            span_obj.children('.remove-cohort').on('click', function() { helpers.remove_cohort_callback(this); });
            $(obj).parents('.flyout-body').find('.cohort-listing').append(span_obj);
            this.hide_cohort_panel(obj);
        },
        add_comment_callback: function(obj) {
            var form = obj;
            $.ajax({
            type: 'POST',
            url: base_url + '/visualizations/save_comment/',
            data: $(obj).serialize(),
            success: function(data) {
                data = JSON.parse(data);
                $('#plot-'+data.plot).find('.comment-flyout .flyout-body').append('<h5 class="comment-username">' + data['first_name'] + ' ' + data['last_name'] + '</h5>');
                $('#plot-'+data.plot).find('.comment-flyout .flyout-body').append('<p class="comment-date">' + data['date_created'] + '</p>');
                $('#plot-'+data.plot).find('.comment-flyout .flyout-body').append('<p class="comment-content">' + data['content'] + '</p>')
                $('#plot-'+data.plot).find('.comment-flyout .flyout-footer textarea').val('');
                form.reset();
            },
            error: function() {
                console.log('failed to save comment');
                form.reset();
            }
        });
        },
        select2_formatting: function(item) {
            return '<option value="'+item['id']+'">'+item['text']+'</option>';
        },

        /*  Gather options for a particular variable based on specified parameters
          * This performs a similar function to field_option_change_callback
          *
          * Arguments :
          *     datatype    : indicator of type of data gather options, eg. GEXP, etc
          *     filters     : an array of filters unique to the data type, eg [{filter : "", value : ""}, {},..]
          *     callback    : the return call on success
          */
        get_variable_field_options : function(datatype, filters, callback){
            if(typeof(callback) !== 'undefined'){
                var base_feature_search_url = base_api_url + '/_ah/api/feature_type_api/v1/feature_search?';
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
        get_datatype_search_interfaces : function(obj, datatype) {
            var value   = datatype;
            var helpers = this;
            var feature_search_url = base_feature_search_url + 'datatype=' + value;

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
                    var feature_search_url = base_api_url + '/_ah/api/feature_type_api/v1/feature_field_search?datatype=' + datatype + '&field=' + field;
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
            } else {
                // Initialize select box with new features from feature search url
                var that = this;
                $.ajax({
                    type: 'GET',
                    url: feature_search_url,
                    success: function(data) {
                        data = data['items'];
                        var selectbox = $(that).parents('.search-field').find('.feature-search .search-term-field');
                        selectbox.empty();
                        selectbox.append('<option value="" disabled selected>Please select an option</option>');
                        if (data) {
                            for (var i = 0; i < data.length; i++) {
                                selectbox.append('<option value="'+data[i]['internal_feature_id']+'">'+data[i]['label']+'</option>')
                            }
                        }
                    },
                    error: function(e) {
                        //console.log(e['responseText']);
                    }
                });
            }
        },

        field_option_change_callback : function(obj) {
            // Find the field name in the -options class
            var field = $(obj).attr('data-field');

            // Field the value for this field
            var value = $(obj).val();

            // Append field and value to feature search url
            var index_of_field = feature_search_url.indexOf(field + '=');

            if (index_of_field > -1) {
                var end_of_field = feature_search_url.indexOf('&', index_of_field);
                if (end_of_field > -1) {
                    // field appears in middle of url params
                    feature_search_url = feature_search_url.substr(0, index_of_field - 1) + feature_search_url.substr(end_of_field)
                } else {
                    // field appears at the end of url params
                    feature_search_url = feature_search_url.substr(0, index_of_field - 1)
                }
            }

            feature_search_url += '&' + field + '=' + value;

            // Re-initialize select box with new features from feature search url
            var that = obj;
            console.log("looking up features");
            $.ajax({
                type: 'GET',
                url: feature_search_url,
                success: function(data) {
                    data = data['items'];
                    var selectbox = $(that).parents('.search-field').find('.feature-search .search-term-field');
                    selectbox.empty();
                    selectbox.append('<option value="" disabled selected>Please select an option</option>');
                    for (var i = 0; i < data.length; i++) {
                        selectbox.append('<option value="'+data[i]['internal_feature_id']+'">'+data[i]['label']+'</option>')
                    }
                }
            });

        },
        field_search_change_callback: function(obj) {
            $(obj).parents('.field-search').find('button.select-field').attr('data-value', $(obj).find('select').val());
            $(obj).parents('.field-search').find('button.select-field').attr('data-label', $(obj).find('select option:selected').html());
        },
        datatype_selector_change_callback: function(obj) {
            var value = $(obj).val();
            var helpers = this;
            // Reset feature search url to new datatype
            feature_search_url = base_feature_search_url + 'datatype=' + value;

            // Hide all field options
            $(obj).parents('.field-search').find('.search-field').each(function() {
                if (!$(this).hasClass('hidden')) {
                    $(this).toggleClass('hidden');
                }
            });

            // Select the options we're interested in
            var options = $(obj).parents('.field-search').find('.'+value+'-options').toggleClass('hidden');

            // For each option, if it requires and autocomplete box, initialize it
            options.find('select.field-options').each(function() {
                if ($(this).hasClass('select2')) {
                    var datatype = value;
                    var field = $(this).attr('data-field');
                    var feature_search_url = base_api_url + '/_ah/api/feature_type_api/v1/feature_field_search?datatype=' + datatype + '&field=' + field;
                    $(this).select2({
                        ajax: {
                            url: feature_search_url,
                            dataType: 'json',
                            data: function (params) {
                                return { keyword: params.term, page: params.page };
                            },
                            processResults: function (data, page) {
                                var items = $.map(data['values'], function (item) {
                                    var obj = {};
                                    obj.id = item;
                                    obj.text = item;
                                    return obj;
                                });
                                return {results: items};

                            }
                        },
                        id: function (item) { return item['id']; },
                        escapeMarkup: function (markup) { return markup; },
                        minimumInputLength: 1,
                        templateResult: helpers.select2_formatting,
                        templateSelection: helpers.select2_formatting
                    });
                }
            });

            // If it's clinical treat it differently and only use the search-term-field autocomplete
            if (value == 'CLIN') {
                // Initialize clinical search box
                $(obj).parents('.field-search').find('.search-field.'+value+'-options .search-term-field').select2({
                    ajax: {
                        url: feature_search_url,
                        dataType: 'json',
                        data: function (params) {
                            return { keyword: params.term, page: params.page };
                        },
                        processResults: function (data, page) {
                            var items = $.map(data['items'], function (item) {
                                var obj = {};
                                obj.id = item['internal_feature_id'];
                                obj.text = item['label'];
                                return obj;
                            });
                            return {results: items};

                        }
                    },
                    id: function (item) { return item['id']; },
                    escapeMarkup: function (markup) { return markup; },
                    minimumInputLength: 1,
                    templateResult: helpers.select2_formatting,
                    templateSelection: helpers.select2_formatting,
                    width: '100%'
                })
            } else {
                // Initialize select box with new features from feature search url
                var that = this;
                $.ajax({
                    type: 'GET',
                    url: feature_search_url,
                    success: function(data) {
                        data = data['items'];
                        var selectbox = $(that).parents('.search-field').find('.feature-search .search-term-field');
                        selectbox.empty();
                        selectbox.append('<option value="" disabled selected>Please select an option</option>');
                        if (data) {
                            for (var i = 0; i < data.length; i++) {
                                selectbox.append('<option value="'+data[i]['internal_feature_id']+'">'+data[i]['label']+'</option>')
                            }
                        }
                    },
                    error: function(e) {
                        console.log(e['reponseText']);
                    }
                });
            }
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
        swap_axes_callback: function(obj) {
            var plot = $(obj).parents('.plot');
            var x_attr = plot.find('.x-selector').attr('value');
            var y_attr = plot.find('.y-selector').attr('value');
            var x_label = plot.find('.x-selector').html();
            var y_label = plot.find('.y-selector').html();

            var tmp = y_attr;
            y_attr = x_attr;
            x_attr = tmp;
            tmp = y_label;
            y_label = x_label;
            x_label = tmp;

            plot.find('.x-selector').attr('value', x_attr);
            plot.find('.y-selector').attr('value', y_attr);
            plot.find('.x-selector').html(x_label);
            plot.find('.y-selector').html(y_label);
        }
    }
});

