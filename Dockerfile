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
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get install -y wget
RUN wget "http://dev.mysql.com/get/mysql-apt-config_0.5.3-1_all.deb" -P /tmp

# install lsb-release (a dependency of mysql-apt-config), since dpkg doesn't
# do dependency resolution
RUN apt-get install -y lsb-release
# add a debconf entry to select mysql-5.7 as the server version when we install
# the mysql config package
RUN echo "mysql-apt-config mysql-apt-config/select-server select mysql-5.7" | debconf-set-selections
# having 'selected' mysql-5.7 for 'server', install the mysql config package
RUN dpkg --install /tmp/mysql-apt-config_0.5.3-1_all.deb

# fetch the updated package metadata (in particular, mysql-server-5.7)
RUN apt-get update

# aaaand now let's install mysql-server-5.7
RUN apt-get install -y mysql-server-5.7

RUN apt-get -y install python-mysqldb
RUN apt-get -y install python-pip
RUN apt-get -y install build-essential
RUN apt-get -y install python-dev
RUN apt-get -y install --reinstall python-crypto python-m2crypto python3-crypto
RUN apt-get -y install libxml2-dev libxmlsec1-dev swig
RUN pip install python-saml==2.1.4
RUN pip install pexpect


RUN apt-get -y install libffi-dev libssl-dev libmysqlclient-dev python2.7-dev curl
RUN apt-get -y install git
RUN easy_install -U distribute


ADD . /app

# We need to recompile some of the items because of differences in compiler versions
RUN pip install -r /app/requirements.txt -t /app/lib/ --upgrade
RUN mkdir /app/lib/endpoints/
RUN cp /app/google_appengine/lib/endpoints-1.0/endpoints/* /app/lib/endpoints/

ENV PYTHONPATH=/app:/app/lib

RUN /app/manage.py makemigrations
RUN /app/manage.py migrate
