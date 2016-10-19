/**
 *
 * Copyright 2016, Institute for Systems Biology
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

var MAX_URL_LEN = 2000;

define(['jquery', 'tree_graph', 'stack_bar_chart', 'draw_parsets'],
function($, tree_graph, stack_bar_chart, draw_parsets) {
    
    var tree_graph_obj = Object.create(tree_graph, {});
    var parsets_obj = Object.create(draw_parsets, {});

    var clin_tree_attr = {
        Study: 'Study',
        vital_status: 'Vital Status',
        SampleTypeCode: 'Sample Type',
        tumor_tissue_site: 'Tumor Tissue Site',
        gender: 'Gender',
        age_at_initial_pathologic_diagnosis: 'Age at Initial Pathologic Diagnosis'
    };

    var user_data_attr = {
        user_project: 'Project',
        user_study: 'Study'
    };

    return  {

        filter_data_for_clin_trees: function(attr_counts, these_attr) {
            var filtered_clin_trees = {};
            var attr_counts_clin_trees = null;
            var filters = this.format_filters();
            var tree_attr_map = {};

            these_attr.map(function(attr){
                tree_attr_map[attr] = 1;
            });
            for(var i in filters) {
                if(filters.hasOwnProperty(i)) {
                    var fname = i.split(/:/)[1];
                    if (tree_attr_map[fname]) {
                        if (!filtered_clin_trees[fname]) {
                            filtered_clin_trees[fname] = {};
                        }
                        filters[i].map(function(val){
                            filtered_clin_trees[fname][val] = 1;
                        });
                    }
                }
            }
            if(Object.keys(filtered_clin_trees).length > 0) {
                attr_counts_clin_trees = JSON.parse(JSON.stringify(attr_counts));
                for(var i=0; i < attr_counts_clin_trees.length; i++) {
                    if(filtered_clin_trees[attr_counts_clin_trees[i].name]) {
                        attr_counts_clin_trees[i].total = 0;
                        var new_values = [];
                        for(var j=0; j < attr_counts_clin_trees[i].values.length; j++) {
                            if(filtered_clin_trees[attr_counts_clin_trees[i].name][attr_counts_clin_trees[i].values[j].value]) {
                                new_values.push(attr_counts_clin_trees[i].values[j]);
                                attr_counts_clin_trees[i].total += attr_counts_clin_trees[i].values[j].count;
                            }
                        }
                        attr_counts_clin_trees[i].values = new_values;
                    }
                }
            }
            return (attr_counts_clin_trees || attr_counts);
        },

        update_counts_parsets_direct: function(filters) {

            $('.clinical-trees .spinner').show();
            $('.user-data-trees .spinner').show();
            $('.parallel-sets .spinner').show();
            $('.cohort-info .total-values').hide();
            $('.cohort-info .spinner').show();

            var context = this;

            attr_counts = metadata_counts['count'];

            $('#isb-cgc-data-total-samples').html(metadata_counts['total']);
            $('#isb-cgc-data-total-participants').html(metadata_counts['participants']);
            $('#user-data-total-samples').html(user_data && metadata_counts['user_data_total'] !== null ? metadata_counts['user_data_total'] : "NA");
            $('#user-data-total-participants').html(user_data && metadata_counts['user_data_participants'] !== null ? metadata_counts['user_data_participants'] : "NA");


            this.update_filter_counts(attr_counts);
            // If there were filters, we need to adjust their counts so the barchart reflects what
            // was actually filtered
            var filters = this.format_filters();
            var clin_tree_attr_counts = Object.keys(filters).length > 0 ? this.filter_data_for_clin_trees(attr_counts, clin_tree_attr) : attr_counts;
            var user_data_attr_counts = Object.keys(filters).length > 0 ? this.filter_data_for_clin_trees(user_data, user_data_attr) : user_data;

            tree_graph_obj.draw_trees(clin_tree_attr_counts,clin_tree_attr,'#isb-cgc-tree-graph-clinical');
            tree_graph_obj.draw_trees(user_data_attr_counts,user_data_attr,'#user-data-tree-graph');

            if (metadata_counts.hasOwnProperty('items')) {
                var features = [
                    'cnvrPlatform',
                    'DNAseq_data',
                    'methPlatform',
                    'gexpPlatform',
                    'mirnPlatform',
                    'rppaPlatform'
                ];

                var plot_features = [
                    context.get_readable_name(features[0]),
                    context.get_readable_name(features[1]),
                    context.get_readable_name(features[2]),
                    context.get_readable_name(features[3]),
                    context.get_readable_name(features[4]),
                    context.get_readable_name(features[5])
                ];
                for (var i = 0; i < metadata_counts['items'].length; i++) {
                    var new_item = {};
                    for (var j = 0; j < features.length; j++) {
                        var item = metadata_counts['items'][i];
                        new_item[plot_features[j]] = context.get_readable_name(item[features[j]]);
                    }
                    metadata_counts['items'][i] = new_item;
                }

                parsets_obj.draw_parsets(metadata_counts, plot_features);
            } else {
                console.warn("No 'items' found in metadata_counts: " + metadata_counts);
            }

            $('.clinical-trees .spinner').hide();
            $('.user-data-trees .spinner').hide();
            $('.parallel-sets .spinner').hide();
            $('.cohort-info .spinner').hide();
            $('.cohort-info .total-values').show();
        },

        update_counts_parsets: function(base_url_domain, endpoint, cohort_id, version){
            var context = this;
            var filters = this.format_filters();
            var api_url = this.generate_metadata_url(base_url_domain, endpoint, filters, cohort_id, undefined, version);

            if(api_url.length > MAX_URL_LEN) {
                $('#url-len-max-alert').show();
                // This method is expected to return a promise, so send back a pre-rejected one
                return $.Deferred().reject();
            } else {
                $('#url-len-max-alert').hide();
            }

            var update_filters = this.update_filter_counts;

            $('.clinical-trees .spinner').show();
            $('.user-data-trees .spinner').show();
            $('.parallel-sets .spinner').show();
            $('.cohort-info .total-values').hide();
            $('.cohort-info .spinner').show();

            $('button[data-target="#apply-filters-modal"]').prop('disabled',true);
            $('#apply-filters-form input[type="submit"]').prop('disabled',true);
            
            var startReq = new Date().getTime();
            return $.ajax({
                type: 'GET',
                url: api_url,

                // On success
                success: function (results, status, xhr) {
                    var stopReq = new Date().getTime();
                    console.debug("[BENCHMARKING] Time for response in update_counts_parsets: "+(stopReq-startReq)+ "ms");
                    attr_counts = results['count'];
                    $('#isb-cgc-data-total-samples').html(results['total']);
                    $('#isb-cgc-data-total-participants').html(results['participants']);
                    $('#user-data-total-samples').html(results['user_data'] && results['user_data_total'] !== null ? results['user_data_total'] : "NA");
                    $('#user-data-total-participants').html(results['user_data'] && results['user_data_participants'] !== null ? results['user_data_participants'] : "NA");
                    update_filters(attr_counts);

                    var clin_tree_attr_counts = Object.keys(filters).length > 0 ? this.filter_data_for_clin_trees(attr_counts, clin_tree_attr) : attr_counts;
                    var user_data_attr_counts = Object.keys(filters).length > 0 ? this.filter_data_for_clin_trees(user_data, user_data_attr) : user_data;

                    tree_graph_obj.draw_trees(clin_tree_attr_counts,clin_tree_attr,'#isb-cgc-tree-graph-clinical');
                    tree_graph_obj.draw_trees(user_data_attr_counts,user_data_attr,'#user-data-tree-graph');
                    
                    if (results.hasOwnProperty('items')) {
                        var features = [
                            'cnvrPlatform',
                            'DNAseq_data',
                            'methPlatform',
                            'gexpPlatform',
                            'mirnPlatform',
                            'rppaPlatform'
                        ];
                        var plot_features = [
                            context.get_readable_name(features[0]),
                            context.get_readable_name(features[1]),
                            context.get_readable_name(features[2]),
                            context.get_readable_name(features[3]),
                            context.get_readable_name(features[4]),
                            context.get_readable_name(features[5])
                        ];
                        for (var i = 0; i < results['items'].length; i++) {
                            var new_item = {};
                            for (var j = 0; j < features.length; j++) {
                                var item = results['items'][i];
                                new_item[plot_features[j]] = context.get_readable_name(item[features[j]]);
                            }
                            results['items'][i] = new_item;
                        }

                        parsets_obj.draw_parsets(results, plot_features);
                    } else {
                        console.debug(results);
                    }
                },
                error: function(req,status,err){
                    $('#isb-cgc-data-total-samples').html("Error");
                    $('#isb-cgc-data-total-participants').html("Error");
                    $('#user-data-total-samples').html("Error");
                    $('#user-data-total-participants').html("Error");
                },
                complete: function(xhr,status) {
                    $('.clinical-trees .spinner').hide();
                    $('.user-data-trees .spinner').hide();
                    $('.parallel-sets .spinner').hide();
                    $('.cohort-info .spinner').hide();
                    $('.cohort-info .total-values').show();
                }
            });
        },

        format_filters: function() {
            var list = {};
            $('.selected-filters .panel-body span').each(function() {
                var $this = $(this),
                    key = $this.data('feature-name'),
                    val = $this.data('value-name');

                if ($this.data('feature-id'))
                    key = $this.data('feature-id');
                if ($this.data('value-id'))
                    val = $this.data('value-id');

                if(!list[key])
                    list[key] = [];
                list[key].push(val);
            });
            return list;
        },

        generate_metadata_url: function(base_url_domain, endpoint, filters, cohort_id, limit, version) {
            version = version || 'v1';
            var api_url = base_url_domain + '/cohorts/get_metadata_ajax/?version=' + version + '&endpoint=' + endpoint + '&';

            if (cohort_id) {
                api_url += 'cohort_id=' + cohort_id + '&';
            }
            if (limit != null && limit !== undefined) {
                api_url += 'limit=' + limit + '&';
            }


            if (filters) {
                api_url += 'filters=' + encodeURIComponent(JSON.stringify(filters)) + '&';
            }

            return api_url;
        },

        update_filter_counts: function(counts) {

            counts_by_name = {};

            // Convert the array into a map for easier searching
            counts.map(function(obj){
                counts_by_name[obj.name] = {
                    values: {},
                    total: obj.total
                }
                var values = counts_by_name[obj.name].values;
                obj.values.map(function(val){
                    values[val.value] = val.count;
                });
            });

            $('.filter-panel li.list-group-item div.cohort-feature-select-block').each(function() {
                var $this = $(this),
                    attr = $this.data('feature-name');
                if(attr && attr.length > 0 && attr !== 'specific-mutation' ) {
                    $('ul#' + attr + ' input').each(function () {

                        var $that = $(this),
                            value = $that.data('value-name'),
                            id = $that.data('value-id'),
                            displ_name = ($that.data('value-displ-name') == 'NA' ? 'None' : $that.data('value-displ-name')),
                            new_count = '';
                        if (counts_by_name[attr]) {
                            if (counts_by_name[attr].values[value] || counts_by_name[attr].values[displ_name] || counts_by_name[attr].values[id]) {
                                new_count = '(' + (counts_by_name[attr].values[value] || counts_by_name[attr].values[displ_name] || counts_by_name[attr].values[id]) + ')';
                            }
                        }
                        // All entries which were not returned are assumed to be zero
                        if (new_count == '') {
                            new_count = '(0)';
                        }
                        $that.siblings('span').html(new_count);
                    });
                }
            });
        },
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////////

        get_readable_name: function(csv_name) {
            var translation_dictionary = {
                'DNAseq_data':              'DNAseq',
                'Yes':                      'GA',
                'No':                       'N/A',
                'mirnPlatform':             'microRNA',
                'None':                     'N/A',
                'IlluminaHiSeq_miRNASeq':   'HiSeq',
                'IlluminaGA_miRNASeq':      'GA',
                'cnvrPlatform':             'SNP/CN',
                'Genome_Wide_SNP_6':        'SNP6',
                'methPlatform':             'DNAmeth',
                'HumanMethylation27':       '27k',
                'HumanMethylation450':      '450k',
                'gexpPlatform':             'mRNA',
                'IlluminaHiSeq_RNASeq':     'HiSeq/BCGSC', // actually this is bcgsc, broad, and unc
                'IlluminaHiSeq_RNASeqV2':   'HiSeq/UNC V2',
                'IlluminaGA_RNASeq':        'GA/BCGSC', // actually this is bcgsc and unc
                'IlluminaGA_RNASeqV2':      'GA/UNC V2',
                'rppaPlatform':             'Protein',
                'MDA_RPPA_Core':            'RPPA',
                'FEMALE':                   'Female',
                'MALE':                     'Male',
                '0':                        'Wild Type',
                '1':                        'Mutant',
                'age_at_initial_pathologic_diagnosis': 'Age at Diagnosis'
            };

            if (csv_name in translation_dictionary){
                return translation_dictionary[csv_name];
            } else{
                csv_name = csv_name.replace(/_/g, ' ');
                return csv_name.replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); });
            }
        }
    }
});
