#!/bin/bash
set -euo pipefail

CORE_LIST_FILE=""
CORE_LIST=""
FILE_NAME=""
DEST_BUCKET=""
MAX_WAIT=3
SOLR_DATA="/opt/bitnami/solr/server/solr"
RUN=`date +%s`
BACKUPS_DIR="${SOLR_DATA}/backups_${RUN}"
PARSE_RESPONSE="import sys, json; print(json.load(sys.stdin)['details'].get('backup',{}).get('snapshotCompletedAt',None) or 'INCOMPLETE')"

while getopts ":c:l:f:d:h" flag
do
    case "${flag}" in
        h)
        echo "Solr Backup Script"
        echo "------------------"
        echo "-h           This help."
        echo "-l <FILE>    Specifies a file which lists the cores to be backed up. Required if -c is not supplied."
        echo "-c <CORE>    Specifies a list of comma-separated cores to back up. Required if -l is not supplied."
        echo "-f <FILE>    Specifies an output file name for the resulting TAR file. Optional. Default: solr_cores_backup_<datestamp>.tar"
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
if [ -z $SOLR_USER ]; then
    echo "[ERROR] Solr API user not supplied - exiting."
    exit 1
fi

if [[ ! -f $CORE_LIST_FILE ]] && [[ $CORE_LIST == "" ]]; then
    echo "[ERROR] Couldn't find list of cores - exiting."
    exit 1
fi

if [ ! -d $BACKUPS_DIR ]; then
    sudo -u solr mkdir $BACKUPS_DIR
    echo "[STATUS] Backups will be saved to ${BACKUPS_DIR}"
fi

cores=[]

if [[ $FILE_NAME == "" ]]; then
    FILE_NAME="solr_cores_backup_${RUN}.tar.gz"
fi
echo "[STATUS] Backups will be tar'd to ${FILE_NAME}"

if [[ $CORE_LIST != "" ]]; then
    IFS=$','
    read -a cores <<< "$CORE_LIST"
else
    IFS=$'\n'
    readarray -t cores < $CORE_LIST_FILE
fi
echo "[STATUS] Building backup script: "

for core in "${cores[@]}"; do
    if [[ $core != "" ]]; then
        echo "----------------> Backup for core ${core} <-----------------"
        echo "Copying schema for ${core}..."
        sudo -u solr cp ${SOLR_DATA}/${core}/conf/managed-schema.xml ${BACKUPS_DIR}/$core.managed-schema.xml
        echo "Executing backup command for ${core}:"
        curl -u ${SOLR_USER}:${SOLR_PWD} -X GET "https://localhost:8983/solr/$core/replication?command=backup&location=${BACKUPS_DIR}/&name=${core}" --cacert solr-ssl.pem
        curl -s -u ${SOLR_USER}:${SOLR_PWD} -X GET "https://localhost:8983/solr/${core}/replication?command=details" --cacert solr-ssl.pem
        status=`curl -s -u ${SOLR_USER}:${SOLR_PWD} -X GET "https://localhost:8983/solr/${core}/replication?command=details" --cacert solr-ssl.pem | python3 -c "${PARSE_RESPONSE}"`
        retries=0
        while [[ "$status" == "INCOMPLETE" && "$retries" -lt  "$MAX_WAIT" ]]; do
          echo "Backup for core ${core} isn't completed, waiting..."
          sleep 2
          ((retries=retries+1))
          status=`curl -s -u ${SOLR_USER}:${SOLR_PWD} -X GET "https://localhost:8983/solr/${core}/replication?command=details" --cacert solr-ssl.pem | python3 -c "${PARSE_RESPONSE}"`
          echo "Status is now ${status}"
        done
        if [ "$status" != "INCOMPLETE" ]; then
          echo "Core ${core} backup completed at ${status}."
        else
          echo "Core ${core} backup is still pending."
          echo "You may need to re-run TAR on the snapshots from ${BACKUPS_DIR} if you see an error message about files changing during the TAR process."
        fi
         echo "----------------> /Backup for core ${core} <-----------------"
    fi
done

if [ $? -ne 0 ]; then
  echo "There was a problem backing up some of the cores! Exiting."
  exit 1
fi

echo ""
echo -n "Allowing extra time for all writes to the backup directory to complete"
for k in `seq 1 3`; do
  echo -n "."
  sleep 1
done
echo ".done."

echo "Taring contents of ${BACKUPS_DIR}..."
tar -cvzf ${FILE_NAME} -C ${BACKUPS_DIR} .

#
if [[ ! -z ${DEST_BUCKET} ]]; then
        gsutil cp ${FILE_NAME} gs://${DEST_BUCKET}/
else
        echo "[STATUS] Backups stored in tarfile ${FILE_NAME}."
fi

exit 0
