from copy import deepcopy
import json
import re
from google.appengine.api import urlfetch
from django.shortcuts import render
from mock_data import EGFR_GBM_LGG as FAKE_PLOT_DATA
from maf_api_mock_data import EGFR_BLCA_BRCA as FAKE_MAF_DATA
from django.conf import settings

SEQPEEK_VIEW_DEBUG_MODE = False

SAMPLE_ID_FIELD_NAME = 'tumor_sample_barcode'
TUMOR_TYPE_FIELD = "tumor"
COORDINATE_FIELD_NAME = 'amino_acid_position'

PROTEIN_DOMAIN_DB = 'PFAM'

MAF_ENDPOINT_URI_TEMPLATE = settings.BASE_API_URL + '/_ah/api/maf_api/v1/maf_search?gene={gene}&{tumor_parameters}'
BQ_ENDPOINT_URL = settings.BASE_API_URL + '/_ah/api/bq_api/v1'

INTERPRO_BQ_ENDPOINT_URI_TEMPLATE = settings.BASE_API_URL + '/_ah/api/bq_api/v1/bq_interpro?uniprot_id={uniprot_id}'

ALPHA_FINDER = re.compile('[\W_]+', re.UNICODE)

def _decode_list(data):
    rv = []
    for item in data:
        if isinstance(item, unicode):
            item = item.encode('utf-8')
        elif isinstance(item, list):
            item = _decode_list(item)
        elif isinstance(item, dict):
            item = _decode_dict(item)
        rv.append(item)
    return rv


def _decode_dict(data):
    rv = {}
    for key, value in data.iteritems():
        if isinstance(key, unicode):
            key = key.encode('utf-8')
        if isinstance(value, unicode):
            value = value.encode('utf-8')
        elif isinstance(value, list):
            value = _decode_list(value)
        elif isinstance(value, dict):
            value = _decode_dict(value)
        rv[key] = value
    return rv


def build_endpoint_uri(gene, tumor_type_list):
    tumor_set_template = '&'.join(['tumor={0}'.format(t) for t in tumor_type_list])
    uri = MAF_ENDPOINT_URI_TEMPLATE.format(gene=gene, tumor_parameters=tumor_set_template)
    return uri


def build_interpro_endpoint_uri(uniprot_id):
    uri = INTERPRO_BQ_ENDPOINT_URI_TEMPLATE.format(uniprot_id=uniprot_id)
    return uri


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


def get_track_statistics(track):
    return {
        'samples': {
            'numberOf': get_number_of_unique_samples(track)
        }
    }


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


def get_track_label(track):
    return track[TUMOR_TYPE_FIELD]


def get_protein_domains_local_debug(uniprot_id):
    return deepcopy(FAKE_PLOT_DATA['protein'])


def get_protein_domains_remote(uniprot_id):
    endpoint_uri = build_interpro_endpoint_uri(uniprot_id)
    api_response = urlfetch.fetch(endpoint_uri, deadline=60)
    data_json = json.loads(api_response.content)
    protein = data_json['items'][0]['interpro_json']
    return protein


def get_protein_domains(uniprot_id):
    if SEQPEEK_VIEW_DEBUG_MODE:
        return get_protein_domains_local_debug(uniprot_id)
    else:
        return get_protein_domains_remote(uniprot_id)


def get_maf_data_debug(gene, tumor_type_list):
    return deepcopy(FAKE_PLOT_DATA['tracks'])


def get_maf_data_remote(gene, tumor_type_list):
    endpoint_uri = build_endpoint_uri(gene, tumor_type_list)
    api_response = urlfetch.fetch(endpoint_uri, deadline=60)
    data_json = json.loads(api_response.content)
    return data_json['items']


def get_maf_data(gene, tumor_type_list):
    if SEQPEEK_VIEW_DEBUG_MODE:
        return deepcopy(FAKE_MAF_DATA['items'])
    else:
        return get_maf_data_remote(gene, tumor_type_list)


def build_track_data(tumor_type_list, all_tumor_mutations):
    tracks = []
    for tumor_type in tumor_type_list:
        tracks.append({
            TUMOR_TYPE_FIELD: tumor_type,
            'mutations': filter(lambda m: m['tumor_type'] == tumor_type, all_tumor_mutations)
        })

    return tracks


def find_uniprot_id(mutations):
    uniprot_id = None
    for m in mutations:
        if 'uniprot_id' in m:
            uniprot_id = m['uniprot_id']
            break

    return uniprot_id


def get_genes_tumors_lists_debug():
    return {
        'symbol_list': ['EGFR', 'TP53', 'PTEN'],
        'disease_codes': ['ACC', 'BRCA', 'GBM']
    }


def get_genes_tumors_lists_remote():
    uri = BQ_ENDPOINT_URL + '/bq_maf_genes'
    api_response = urlfetch.fetch(uri, deadline=60)
    symbol_list = json.loads(api_response.content, object_hook=_decode_dict)

    list = []
    for item in symbol_list['items']:
        list.append(str(item['hugo_symbol']))
    context = {
        'symbol_list': list
    }

    # uri = settings.BASE_API_URL + '/_ah/api/fm_api/v1/fmdomains'
    uri = settings.BASE_API_URL + '/_ah/api/meta_api/v1/metadata_domains'
    api_response = urlfetch.fetch(uri, deadline=60)
    disease_codes = json.loads(api_response.content, object_hook=_decode_dict)
    disease_codes = disease_codes['Disease_Code']

    context['disease_codes'] = disease_codes

    return context


def get_genes_tumors_lists():
    if SEQPEEK_VIEW_DEBUG_MODE:
        return get_genes_tumors_lists_debug()
    else:
        return get_genes_tumors_lists_remote()


def sanitize_gene_input(param_string):
    return ALPHA_FINDER.sub('', param_string)


def sanitize_normalize_tumor_type(tumor_type_list):
    sanitized = []
    for tumor_label in tumor_type_list:
        tumor_label = tumor_label.strip()
        tumor_label = ALPHA_FINDER.sub('', tumor_label)
        if len(tumor_label) > 0:
            sanitized.append(tumor_label)

    return sanitized


def seqpeek(request):
    context = get_genes_tumors_lists()

    if (('tumor_type' not in request.GET) or (request.GET['tumor_type'] == '')) or \
            (('gene' not in request.GET) or (request.GET['gene'] == '')):
        return render(request, 'seqpeek/seqpeek.html', context)

    # Remove non-alphanumeric characters from parameters and uppercase all
    gene = sanitize_gene_input(request.GET['gene']).upper()
    parsed_tumor_list = request.GET['tumor_type'].split(',')
    parsed_tumor_list = sanitize_normalize_tumor_type(parsed_tumor_list)

    if len(parsed_tumor_list) == 0:
        return render(request, 'seqpeek/seqpeek.html', context)

    maf_data = get_maf_data(gene, parsed_tumor_list)
    uniprot_id = find_uniprot_id(maf_data)
    protein_data = get_protein_domains(uniprot_id)
    track_data = build_track_data(parsed_tumor_list, maf_data)

    plot_data = {
        'gene_label': gene,
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
        track['label'] = get_track_label(track)

    plot_data['tracks'].append(build_summary_track(plot_data['tracks']))

    for track in plot_data['tracks']:
        # Calculate statistics
        track['statistics'] = get_track_statistics(track)
        # Unique ID for each row
        track['render_info'] = {
            'row_id': get_table_row_id(track[TUMOR_TYPE_FIELD])
        }

    plot_data['regions'] = build_seqpeek_regions(plot_data['protein'])
    plot_data['protein']['matches'] = filter_protein_domains(plot_data['protein']['matches'])

    tumor_list = ','.join(parsed_tumor_list)

    context.update({
        # 'request': request,
        'search': {},
        'plot_data': plot_data,
        'data_bundle': json.dumps(plot_data),
        'gene': gene,
        'tumor_list': tumor_list
    })

    return render(request, 'seqpeek/seqpeek.html', context)

