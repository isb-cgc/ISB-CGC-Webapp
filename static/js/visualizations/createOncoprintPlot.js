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


define(['jquery', 'oncoprintjs', 'underscore', 'oncoprint_setup', 'canvas_toBlob', 'zlibs', 'png'], function ($, oncoprintjs, _) {
    var processData = function (array) {
        // Need to mock webservice data to be compatible with tooltip
        var gene_to_sample_to_datum = {};
        var cna = {'AMP': 'amp', 'GAIN': 'gain', 'HETLOSS': 'hetloss', 'HOMDEL': 'homdel'};
        var cna_int = {'AMP': '2', 'GAIN': '1', 'HETLOSS': '-1', 'HOMDEL': '-2'};
        var mrna = {'UP': 'up', 'DOWN': 'down'};
        var mrna_int = {'UP': 1, 'DOWN': -1};
        var prot = {'PROT-UP': 'up', 'PROT-DOWN': 'down'};
        var prot_int = {'PROT-UP': 1, 'PROT-DOWN': -1};
        var lines = array;
        var samples = {};
        for (var i = 0; i < lines.length; i++) {
            var sline = lines[i].trim().split(/\s+/);
            var sample = sline[0].trim();
            if (sample === '') {
                continue;
            }
            samples[sample] = true;
            if (sline.length === 1) {
                continue;
            }
            var gene = sline[1].trim();
            var alteration = sline[2].trim();
            var type = sline[3].trim().toLowerCase();

            gene_to_sample_to_datum[gene] = gene_to_sample_to_datum[gene] || {};
            gene_to_sample_to_datum[gene][sample] = gene_to_sample_to_datum[gene][sample] || {
                'gene': gene,
                'sample': sample,
                'data': [],
                'disp_mut':{}
                //'disp_mut':[]
            };

            if (cna.hasOwnProperty(alteration)) {
                gene_to_sample_to_datum[gene][sample].data.push({
                    genetic_alteration_type: 'COPY_NUMBER_ALTERATION',
                    profile_data: cna_int[alteration]
                });
                gene_to_sample_to_datum[gene][sample].disp_cna = cna[alteration];
            } else if (mrna.hasOwnProperty(alteration)) {
                gene_to_sample_to_datum[gene][sample].data.push({
                    genetic_alteration_type: 'MRNA_EXPRESSION',
                    oql_regulation_direction: mrna_int[alteration]
                });
                gene_to_sample_to_datum[gene][sample].disp_mrna = mrna[alteration];
            } else if (prot.hasOwnProperty(alteration)) {
                gene_to_sample_to_datum[gene][sample].disp_prot = prot[alteration];
                gene_to_sample_to_datum[gene][sample].data.push({
                    genetic_alteration_type: 'PROTEIN_LEVEL',
                    oql_regulation_direction: prot_int[alteration]
                });
            } else {
                var ws_datum = {
                    genetic_alteration_type: 'MUTATION_EXTENDED',
                    amino_acid_change: alteration,
                };
                if (type === "fusion") {
                    ws_datum.oncoprint_mutation_type = "fusion";
                    gene_to_sample_to_datum[gene][sample].disp_fusion = true;
                } else {
                    gene_to_sample_to_datum[gene][sample].disp_mut[type] = "";
                }
                gene_to_sample_to_datum[gene][sample].data.push(ws_datum);
            }
        }
        var data_by_gene = {};
        var altered_by_gene = {};
        _.each(gene_to_sample_to_datum, function (sample_data, gene) {
            if(gene !== "None") {
                data_by_gene[gene] = [];
                altered_by_gene[gene] = [];
                _.each(Object.keys(samples), function (sample) {
                    // pad out data
                    if (!sample_data.hasOwnProperty(sample)) {
                        data_by_gene[gene].push({'gene': gene, 'sample': sample, 'data': []});
                    }
                });
                _.each(sample_data, function (datum, sample) {
                    data_by_gene[gene].push(datum);
                    altered_by_gene[gene].push(sample);
                });
            }
        });
        return {'data_by_gene': data_by_gene, 'altered_by_gene': altered_by_gene};
    };
    return {
        isInputValid: function (array) {
            var lines = _.map(array, function (x) {
                return x.trim();
            });
            for (var i = 0; i < lines.length; i++) {
                var split_line_length = lines[i].split(/\s+/).length;
                if (split_line_length !== 1 && split_line_length !== 4) {
                    return false;
                }
            }
            return true;
        },
        createOncoprintPlot: function (plot_selector, data) {
            $(plot_selector).html($(plot_selector).siblings('.oncoprint_div').html());
            var updateOncoprinter = CreateOncoprinterWithToolbar(plot_selector, '.oncoprint .oncoprint_body', '.oncoprint .oncoprint-diagram-toolbar-buttons');
            gene_order = sample_order = null;
            if (data.length > 0) {
                var process_result = processData(data);
                updateOncoprinter(process_result.data_by_gene, 'sample', process_result.altered_by_gene, sample_order, gene_order);
            } else {

            }
        }
    }
});

