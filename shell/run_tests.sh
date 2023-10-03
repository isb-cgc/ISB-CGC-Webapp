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

if [ -n "$CI" ]; then
    export HOME=/home/circleci/${CIRCLE_PROJECT_REPONAME}
    export HOMEROOT=/home/circleci/${CIRCLE_PROJECT_REPONAME}
else
    export HOME=/home/vagrant
    export HOMEROOT=/home/vagrant/www
fi

export PYTHONPATH=${HOMEROOT}:${HOMEROOT}/lib:${HOMEROOT}/ISB-CGC-Common
export DJANGO_SETTINGS_MODULE=isb_cgc.settings_unit_test
echo "PYTHONPATH IS ${PYTHONPATH}"

shopt -s globstar

echo "Running Django unit tests..."

python3 ./manage_unit_test.py test --noinput

echo "Running module unit tests with unittest..."

python3 -m unittest common_tests
