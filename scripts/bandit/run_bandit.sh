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

# Run in the project root.
# Usage:
# sh ./scripts/bandit/run_bandit.sh <path_to_report_directory>

DATE=`date +%Y-%m-%d`
REPORT_DIR=$1

# Plaintext report
REPORT_FILE=$REPORT_DIR/$DATE.report.txt
bandit -c ./etc/bandit.yaml -ll -n 5 -r -f txt -o $REPORT_FILE ./

# XML report
REPORT_FILE=$REPORT_DIR/$DATE.report.xml
bandit -c ./etc/bandit.yaml -ll -n 5 -r -f xml -o $REPORT_FILE ./
