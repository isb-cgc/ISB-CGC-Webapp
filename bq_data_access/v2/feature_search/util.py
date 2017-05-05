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

from bq_data_access.data_types.definitions import FEATURE_ID_TO_TYPE_MAP
from bq_data_access.v2.feature_id_utils import FeatureDataTypeHelper


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
        
        Since the genomic build is stored in lower case in the BigQuery table
        configurations, the genomic_build parameter will be lowercased as well.
    
        Returns:
            Array of objects, with 'datatype' field and 'fields' key that contains an
            array of searchable_fields objects from the feature searcher classes.
        """
        genomic_build = genomic_build.lower()

        result = []
        for _, data_type in FEATURE_ID_TO_TYPE_MAP.iteritems():
            config_class = FeatureDataTypeHelper.get_feature_def_config_from_data_type(data_type)
            data_type_config_dict = FeatureDataTypeHelper.get_feature_def_default_config_dict_from_data_type(data_type)
            config_instance = config_class.from_dict(data_type_config_dict)

            # Check if any tables for the data type match the build
            found = False
            for table_config in config_instance.data_table_list:
                if table_config.genomic_build == genomic_build:
                    found = True
                    break
            if not found:
                continue

            searcher_class = FeatureDataTypeHelper.get_feature_searcher_class_from_data_type(data_type)
            datatype_prefix = searcher_class.get_datatype_identifier()
            searchable_fields = searcher_class.get_searchable_fields()

            result.append({
                'datatype': datatype_prefix,
                'fields': searchable_fields
            })

        return result
