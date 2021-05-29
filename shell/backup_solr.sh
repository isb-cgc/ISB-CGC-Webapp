#!/bin/bash
if [ ! -d "/bitnami/solr/data/backups" ]; then
        sudo -u solr mkdir /bitnami/solr/data/backups
fi
if [ -z $SOLR_PWD ]; then
        echo "Solr API password not supplied! Exiting."
        exit 1
fi
for core in $(cat core_list.txt); do
        curl -u isb:$SOLR_PWD -X GET "https://localhost:8983/solr/$core/replication?command=backup&location=/opt/bitnami/solr/server/solr/backups/&
name=$core" --cacert solr-ssl.pem
        sudo -u solr cp /opt/bitnami/solr/data/$core/conf/managed-schema /bitnami/solr/data/backups/$core.managed-schema
done
