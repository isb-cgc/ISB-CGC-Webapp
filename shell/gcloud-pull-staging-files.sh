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
gsutil cp "gs://${DEPLOYMENT_BUCKET}/${WEBAPP_RUNTIME_SA_KEY}" ./privatekey.json
gsutil cp "gs://${DEPLOYMENT_BUCKET}/${MONITORING_SA_KEY}" ./
gsutil cp "gs://${DEPLOYMENT_BUCKET}/${DCF_SECRETS_FILE}" ./dcf_secrets.txt
gsutil cp "gs://${DEPLOYMENT_BUCKET}/solr-ssl.pem" ./solr-ssl.pem

gsutil cp "gs://${DEPLOYMENT_BUCKET}/${SERVICE_ACCOUNT_BLACKLIST_JSON_FILE}" ./
gsutil cp "gs://${DEPLOYMENT_BUCKET}/${GOOGLE_ORG_WHITELIST_JSON_FILE}" ./
gsutil cp "gs://${DEPLOYMENT_BUCKET}/${MANAGED_SERVICE_ACCOUNTS_JSON_FILE}" ./

gsutil cp "gs://${DEPLOYMENT_BUCKET}/${STATIC_COMMIT_CHECK_FILE}" ./

# Pack staged files for caching
echo "Packing JSON and text files for caching into deployment..."
cp --verbose *.json ./json
cp --verbose *.txt ./txt
