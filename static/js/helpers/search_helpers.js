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

define(['jquery', 'tree_graph', 'stack_bar_chart', 'draw_parsets'],
function($, tree_graph, stack_bar_chart, draw_parsets) {
    
    var tree_graph_obj = Object.create(tree_graph, {});
    var parsets_obj = Object.create(draw_parsets, {});

    return  {

        update_counts_parsets_direct: function() {

            $('.clinical-trees .spinner').show();
            $('.parallel-sets .spinner').show();
            $('.cohort-info .total-values').hide();
            $('.cohort-info .spinner').show();

            var context = this;

            attr_counts = metadata_counts['count'];

            $('#total-samples').html(metadata_counts['total']);
            $('#total-participants').html(metadata_counts['participants']);

            this.update_filter_counts(attr_counts);
            tree_graph_obj.draw_trees(attr_counts);

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
            $('.parallel-sets .spinner').hide();
            $('.cohort-info .spinner').hide();
            $('.cohort-info .total-values').show();
        },

        update_counts_parsets: function(base_url_domain, endpoint, cohort_id, version){
            var context = this;
            var filters = this.format_filters();
            var api_url = this.generate_metadata_url(base_url_domain, endpoint, filters, cohort_id, undefined, version);
            var update_filters = this.update_filter_counts;

            $('.clinical-trees .spinner').show();
            $('.parallel-sets .spinner').show();
            $('.cohort-info .total-values').hide();
            $('.cohort-info .spinner').show();
            
            var startReq = new Date().getTime();
            $.ajax({
                type: 'GET',
                url: api_url,

                // On success
                success: function (results, status, xhr) {
                    var stopReq = new Date().getTime();
                    console.debug("[BENCHMARKING] Time for response in update_counts_parsets: "+(stopReq-startReq)+ "ms");
                    attr_counts = results['count'];
                    $('#total-samples').html(results['total']);
                    $('#total-participants').html(results['participants']);
                    update_filters(attr_counts);
                    tree_graph_obj.draw_trees(attr_counts);
                    
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
                    $('#total-samples').html("Error");
                    $('#total-participants').html("Error");
                },
                complete: function(xhr,status) {
                    $('.clinical-trees .spinner').hide();
                    $('.parallel-sets .spinner').hide();
                    $('.cohort-info .spinner').hide();
                    $('.cohort-info .total-values').show();
                }
            });
        },

        update_counts: function(base_url_domain, endpoint, cohort_id, limit, version) {
            var filters = this.format_filters();
            var api_url = this.generate_metadata_url(base_url_domain, endpoint, filters, cohort_id, limit, version);
            var update_filters = this.update_filter_counts;
            $('.clinical-trees .spinner').show();
            var startReq = new Date().getTime();
            $.ajax({
                type: 'GET',
                url: api_url,

                // On success
                success: function (results, status, xhr) {
                    var stopReq = new Date().getTime();
                    console.debug("[BENCHMARKING] Time for response in update_counts: "+(stopReq-startReq)+ "ms");
                    attr_counts = results['count'];
                    $('.menu-bar .total-samples').html(results['total'] + ' Samples');
                    update_filters(attr_counts);
                    tree_graph_obj.draw_trees(attr_counts);
                },
                error: function(req,status,err){
                    
                },
                complete: function(xhr,status) {
                    $('.clinical-trees .spinner').hide();
                }
            });
        },

        update_parsets: function(base_url_domain, endpoint, cohort_id, version) {
            var filters = this.format_filters();
            var api_url = this.generate_metadata_url(base_url_domain, endpoint, filters, cohort_id, null, version);
            var context = this;
            $('.parallel-sets .spinner').show();
            var startReq = new Date().getTime();
            $.ajax({
                type: 'GET',
                url: api_url,
                success: function(results, status, xhr) {
                    var stopReq = new Date().getTime();
                    console.debug("[BENCHMARKING] Time for response in update_parsets: "+(stopReq-startReq)+ "ms");
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
                },error: function(req,status,err){

                },
                complete: function(xhr,status) {
                    $('.parallel-sets .spinner').hide();
                }
            })
        },

        format_filters: function() {
            var list = [];
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
                list.push({
                    key: key,
                    value: val,
                });
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

            for(var i=0; i < counts.length; i++) {
                counts_by_name[counts[i].name] = {
                    values: {},
                    total: counts[i].total
                };
                for(var k=0; k < counts[i].values.length; k++) {
                    counts_by_name[counts[i].name].values[counts[i].values[k].value] =  counts[i].values[k].count
                }
            }

            $('#filter-panel li.list-group-item div.cohort-feature-select-block').each(function() {
                var $this = $(this),
                    attr = $this.data('feature-name');
                $('ul#'+attr+' input').each(function(){

                    var $that = $(this),
                        value = $that.data('value-name'),
                        label = $that.parent().text(),
                        new_count = '';

                    if (counts_by_name[attr]) {
                        if (counts_by_name[attr].values[value] || counts_by_name[attr].values[label]) {
                            new_count = '(' + (counts_by_name[attr].values[value] || counts_by_name[attr].values[label]) + ')';
                        }
                    }
                    if (new_count == '') {
                        new_count = '(0)';
                    }
                    $that.parent().siblings('span').html(new_count);
                });
            })

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
                return csv_name.replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); });;
            }
        },

        disease_codes_original: [
            {
                "id": "BLCA",
                "label": "Bladder Urothelial Carcinoma"
            },
            {
                "id": "BRCA",
                "label": "Breast invasive carcinoma"
            },
            {
                "id": "COAD",
                "label": "Colon adenocarcinoma"
            },
            {
                "id": "GBM",
                "label": "Glioblastoma Multiforme"
            },
            {
                "id": "HNSC",
                "label": "Head and Neck squamous cell carcinoma"
            },
            {
                "id": "KIRC",
                "label": "Kidney renal clear cell carcinoma"
            },
            {
                "id": "LUAD",
                "label": "Lung adenocarcinoma"
            },
            {
                "id": "LUSC",
                "label": "Lung squamous cell carcinoma"
            },
            {
                "id": "OV",
                "label": "Ovarian serous cystadenocarcinoma"
            },
            {
                "id": "READ",
                "label": "Rectum adenocarcinoma"
            },
            {
                "id": "STAD",
                "label": "Stomach adenocarcinoma"
            },
            {
                "id": "UCEC",
                "label": "Uterine Corpus Endometrial Carcinoma"
            }
        ]
    }
});
