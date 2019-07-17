#!/usr/bin/env bash

# Copyright 2019, Institute for Systems Biology
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.


#
# Wrapper around the idle_checker script, which runs in an infinite loop. This handles passing the
# stdout to multilog, which is designed to create a fixed set of logs so old results are tossed.
#

source ./bin/setEnvVars.sh

python3 ./bin/idle_checker.py ${PROJECT} ${MACHINE_NAME} 600 300 | multilog t s200000 n10 ./idlelogs