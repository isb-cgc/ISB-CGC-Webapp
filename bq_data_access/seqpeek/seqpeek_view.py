"""

Copyright 2015, Institute for Systems Biology

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

"""

from copy import deepcopy
import logging

from bq_data_access.seqpeek.seqpeek_interpro import InterProDataProvider

SAMPLE_ID_FIELD_NAME = 'sample_id'
TRACK_ID_FIELD = "tumor"
COORDINATE_FIELD_NAME = 'uniprot_aapos'
PROTEIN_ID_FIELD = 'uniprot_id'

PROTEIN_DOMAIN_DB = 'PFAM'

SEQPEEK_VIEW_DEBUG_MODE = False


def build_gnab_feature_id(gene):
    return "GNAB:{gene_label}:variant_classification".format(gene_label=gene)


def get_number_of_unique_samples(track):
    # todo: change this to get total_rows from bigquery endpoint
    # note: result from this function isn't the same as total_rows from bigquery
    sample_ids = set()
    for mutation in track['mutations']:
        sample_ids.add(mutation[SAMPLE_ID_FIELD_NAME])

    return len(sample_ids)


# TODO remove if not needed
def clean_track_mutations(mutations_array):
    retval = []
    for mutation in mutations_array:
        cleaned = deepcopy(mutation)
        cleaned[COORDINATE_FIELD_NAME] = int(mutation[COORDINATE_FIELD_NAME])
        retval.append(cleaned)

    return retval


def sort_track_mutations(mutations_array):
    return sorted(mutations_array, key=lambda k: k[COORDINATE_FIELD_NAME])


def get_track_statistics_by_track_type(track, cohort_info_map):
    track_id = track[TRACK_ID_FIELD]

    result = {
        'samples': {
            'numberOf': get_number_of_unique_samples(track)
        }
    }

    if track['type'] == 'tumor':
        cohort_info = cohort_info_map[track_id]
        result['cohort_size'] = cohort_info['size']
    else:
        # Do not assign cohort size for the 'COMBINED' track.
        result['cohort_size'] = None

    return result


def filter_protein_domains(match_array):
    return [m for m in match_array if m['dbname'] == PROTEIN_DOMAIN_DB]


def get_table_row_id(tumor_type):
    return "seqpeek_row_{0}".format(tumor_type)


def build_seqpeek_regions(protein_data):
    return [{
        'type': 'exon',
        'start': 0,
        'end': protein_data['length']
    }]


def build_summary_track(tracks):
    all = []
    for track in tracks:
        all.extend(track["mutations"])

    return {
        'mutations': all,
        'label': 'COMBINED',
        'tumor': 'none-combined',
        'type': 'summary'
    }


def get_track_label_and_cohort_information(track_id_value, cohort_info_map):
    cohort_info = cohort_info_map[track_id_value]

    label = cohort_info['name']
    cohort_size = cohort_info['size']
    return label, cohort_size


def get_track_label(track, cohort_info_array):
    # The IDs in cohort_info_array are integers, whereas the track IDs are strings.
    cohort_map = {str(item['id']): item['name'] for item in cohort_info_array}
    return cohort_map[track[TRACK_ID_FIELD]]


def get_protein_domains(uniprot_id):
    protein = InterProDataProvider().get_data(uniprot_id)
    return protein


class MAFData(object):
    def __init__(self, cohort_info, data):
        self.cohort_info = cohort_info
        self.data = data

    @classmethod
    def from_dict(cls, param):
        return cls(param['cohort_set'], param['items'])


def build_track_data(track_id_list, all_tumor_mutations):
    tracks = []
    for track_id in track_id_list:
        tracks.append({
            TRACK_ID_FIELD: track_id,
            'mutations': filter(lambda m: int(track_id) in set(m['cohort']), all_tumor_mutations)
        })

    return tracks


def find_uniprot_id(mutations):
    uniprot_id = None
    for m in mutations:
        if PROTEIN_ID_FIELD in m:
            uniprot_id = m[PROTEIN_ID_FIELD]
            break

    return uniprot_id


def get_genes_tumors_lists_debug():
    return {
        'symbol_list': ['EGFR', 'TP53', 'PTEN'],
        'disease_codes': ['ACC', 'BRCA', 'GBM']
    }


def get_genes_tumors_lists_remote():
    context = {
        'symbol_list': [],
        'track_id_list': []
    }

    return context


def get_genes_tumors_lists():
    if SEQPEEK_VIEW_DEBUG_MODE:
        return get_genes_tumors_lists_debug()
    else:
        return get_genes_tumors_lists_remote()


def get_track_id_list(param):
    return map(str, param)


def format_removed_row_statistics_to_list(stats_dict):
    result = []
    for key, value in stats_dict.items():
        result.append({
            'name': key,
            'num': value
        })

    return result


class SeqPeekViewDataBuilder(object):
    def build_view_data(self, hugo_symbol, filtered_maf_vector, seqpeek_cohort_info, cohort_id_list, removed_row_statistics):
        context = get_genes_tumors_lists()

        cohort_info_map = {str(item['id']): item for item in seqpeek_cohort_info}
        track_id_list = get_track_id_list(cohort_id_list)

        # Since the gene (hugo_symbol) parameter is part of the GNAB feature ID,
        # it will be sanity-checked in the SeqPeekMAFDataAccess instance.
        uniprot_id = find_uniprot_id(filtered_maf_vector)

        logging.info("UniProt ID: " + str(uniprot_id))
        protein_data = get_protein_domains(uniprot_id)
        track_data = build_track_data(track_id_list, filtered_maf_vector)

        plot_data = {
            'gene_label': hugo_symbol,
            'tracks': track_data,
            'protein': protein_data
        }

        # Pre-processing
        # - Sort mutations by chromosomal coordinate
        for track in plot_data['tracks']:
            track['mutations'] = sort_track_mutations(track['mutations'])

        # Annotations
        # - Add label, possibly human readable
        # - Add type that indicates whether the track is driven by data from search or
        #   if the track is aggregate
        for track in plot_data['tracks']:
            track['type'] = 'tumor'

            label, cohort_size = get_track_label_and_cohort_information(track[TRACK_ID_FIELD], cohort_info_map)
            track['label'] = label

        plot_data['tracks'].append(build_summary_track(plot_data['tracks']))

        for track in plot_data['tracks']:
            # Calculate statistics
            track['statistics'] = get_track_statistics_by_track_type(track, cohort_info_map)
            # Unique ID for each row
            track['render_info'] = {
                'row_id': get_table_row_id(track[TRACK_ID_FIELD])
            }

        plot_data['regions'] = build_seqpeek_regions(plot_data['protein'])
        plot_data['protein']['matches'] = filter_protein_domains(plot_data['protein']['matches'])

        tumor_list = ','.join(track_id_list)

        context.update({
            'plot_data': plot_data,
            'hugo_symbol': hugo_symbol,
            'tumor_list': tumor_list,
            'cohort_id_list': track_id_list,
            'removed_row_statistics': format_removed_row_statistics_to_list(removed_row_statistics)
        })

        return context

