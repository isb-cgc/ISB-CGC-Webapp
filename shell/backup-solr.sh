#!/bin/bash
CORE_LIST_FILE=""
CORE_LIST=""
FILE_NAME=""
DEST_BUCKET=""

while getopts ":c:l:f:d:h" flag
do
    case "${flag}" in
        h)
        echo "Solr Backup Script"
        echo "------------------"
        echo "-h           This help."
        echo "-l <FILE>    Specifies a file which lists the cores to be backed up. Required if -c is not supplied."
        echo "-c <CORE>    Specifies a list of comma-separated cores to back up. Required if -l is not supplied."
        echo "-f <FILE>    Specifies an output file name for the resulting TAR file. Optional."
        echo "-d <BUCKET>  Specifies a destination bucket for storing the resulting TAR output. Optional."
        echo " "
        echo "You must store the Solr API password in SOLR_PWD before running this script!"
        exit 0
        ;;
        l) CORE_LIST_FILE=${OPTARG}
        ;;
        c) CORE_LIST=${OPTARG}
        ;;
        f) FILE_NAME=${OPTARG}
        ;;
        d) DEST_BUCKET=${OPTARG}
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

if [ ! -d "/opt/bitnami/apache-solr/server/solr/backups" ]; then
    sudo -u solr mkdir /opt/bitnami/apache-solr/server/solr/backups
fi

cores=[]

if [[ $FILE_NAME == "" ]]; then
    FILE_NAME="solr_cores_backup.tar"
fi

if [[ $CORE_LIST != "" ]]; then
    IFS=$','
    read -a cores <<< "$CORE_LIST"
else
    IFS=$'\n'
    readarray -t cores < $CORE_LIST_FILE
fi

for core in "${cores[@]}"; do
    if [[ $core != "" ]]; then
        curl -u idc:$SOLR_PWD -X GET "https://localhost:8983/solr/$core/replication?command=backup&location=/opt/bitnami/solr/server/solr/backups/&name=$core" --cacert solr-ssl.pem
        sudo -u solr cp /opt/bitnami/apache-solr/server/solr/$core/conf/managed-schema /opt/bitnami/apache-solr/server/solr/backups/$core.managed-schema
    fi
done

tar -cvf ${FILE_NAME} -C /opt/bitnami/apache-solr/server/solr/backups .

if [[ ! -z ${DEST_BUCKET} ]]; then
        gsutil cp ${FILE_NAME} gs://$DEST_BUCKET/
else
        echo "[STATUS] Backups stored in tarfile ${FILE_NAME}."
fi

exit 0
