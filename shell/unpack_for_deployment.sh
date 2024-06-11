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

echo "Unpacking JSON and txt files for deployment..."
cp ./txt/* ./
cp ./json/* ./

echo "JSON and txt files unpacked:"
ls ./*.txt
ls ./*.json

# Check if we need to rsync static
STATIC_LAST_COMMIT=$(git rev-list -1 HEAD -- "static")

if [ ! -f "${STATIC_COMMIT_CHECK_FILE}" ] || [ ${STATIC_LAST_COMMIT} != $(cat "${STATIC_COMMIT_CHECK_FILE}") ]; then
    echo "Beginning rsync of /static..."
    gsutil rsync -R static/ gs://${STATIC_BUCKET}
    git rev-list -1 HEAD -- "static" > "${STATIC_COMMIT_CHECK_FILE}"
    gsutil cp "${STATIC_COMMIT_CHECK_FILE}" gs://${DEPLOYMENT_BUCKET}/
else
    echo "No changes found in /static -- skipping rsync."
fi