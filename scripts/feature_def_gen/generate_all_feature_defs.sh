#!/usr/bin/env bash

config_dir=$1

python scripts/feature_def_gen/gexp_features.py $config_dir/gexp.json
python scripts/feature_def_gen/mirna_features.py $config_dir/mirna.json
python scripts/feature_def_gen/copynumber_features.py $config_dir/cnv.json
python scripts/feature_def_gen/methylation_features.py $config_dir/methylation.json
python scripts/feature_def_gen/protein_features.py $config_dir/rppa.json
python scripts/feature_def_gen/gnab_features.py $config_dir/maf.json

