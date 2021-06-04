#!/bin/bash
for dirname in *; do
  CORE=$(awk -F. '{print $2}' <<< $dirname)
  sudo -u solr /opt/bitnami/solr/bin/solr create -c $CORE -s 2 -rf 2
  sudo chown solr $dirname
  sudo -u solr cp $dirname /opt/bitnami/solr/data/$CORE/data/$dirname
  sudo -u solr mv /opt/bitnami/solr/data/$CORE/conf/managed-schema /opt/bitnami/solr/data/$CORE/conf/managed-schema.old
  sudo -u solr cp $CORE.managed-schema /opt/bitnami/solr/data/$CORE/conf/managed-schema
  curl -u isb:$SOLR_PWD -X GET "https://localhost:8983/solr/$CORE/replication?command=restore&name=$CORE" --cacert /opt/bitnami/solr/server/etc/sol
r-ssl.pem
done
