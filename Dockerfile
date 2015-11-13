# Dockerfile extending the generic Python image with application files for a
# single application.
FROM gcr.io/google_appengine/python-compat

RUN apt-get update
RUN DEBIAN_FRONTEND=noninteractive apt-get -y install mysql-server mysql-client mysql-common python-mysqldb
RUN DEBIAN_FRONTEND=noninteractive apt-get -y install libffi-dev libssl-dev libmysqlclient-dev python2.7-dev curl
RUN DEBIAN_FRONTEND=noninteractive apt-get -y install build-essential
RUN DEBIAN_FRONTEND=noninteractive apt-get -y install python-dev git
RUN DEBIAN_FRONTEND=noninteractive apt-get -y install --reinstall python-crypto python-m2crypto python3-crypto
RUN DEBIAN_FRONTEND=noninteractive easy_install -U distribute

ADD . /app

# We need to recompile some of the items because of differences in compiler versions
RUN pip install -r /app/requirements.txt -t /app/lib/ --upgrade
RUN mkdir /app/lib/endpoints/
RUN cp /app/google_appengine/lib/endpoints-1.0/endpoints/* /app/lib/endpoints/

ENV PYTHONPATH=/app:/app/lib

RUN /app/manage.py makemigrations
RUN /app/manage.py migrate