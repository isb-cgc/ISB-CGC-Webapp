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

from bq_data_access.feature_search.gexp_searcher import GEXPSearcher
from bq_data_access.feature_search.clinical_searcher import ClinicalSearcher
from bq_data_access.feature_search.methylation_searcher import METHSearcher
from bq_data_access.feature_search.copynumber_search import CNVRSearcher
from bq_data_access.feature_search.protein import RPPASearcher
from bq_data_access.feature_search.microrna_searcher import MIRNSearcher
from bq_data_access.feature_search.gnab_searcher import GNABSearcher

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
