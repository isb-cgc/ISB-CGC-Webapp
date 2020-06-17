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

var TRANSLATION_DICT = {
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
    '1':                        'Mutant'
};

define(['jquery', 'tree_graph', 'stack_bar_chart'],
function($, tree_graph, stack_bar_chart) {
    
    var tree_graph_obj = Object.create(tree_graph, {});

    var PROG_CLIN_TREES = {
        'TCGA': {
            disease_code: 'Disease Code',
            vital_status: 'Vital Status',
            sample_type: 'Sample Type',
            tumor_tissue_site: 'Tumor Tissue Site',
            gender: 'Gender',
            age_at_diagnosis: 'Age at Diagnosis'
        },
        'CCLE':{
            disease_code: 'Disease Code',
            gender: 'Gender',
            site_primary: 'Site Primary',
            histology: 'Histology',
            hist_subtype: 'Histological Subtype'
        },
        'TARGET':{
            disease_code: 'Disease Code',
            vital_status: 'Vital Status',
            gender: 'Gender',
            sample_type: 'Sample Type',
            age_at_diagnosis: 'Age at Diagnosis'
        }
    };

    var user_data_attr = {
        user_program: 'Program',
        user_project: 'Project'
    };

    var format_num_with_commas = function(num) {
        if(isNaN(num))
            num = 0;
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };

    return  {

        filter_data_for_clin_trees: function(attr_counts, these_attr, program_id) {
            if(program_id == null || program_id == undefined) {
                program_id = $('ul.nav-tabs-data li.active a').data('program-id');
            }
            var filtered_clin_trees = {};
            var attr_counts_clin_trees = null;
            var filters = this.format_filters(program_id);
            var tree_attr_map = {};

            Object.keys(these_attr).map(function(attr){
                tree_attr_map[attr] = 1;
            });
            for(var i in filters) {
                if(filters.hasOwnProperty(i)) {
                    var fname = (i.indexOf(":") >= 0) ? i.split(/:/)[1] : i;
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

        update_counts_parsets: function(base_url_domain, endpoint, cohort_id, version, program_id, filter_panel_load){

            if(program_id == null || program_id == undefined) {
                program_id = $('ul.nav-tabs-data li.active a').data('program-id');
            }

            var clin_tree_attr = program_id <= 0 ? user_data_attr : PROG_CLIN_TREES[$('#'+program_id+'-data-filter-panel').data('prog-displ-name')];

            var context = this;
            var filters = {};
            if(cohort_id && !filter_panel_load) {
                cohort_programs.map(function(prog){
                    filters[prog.id] = context.format_filters(prog.id);
                });
            } else {
                filters[program_id] = this.format_filters(program_id);
            }

            // Get active panel
            var active_program_id = program_id || $('ul.nav-tabs-data li.active a').data('program-id');
            var active_panel = '' + active_program_id+'-data';

            $('.clinical-trees .spinner').show();
            $('.user-data-trees .spinner').show();
            $('.parallel-sets .spinner').show();

            $('button[data-target="#apply-filters-modal"]').prop('disabled',true);
            $('#apply-filters-form input[type="submit"]').prop('disabled',true);
            
            var startReq = new Date().getTime();

            if(filter_panel_load) {
                var clin_tree_attr_counts = Object.keys(filters).length > 0 ? context.filter_data_for_clin_trees(attr_counts, clin_tree_attr) : attr_counts;
                clin_tree_attr_counts.length > 0 && tree_graph_obj.draw_trees(clin_tree_attr_counts,clin_tree_attr,active_program_id,'#tree-graph-clinical-'+active_program_id);

                if (metadata_counts.hasOwnProperty('data_avail')) {
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
                    for (var i = 0; i < metadata_counts['data_avail'].length; i++) {
                        var new_item = {};
                        for (var j = 0; j < features.length; j++) {
                            var item = metadata_counts['data_avail'][i];
                            new_item[plot_features[j]] = context.get_readable_name(item[features[j]]);
                        }
                        metadata_counts['data_avail'][i] = new_item;
                    }
                } else {
                    console.debug(metadata_counts);
                }

                $('.clinical-trees .spinner').hide();
                $('.user-data-trees .spinner').hide();
                $('.parallel-sets .spinner').hide();

                return $.Deferred().resolve();
            } else {
                $('.cohort-info .total-values').hide();
                $('.cohort-info .spinner').show();
                var metadata_url = this.generate_metadata_url(base_url_domain, endpoint, filters, cohort_id, undefined, version, program_id);

                if(metadata_url.length > MAX_URL_LEN) {
                    $('#url-len-max-alert').show();
                    // This method is expected to return a promise, so send back a pre-rejected one
                    return $.Deferred().reject();
                } else {
                    $('#url-len-max-alert').hide();
                }

                return $.ajax({
                    type: 'GET',
                    url: metadata_url,

                    // On success
                    success: function (results, status, xhr) {
                        metadata_counts = results;
                        var stopReq = new Date().getTime();
                        console.debug("[BENCHMARKING] Time for response in update_counts_parsets: "+(stopReq-startReq)+ "ms");
                        case_counts = results['count'];


                        $('#p-'+program_id+'-data-total-samples').html(format_num_with_commas(metadata_counts['total']));
                        $('#p-'+program_id+'-data-total-participants').html(format_num_with_commas(metadata_counts['cases']));

                        if(cohort_id){
                            $('#c-'+cohort_id+'-data-total-samples').html(format_num_with_commas(metadata_counts['cohort-total']));
                            $('#c-'+cohort_id+'-data-total-participants').html(format_num_with_commas(metadata_counts['cohort-cases']));
                        }

                        context.update_filter_counts(case_counts, null, program_id);

                        var clin_tree_attr_counts = Object.keys(filters).length > 0 ? context.filter_data_for_clin_trees(case_counts, clin_tree_attr) : case_counts;
                        clin_tree_attr_counts.length > 0 && tree_graph_obj.draw_trees(clin_tree_attr_counts,clin_tree_attr,active_program_id,'#tree-graph-clinical-'+active_program_id);

                        if (metadata_counts.hasOwnProperty('data_avail')) {
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
                            for (var i = 0; i < metadata_counts['data_avail'].length; i++) {
                                var new_item = {};
                                for (var j = 0; j < features.length; j++) {
                                    var item = metadata_counts['data_avail'][i];
                                    new_item[plot_features[j]] = context.get_readable_name(item[features[j]]);
                                }
                                metadata_counts['data_avail'][i] = new_item;
                            }
                        } else {
                            console.debug(results);
                        }
                    },
                    error: function(req,status,err){
                        $('#' + active_program_id + '-data-total-samples').html("Error");
                        $('#' + active_program_id + '-data-total-participants').html("Error");
                    },
                    complete: function(xhr,status) {
                        $('.clinical-trees .spinner').hide();
                        $('.user-data-trees .spinner').hide();
                        $('.parallel-sets .spinner').hide();
                        $('.cohort-info .spinner').hide();
                        $('.cohort-info .total-values').show();
                    }
                });
            }
        },

        format_filters: function(program_id) {
            var list = {};
            var program_selector = '';
            if (program_id != '0') {
                program_selector = '#' + program_id + '-data ';
            }
            $(program_selector + '.selected-filters .panel-body span.filter-token').each(function() {
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

        generate_metadata_url: function(base_url_domain, endpoint, filters, cohort_id, limit, version, program_id) {
            version = version || 'v1';
            var url = base_url_domain + '/cohorts/get_metadata_ajax/?version=' + version + '&endpoint=' + endpoint + '&program_id=' + program_id + '&';

            if (cohort_id) {
                url += 'cohort_id=' + cohort_id + '&';
            }
            if (limit != null && limit !== undefined) {
                url += 'limit=' + limit + '&';
            }


            if (filters) {
                url += 'filters=' + encodeURIComponent(JSON.stringify(filters)) + '&';
            }

            url += 'mut_filter_combine='+$('.mut-filter-combine :selected').val();
            return url;
        },

        update_filter_counts: function(case_counts, data_counts, program_id) {

            counts_by_name = {};

            // Convert the arrays into a map for easier searching
            case_counts.map(function(obj){
                counts_by_name[obj.name] = {
                    values: {},
                    total: obj.total
                };
                var values = counts_by_name[obj.name].values;
                obj.values.map(function(val){
                    values[val.value] = val.count;
                });
            });

            $('#'+program_id+'-data-filter-panel li.list-group-item div.cohort-feature-select-block').each(function() {
                var $this = $(this),
                    attr = $this.data('feature-name');
                if(attr && attr.length > 0 && attr !== 'specific-mutation' ) {
                    $('#'+program_id+'-data-filter-panel ul#'+program_id+'-'+attr+' input').each(function () {

                        var $that = $(this),
                            value = $that.data('value-name'),
                            id = $that.data('value-id'),
                            displ_name = ($that.data('value-displ-name') == 'NA' ? 'None' : $that.data('value-displ-name')),
                            new_count = '0';
                        if (counts_by_name[attr]) {
                            if (counts_by_name[attr].values[value] || counts_by_name[attr].values[displ_name] || counts_by_name[attr].values[id]) {
                                new_count = (counts_by_name[attr].values[value] || counts_by_name[attr].values[displ_name] || counts_by_name[attr].values[id]);
                            }
                        }
                        $that.siblings('span').html(format_num_with_commas(new_count));
                    });
                }
            });
        },
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////////

        get_readable_name: function(csv_name) {
            if(csv_name && csv_name.length > 0) {
                if (csv_name in TRANSLATION_DICT) {
                    return TRANSLATION_DICT[csv_name];
                }
                csv_name = csv_name.replace(/_/g, ' ');
                //return csv_name.replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); });
                return csv_name;
            }
            return '';
        }
    }
});
