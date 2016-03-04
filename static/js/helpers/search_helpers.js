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

define(['jquery', 'tree_graph', 'stack_bar_chart', 'draw_parsets'],
function($, tree_graph, stack_bar_chart, draw_parsets) {
    var tree_graph_obj = Object.create(tree_graph, {});
    var parsets_obj = Object.create(draw_parsets, {});
    return  {

        update_counts: function(base_api_url, endpoint, cohort_id, limit, version, token) {
            var filters = this.format_filters();
            var api_url = this.generate_metadata_url(base_api_url, endpoint, filters, cohort_id, limit, version, token);
            var update_filters = this.update_filter_counts;
            $('.clinical-trees .spinner').show();
            $.ajax({
                type: 'GET',
                url: api_url,

                // On success
                success: function (results, status, xhr) {
                    attr_counts = results['count'];
                    $('.menu-bar .total-samples').html(results['total'] + ' Samples');
                    update_filters(attr_counts);
                    tree_graph_obj.draw_trees(attr_counts);
                    $('.clinical-trees .spinner').hide()
                }
            });
        },

        update_parsets: function(base_api_url, endpoint, cohort_id, version, token) {
            var filters = this.format_filters();
            var api_url = this.generate_metadata_url(base_api_url, endpoint, filters, cohort_id, null, version, token);
            var context = this;
            $.ajax({
                type: 'GET',
                url: api_url,
                success: function(results, status, xhr) {
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
                        console.log(results);
                    }
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

        generate_metadata_url: function(base_api_url, endpoint, filters, cohort_id, limit, version, token) {
            version = version || 'v1';
            var api_url = base_api_url + '/_ah/api/meta_api/' + version + '/' + endpoint + '?';

            if (cohort_id) {
                api_url += 'cohort_id=' + cohort_id + '&';
            }
            if (limit != null && limit !== undefined) {
                api_url += 'limit=' + limit + '&';
            }
            if (token) {
                api_url += 'token=' + encodeURIComponent(token) + '&';
            }

            if (filters) {
                api_url += 'filters=' + encodeURIComponent(JSON.stringify(filters)) + '&';
            }

            return api_url;
        },

        update_filter_counts: function(counts) {
            $('#filter-panel ul li input').each(function() {
                var $this = $(this),
                    attr = $this.data('feature-name'),
                    value = $this.data('value-name'),
                    new_count = '';

                if (counts[attr]) {
                    for (var i = 0; i < counts[attr].length; i++) {
                        if (counts[attr][i]['value'].replace(/\s+/g, '_') == value) {
                            new_count = '(' + counts[attr][i]['count'] + ')';
                        }
                    }
                    if (new_count == '') {
                        new_count = '(0)';
                    }
                    $(this).siblings('span').html(new_count);
                } // Else we don't get counts from the metadata api yet

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
