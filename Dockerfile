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

# Dockerfile extending the generic Python image with application files for a
# single application.
FROM gcr.io/google_appengine/python

# Create a virtualenv for dependencies. This isolates these packages from
# system-level packages.
# Use -p python3 or -p python3.7 to select python version. Default is version 2.
RUN virtualenv /env -p python3

# Setting these environment variables are the same as running
# source /env/bin/activate.
ENV VIRTUAL_ENV /env
ENV PATH /env/bin:$PATH

RUN apt-get update
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get install -y wget gpg lsb-release

RUN echo 'Obtaining MySQL build key...'
RUN wget --no-check-certificate -qO - 'https://keyserver.ubuntu.com/pks/lookup?op=get&search=0x859be8d7c586f538430b19c2467b942d3a79bd29' | sudo gpg --dearmor -o /usr/share/keyrings/mysql-keyring.gpg
RUN apt-get update
RUN echo 'Setting up mysql.list to force 5.7 from Bionic...'
RUN echo "deb [signed-by=/usr/share/keyrings/mysql-keyring.gpg] http://repo.mysql.com/apt/ubuntu/ bionic mysql-5.7" | sudo tee /etc/apt/sources.list.d/mysql.list

# fetch the updated package metadata (in particular, mysql-server-5.7)
RUN apt-get update

# aaaand now let's install mysql client
RUN apt-get install -fy mysql-community-client=5.7.40-1ubuntu18.04
RUN apt-get install -fy mysql-client=5.7.40-1ubuntu18.04

# Get pip3 installed
RUN curl --silent https://bootstrap.pypa.io/get-pip.py | python3

RUN apt-get -y install build-essential
RUN apt-get -y install --reinstall python-m2crypto python3-crypto
RUN apt-get -y install libxml2-dev libxmlsec1-dev swig
RUN pip3 install pexpect

RUN apt-get -y install unzip libffi-dev libssl-dev libmysqlclient-dev python3-mysqldb python3-dev libpython3-dev git ruby g++ curl
RUN easy_install -U distribute

ADD . /app

# We need to recompile some of the items because of differences in compiler versions 
RUN pip3 install -r /app/requirements.txt -t /app/lib/ --upgrade
RUN pip3 install gunicorn==19.6.0

ENV PYTHONPATH=/app:/app/lib:/app/ISB-CGC-Common:${PYTHONPATH}

# Until we figure out a way to do it in CircleCI without whitelisting IPs this has to be done by a dev from
# ISB
# RUN python /app/manage.py migrate --noinput

#CMD gunicorn -c gunicorn.conf.py -b :$PORT isb_cgc.wsgi -w 3 -t 130
CMD gunicorn -c gunicorn.conf.py -b :$PORT isb_cgc.wsgi -w 3 -t 300
# increasing timeout to 5 mins
