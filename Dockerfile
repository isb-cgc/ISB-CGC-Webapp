###
#
# Copyright 2017, Institute for Systems Biology
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

# Dockerfile extending the Python Community image from Dockerhub with application files for a
# single application.
FROM python:3.9-bullseye

SHELL ["/bin/bash", "-c"]

ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update
RUN apt-get install -y wget
RUN wget "http://repo.mysql.com/mysql-apt-config_0.8.26-1_all.deb" -P /tmp

# install lsb-release (a dependency of mysql-apt-config), since dpkg doesn't
# do dependency resolution
RUN apt-get install -y lsb-release
# TODO: we need to start using the keyring instead
RUN apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 467B942D3A79BD29
RUN dpkg --install /tmp/mysql-apt-config_0.8.26-1_all.deb

# fetch the updated package metadata (in particular, mysql-server)
RUN apt-get update

# aaaand now let's install mysql-server
RUN apt-get install -y mysql-server

RUN apt-get -y install build-essential
RUN apt-get -y install --reinstall python3-m2crypto python3-cryptography
RUN apt-get -y install libxml2-dev libxmlsec1-dev swig
RUN pip install pexpect

RUN apt-get -y install unzip libffi-dev libssl-dev libmysqlclient-dev python3-mysqldb python3-dev libpython3-dev git ruby g++ curl

ADD . /app

# We need to recompile some of the items because of differences in compiler versions
RUN pip install -r /app/requirements.txt -t /app/lib/ --upgrade
RUN pip install gunicorn==21.2.0

ENV PYTHONPATH="/app:/app/lib:/app/IDC-Common:${PYTHONPATH}"

WORKDIR /app/

# Quick config check
RUN python manage.py check

# Until we figure out a way to do it in CircleCI without whitelisting IPs this has to be done by a dev from
# ISB
# RUN python /app/manage.py migrate --noinput

CMD gunicorn -c gunicorn.conf.py -b :$PORT idc.wsgi -w 5 -t 70
