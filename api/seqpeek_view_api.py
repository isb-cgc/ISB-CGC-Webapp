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

import logging

from endpoints import method as endpoints_method
from endpoints import InternalServerErrorException
from protorpc import remote
from protorpc.messages import IntegerField, Message, MessageField, StringField, Variant

from bq_data_access.seqpeek.seqpeek_view import SeqPeekViewDataBuilder
from bq_data_access.data_access import get_feature_vectors_tcga_only
from api.seqpeek_api import SeqPeekDataEndpointsAPI, MAFRecord, maf_array_to_record
from bq_data_access.seqpeek.seqpeek_maf_formatter import SeqPeekMAFDataFormatter
from bq_data_access.seqpeek_maf_data import SeqPeekDataProvider
from bq_data_access.data_access import ProviderClassQueryDescription


class SeqPeekViewDataRequest(Message):
    hugo_symbol = StringField(1, required=True)
    cohort_id = IntegerField(2, repeated=True)


class InterproMatchLocation(Message):
    # TODO this should likely be a float
    score = IntegerField(1, variant=Variant.INT32)
    start = IntegerField(2, variant=Variant.INT32)
    end = IntegerField(3, variant=Variant.INT32)


class InterproMatch(Message):
    status = StringField(1)
    name = StringField(2)
    evd = StringField(3)
    locations = MessageField(InterproMatchLocation, 4, repeated=True)
    dbname = StringField(5)
    id = StringField(6)


class InterproJson(Message):
    matches = MessageField(InterproMatch, 1, repeated=True)
    uniprot_id = StringField(2)
    length = IntegerField(3, variant=Variant.INT32)
    name = StringField(4)


class InterproItem(Message):
    uniprot_id = StringField(1)
    interpro_json = MessageField(InterproJson, 2, repeated=False)


class SeqPeekRegionRecord(Message):
    type = StringField(1, required=True)
    start = IntegerField(2, required=True, variant=Variant.INT32)
    end = IntegerField(3, required=True, variant=Variant.INT32)


class SeqPeekTrackRecord(Message):
    mutations = MessageField(MAFRecord, 1, repeated=True)
    type = StringField(2, required=True)
    label = StringField(3, required=True)
    number_of_samples = IntegerField(4, required=True)
    cohort_size = IntegerField(5, required=False)
    row_id = StringField(6, required=True)


class SeqPeekViewPlotDataRecord(Message):
    tracks = MessageField(SeqPeekTrackRecord, 1, repeated=True)
    protein = MessageField(InterproItem, 2, required=True)
    regions = MessageField(SeqPeekRegionRecord, 3, repeated=True)


class SeqPeekRemovedRow(Message):
    name = StringField(1, required=True)
    num = IntegerField(2, required=True)


class SeqPeekViewRecord(Message):
    cohort_id_list = StringField(1, repeated=True)
    hugo_symbol = StringField(2, required=True)
    plot_data = MessageField(SeqPeekViewPlotDataRecord, 3, required=True)
    removed_row_statistics = MessageField(SeqPeekRemovedRow, 4, repeated=True)


def create_interpro_record(interpro_literal):
    match_data = []
    for match in interpro_literal['matches']:

        match_location_data = []
        for location in match['locations']:
            match_location_data.append(InterproMatchLocation(
                score=int(location['score']),
                start=int(location['start']),
                end=int(location['end'])
            ))

        match_data.append(InterproMatch(
            status=str(match['status']),
            name=str(match['name']),
            evd=str(match['evd']),
            locations=match_location_data,
            dbname=str(match['dbname']),
            id=str(match['id']),
        ))

    interpro_json = InterproJson(
        matches=match_data,
        uniprot_id=str(interpro_literal['uniprot_id']),
        length=int(interpro_literal['length']),
        name=str(interpro_literal['name'])
    )

    return InterproItem(
        interpro_json=interpro_json
    )


@SeqPeekDataEndpointsAPI.api_class(resource_name='data_endpoints')
class SeqPeekViewDataAccessAPI(remote.Service):
    def build_gnab_feature_id(self, gene_label):
        return "GNAB:{gene_label}:variant_classification".format(gene_label=gene_label)

    def create_response(self, seqpeek_view_data):
        plot_data = seqpeek_view_data['plot_data']
        tracks = []
        for track in plot_data['tracks']:
            mutations = maf_array_to_record(track['mutations'])
            tracks.append(SeqPeekTrackRecord(mutations=mutations, label=track['label'], type=track["type"],
                                             row_id=track['render_info']['row_id'],
                                             number_of_samples=track['statistics']['samples']['numberOf'],
                                             cohort_size=track['statistics']['cohort_size']))

        region_records = []
        for region in plot_data['regions']:
            region_records.append(SeqPeekRegionRecord(**region))

        protein = create_interpro_record(plot_data['protein'])
        plot_data_record = SeqPeekViewPlotDataRecord(tracks=tracks, protein=protein, regions=region_records)

        removed_row_statistics = []
        for item in seqpeek_view_data['removed_row_statistics']:
            removed_row_statistics.append(SeqPeekRemovedRow(**item))

        return SeqPeekViewRecord(plot_data=plot_data_record, hugo_symbol=seqpeek_view_data['hugo_symbol'],
                                 cohort_id_list=seqpeek_view_data['cohort_id_list'],
                                 removed_row_statistics=removed_row_statistics)

    @endpoints_method(SeqPeekViewDataRequest, SeqPeekViewRecord,
                      path='view_data', http_method='GET', name='seqpeek.getViewData')
    def seqpeek_view_data(self, request):
        try:
            hugo_symbol = request.hugo_symbol
            cohort_id_array = request.cohort_id

            gnab_feature_id = self.build_gnab_feature_id(hugo_symbol)
            logging.debug("GNAB feature ID for SeqPeke: {0}".format(gnab_feature_id))

            async_params = [ProviderClassQueryDescription(SeqPeekDataProvider, gnab_feature_id, cohort_id_array)]
            maf_data_result = get_feature_vectors_tcga_only(async_params, skip_formatting_for_plot=True)

            maf_data_vector = maf_data_result[gnab_feature_id]['data']

            # Since the gene (hugo_symbol) parameter is part of the GNAB feature ID,
            # it will be sanity-checked in the SeqPeekMAFDataAccess instance.
            seqpeek_data = SeqPeekMAFDataFormatter().format_maf_vector_for_view(maf_data_vector, cohort_id_array)

            seqpeek_maf_vector = seqpeek_data.maf_vector
            seqpeek_cohort_info = seqpeek_data.cohort_info
            removed_row_statistics_dict = seqpeek_data.removed_row_statistics

            seqpeek_view_data = SeqPeekViewDataBuilder().build_view_data(hugo_symbol,
                                                                         seqpeek_maf_vector,
                                                                         seqpeek_cohort_info,
                                                                         cohort_id_array,
                                                                         removed_row_statistics_dict)

            response = self.create_response(seqpeek_view_data)
            return response
        except Exception as e:
            logging.exception(e)
            raise InternalServerErrorException()

