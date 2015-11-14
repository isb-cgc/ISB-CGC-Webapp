###
#
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
#
###

# Dockerfile extending the generic Python image with application files for a
# single application.
FROM gcr.io/google_appengine/python-compat

RUN apt-get update
RUN DEBIAN_FRONTEND=noninteractive apt-get -y install mysql-server mysql-client mysql-common python-mysqldb
RUN DEBIAN_FRONTEND=noninteractive apt-get -y install python-pip
RUN DEBIAN_FRONTEND=noninteractive apt-get -y install build-essential
RUN DEBIAN_FRONTEND=noninteractive apt-get -y install python-dev
RUN DEBIAN_FRONTEND=noninteractive apt-get -y install --reinstall python-crypto python-m2crypto python3-crypto
RUN DEBIAN_FRONTEND=noninteractive apt-get -y install libxml2-dev libxmlsec1-dev swig
RUN pip install python-saml==2.1.4
RUN pip install pexpect
ADD . /app/
