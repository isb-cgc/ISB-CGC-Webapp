from bq_data_access.feature_search.gexp import GEXPSearcher
from bq_data_access.feature_search.clinical import ClinicalSearcher
from bq_data_access.feature_search.methylation import METHSearcher
from bq_data_access.feature_search.copynumber import CNVRSearcher
from bq_data_access.feature_search.protein import RPPASearcher
from bq_data_access.feature_search.microrna import MIRNSearcher
from bq_data_access.feature_search.mutation import GNABSearcher

class SearchableFieldHelper(object):
    datatype_handlers = [
        GEXPSearcher,
        ClinicalSearcher,
        METHSearcher,
        CNVRSearcher,
        RPPASearcher,
        MIRNSearcher,
        GNABSearcher
    ]

    @classmethod
    def get_fields_for_all_datatypes(cls):
        result = []
        for searcher in cls.datatype_handlers:
            datatype = searcher.get_datatype_identifier()
            searchable_fields = searcher.get_searchable_fields()
            result.append({
                'datatype': datatype,
                'fields': searchable_fields
                })

        return result
