###
# Copyright 2015-2023, Institute for Systems Biology
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
###

mkdir ./json
mkdir ./txt

gsutil cp "gs://${DEPLOYMENT_BUCKET}/${ENV_FILE}" ./.env
gsutil cp "gs://${DEPLOYMENT_BUCKET}/${SOLR_PEM_FILE}" ./solr-ssl.pem
gsutil cp "gs://${DEPLOYMENT_BUCKET}/${DISPATCH_YAML}" ./dispatch.yaml

gsutil cp "gs://${DEPLOYMENT_BUCKET}/${STATIC_COMMIT_CHECK_FILE}" ./

# Pack staged files for caching
echo "Packing JSON and text files for caching into deployment..."
cp --verbose *.json ./json
cp --verbose *.txt ./txt
