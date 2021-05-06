#!/bin/bash
CORE_LIST_FILE=""
CORE_LIST=""

while getopts ":c:l:h" flag
do
    case "${flag}" in
        h)
        echo "Solr Backup Script"
        echo "------------------"
        echo "-h           This help."
        echo "-l <FILE>    Specifies a file which lists the cores to be backed up. Required if -c is not supplied."
        echo "-c <CORE>    Specifies a list of comma-separated cores to back up. Required if -l is not supplied."
        echo " "
        echo "You must store the Solr API password in SOLR_PWD before running this script!"
        exit 0
        ;;
        c) CORE_LIST_FILE=${OPTARG}
        ;;
        l) CORE_LIST=${OPTARG}
        ;;
    esac
done

if [ -z $SOLR_PWD ]; then
    echo "[ERROR] Solr API password not supplied - exiting."
    exit 1
fi

if [[ ! -f $CORE_LIST_FILE ]] && [[ $CORE_LIST == "" ]]; then
    echo "[ERROR] Couldn't find list of cores - exiting."
    exit 1
fi

if [ ! -d "/bitnami/solr/data/backups" ]; then
    sudo -u solr mkdir /bitnami/solr/data/backups
fi

cores=[]

if [[ $CORE_LIST != "" ]]; then
    IFS=$','
    read -a cores <<< "$CORE_LIST"
else
    IFS=$'\n'
    readarray -t cores < $CORE_LIST_FILE
fi

for core in "${cores[@]}"; do
    if [[ $core != "" ]]; then
        curl -u isb:$SOLR_PWD -X GET "https://localhost:8983/solr/$core/replication?command=backup&location=/opt/bitnami/solr/server/solr/backups/&name=$core" --cacert solr-ssl.pem
        sudo -u solr cp /opt/bitnami/solr/data/$core/conf/managed-schema /bitnami/solr/data/backups/$core.managed-schema
    fi
done

tar -cvf solr-cores-backup.tar /bitnami/solr/data/backups

gsutil cp solr-cores-backup.tar gs://$DEST_BUCKET/

exit 0
