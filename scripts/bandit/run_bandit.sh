#!/usr/bin/env bash

# Run in the project root.
# Usage:
# sh ./scripts/bandit/run_bandit.sh <path_to_report_directory>

DATE=`date +%Y-%m-%d`
REPORT_DIR=$1

# Plaintext report
REPORT_FILE=$REPORT_DIR/$DATE.report.txt
bandit -c ./etc/bandit.yaml -ll -n 5 -r -f txt -o $REPORT_FILE ./

# XML report
REPORT_FILE=$REPORT_DIR/$DATE.report.xml
bandit -c ./etc/bandit.yaml -ll -n 5 -r -f xml -o $REPORT_FILE ./
