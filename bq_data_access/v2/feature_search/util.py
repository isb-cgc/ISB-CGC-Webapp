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

from builtins import object
from bq_data_access.data_types.definitions import FEATURE_ID_TO_TYPE_MAP
from bq_data_access.v2.feature_id_utils import FeatureDataTypeHelper, PlottableDataType
from bq_data_access.v2.feature_search.searcher_mapping import get_feature_searcher_class_from_data_type

import logging

logger = logging.getLogger('main_logger')

class SearchableFieldHelper(object):
    @classmethod
    def get_fields_for_all_datatypes(cls, genomic_build):
        """
        Return searchable fields for all data types for which data is available
        for the given genomic build.
        
        The data availability for given build for a data type is resolved by finding
        tables with matching build in the table configuration of the data type in
        the bq_data_access/data_types module. If no matching tables are found,
        no entry is returned for the data type.
        
        An exception to the above is clinical data, for which the searchable fields will
        always be returned. This is because the clinical data tables are not associated
        to a genomic build.
        
        Since the genomic build is stored in lower case in the BigQuery table
        configurations, the genomic_build parameter will be lowercased as well.
    
        Returns:
            Array of objects, with 'datatype' field and 'fields' key that contains an
            array of searchable_fields objects from the feature searcher classes.
        """
        genomic_build = genomic_build.lower()

        result = []
        for _, data_type in FEATURE_ID_TO_TYPE_MAP.items():
            config_class = FeatureDataTypeHelper.get_feature_def_config_from_data_type(data_type)
            if not config_class: # User data has no config class
                continue
            data_type_config_dict = FeatureDataTypeHelper.get_feature_def_default_config_dict_from_data_type(data_type)
            config_instance = config_class.from_dict(data_type_config_dict)

            # Check if any tables for the data type match the build.
            # Clinical data type will always be returned, as the clinical data tables are
            # not tied to a genomic build.
            found = False
            if data_type != PlottableDataType.CLIN:
                for table_config in config_instance.data_table_list:
                    # This would fail for a CLINTableConfig object, as it has no "genomic_build" member.
                    if table_config.genomic_build == genomic_build:
                        found = True
                        break
                if not found:
                    continue

            searcher_class = get_feature_searcher_class_from_data_type(data_type)
            datatype_prefix = searcher_class.get_datatype_identifier()
            searchable_fields = searcher_class.get_searchable_fields()

            result.append({
                'datatype': datatype_prefix,
                'fields': searchable_fields
            })

        return result
