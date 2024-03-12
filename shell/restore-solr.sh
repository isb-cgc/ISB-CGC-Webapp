#!/bin/bash
TARFILE=""
BACKUP_DIR="./"
MAKE_CORE=false
SOLR_DATA="/opt/bitnami/solr/server/solr"

while getopts ":d:t:ch" flag
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
        echo "-c           Switch for toggling creation of the Solr core based on the snapshot name. Default: Off."
        echo "  "
        exit 0
        ;;
        d) BACKUP_DIR=${OPTARG}
        ;;
        t) TARFILE=${OPTARG}
        ;;
        c) MAKE_CORE=true
        ;;
    esac
done

if [[ ! -d $BACKUP_DIR ]]; then
  echo "[ERROR] Backup directory ${BACKUP_DIR} not found - exiting!"
  exit 1
else
  if [[ "${BACKUP_DIR: -1}" == "/" ]]; then
    BACKUP_DIR=${BACKUP_DIR::-1}
  fi
fi

if [ -z $SOLR_PWD ]; then
  echo "[ERROR] SOLR_PWD not set - exiting!"
  exit 1
fi
if [ -z $SOLR_USER ]; then
    echo "[ERROR] Solr API user not supplied - exiting."
    exit 1
fi

if [[ $TARFILE != "" ]]; then
    if [[ -f $TARFILE ]]; then
        tar -xvf $TARFILE -C $BACKUP_DIR
    else
        echo "[ERROR] TAR archive ${TARFILE} not found - exiting!"
        exit 1
    fi
fi

for dirname in ${BACKUP_DIR}/*/; do
  CORE=""
  if [[ "$BACKUP_DIR" == "./" ]]; then
    CORE=$(awk -F. '{print $3}' <<< $dirname)
  else
    CORE=$(awk -F'[./]' '{print $3}' <<< $dirname)
  fi
  if [[ "${CORE}" == "" || "${CORE}" == " " ]]; then
    echo "Something's wrong with the directory structure! Exiting."
    exit 1
  fi
  if [ "$MAKE_CORE" = true ]; then
    echo "[STATUS] Core creation enabled - attempting creation of core \"${CORE}\"..."
    sudo -u solr solr create -c $CORE
  else
    echo "[STATUS] Core creation disabled - this assumes core \"${CORE}\" exists already!"
    echo "  You'll see an error if it doesn't."
  fi

  SNAPSHOT=$(awk -F'[/]' '{print $2}' <<< $dirname)
  echo "Restoring core ${CORE}...into snapshot ${SNAPSHOT}"
  sudo chown solr $dirname
  sudo -u solr cp -r $dirname $SOLR_DATA/$CORE/data/$SNAPSHOT
  if [[ -f $SOLR_DATA/$CORE/conf/managed-schema ]]; then
    sudo -u solr mv $SOLR_DATA/$CORE/conf/managed-schema $SOLR_DATA/$CORE/conf/managed-schema.old
  fi
  sudo -u solr cp $BACKUP_DIR/$CORE.managed-schema.xml $SOLR_DATA/$CORE/conf/managed-schema.xml
  curl -u $SOLR_USER:$SOLR_PWD -X GET "https://localhost:8983/solr/$CORE/replication?command=restore&name=$CORE" --cacert solr-ssl.pem
  echo "Restoration started, status check:"
  curl -u $SOLR_USER:$SOLR_PWD -X GET "https://localhost:8983/solr/$CORE/replication?command=details&name=$CORE" --cacert solr-ssl.pem
done

echo "Remember to wait until the cores are done restoring before you restart!"

exit 0
