if [ -n "$CI" ]; then
    export HOME=/home/circleci/${CIRCLE_PROJECT_REPONAME}
    export HOMEROOT=/home/circleci/${CIRCLE_PROJECT_REPONAME}
else
    export HOME=/home/vagrant
    export HOMEROOT=/home/vagrant/www
fi

export PYTHONPATH=${HOMEROOT}:${HOMEROOT}/lib:${HOMEROOT}/ISB-CGC-Common
export DJANGO_SETTINGS_MODULE=isb_cgc.settings
echo "PYTHONPATH IS ${PYTHONPATH}"

shopt -s globstar

echo "::::::::::::::::::::: Running Pylint on ISB-CGC-WebApp modules :::::::::::::::::::::"

python3 -m pylint -d C adminrestrict analysis bq_data_access genes isb_cgc offline scripts seqpeek session_security variables visualizations workbooks ./*.py

echo "::::::::::::::::::::: Running Pylint on ISB-CGC-Common modules :::::::::::::::::::::"

python3 -m pylint -d C accounts cohorts solr_helpers sharing projects metadata_utils dataset_utils

exit 0