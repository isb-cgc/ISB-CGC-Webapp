#!/bin/bash
TARFILE=""
BACKUP_DIR="./"

while getopts ":d:t:h" flag
do
    case "${flag}" in
        h)
        echo "Solr Backup Restore Script"
        echo "--------------------------"
        echo "-h           This help."
        echo "-d <DIR>     Specifies a directory where the backup snapshots and schemas are currently found. Optional."
        echo "             Default: ./"
        echo "-t <FILE>    Specifies a TAR file which contains the tar'd backups. Optional. Default: None"
        echo "             (Assumes -d <DIR> indicates destination for tar -x.)"
        exit 0
        ;;
        d) BACKUP_DIR=${OPTARG}
        ;;
        t) TARFILE=${OPTARG}
        ;;
    esac
done


if [[ $TARFILE != "" ]]; then
    if [[ -f $TARFILE ]]; then
        tar -xvf $TARFILE -C $BACKUP_DIR
    else
        echo "[ERROR] TAR archive ${TARFILE} not found - exiting!"
        exit 1
    fi
fi

if [[ ! -d $BACKUP_DIR ]]; then
    echo "[ERROR] TAR archive ${TARFILE} not found - exiting!"
    exit 1
fi

for dirname in "${BACKUP_DIR}*; do
  CORE=$([ $BACKUP_DIR = "./" ] && awk -F. '{print $3}' <<< $dirname || awk -F. '{print $2}' <<< $dirname)
  sudo -u solr /opt/bitnami/solr/bin/solr create -c $CORE -s 2 -rf 2
  sudo chown solr $dirname
  sudo -u solr cp $dirname /opt/bitnami/solr/data/$CORE/data/$dirname
  sudo -u solr mv /opt/bitnami/solr/data/$CORE/conf/managed-schema /opt/bitnami/solr/data/$CORE/conf/managed-schema.old
  sudo -u solr cp $dirname/$CORE.managed-schema /opt/bitnami/solr/data/$CORE/conf/managed-schema
  curl -u isb:$SOLR_PWD -X GET "https://localhost:8983/solr/$CORE/replication?command=restore&name=$CORE" --cacert /opt/bitnami/solr/server/etc/solr-ssl.pem
done

sudo -u solr /opt/bitnami/solr/bin/solr restart
