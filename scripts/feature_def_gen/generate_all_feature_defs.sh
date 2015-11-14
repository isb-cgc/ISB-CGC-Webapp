#!/usr/bin/env bash

# Copyright 2015, Institute for Systems Biology
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

config_dir=$1

python scripts/feature_def_gen/gexp_features.py $config_dir/gexp.json
python scripts/feature_def_gen/mirna_features.py $config_dir/mirna.json
python scripts/feature_def_gen/copynumber_features.py $config_dir/cnv.json
python scripts/feature_def_gen/methylation_features.py $config_dir/methylation.json
python scripts/feature_def_gen/protein_features.py $config_dir/rppa.json
python scripts/feature_def_gen/gnab_features.py $config_dir/maf.json

