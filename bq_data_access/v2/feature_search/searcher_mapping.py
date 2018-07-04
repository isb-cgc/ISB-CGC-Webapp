"""

Copyright 2017, Institute for Systems Biology

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

from bq_data_access.data_types.definitions import PlottableDataType

from bq_data_access.v2.feature_search.gexp_searcher import GEXPSearcher
from bq_data_access.v2.feature_search.gnab_searcher import GNABSearcher
from bq_data_access.v2.feature_search.methylation_searcher import METHSearcher
from bq_data_access.v2.feature_search.protein_searcher import RPPASearcher
from bq_data_access.v2.feature_search.copynumber_search import CNVRSearcher
from bq_data_access.v2.feature_search.microrna_searcher import MIRNSearcher
from bq_data_access.v2.feature_search.clinical_searcher import ClinicalSearcher


FEATURE_TYPE_TO_FEATURE_SEARCHER_MAP = {
    PlottableDataType.GEXP: GEXPSearcher,
    PlottableDataType.GNAB: GNABSearcher,
    PlottableDataType.METH: METHSearcher,
    PlottableDataType.RPPA: RPPASearcher,
    PlottableDataType.CNVR: CNVRSearcher,
    PlottableDataType.MIRN: MIRNSearcher,
    PlottableDataType.CLIN: ClinicalSearcher
}


def get_feature_searcher_class_from_data_type(data_type):
    searcher_class = FEATURE_TYPE_TO_FEATURE_SEARCHER_MAP[data_type]
    return searcher_class
