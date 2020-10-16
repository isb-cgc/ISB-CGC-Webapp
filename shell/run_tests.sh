if [ -n "$CI" ]; then
    export HOME=/home/circleci/${CIRCLE_PROJECT_REPONAME}
    export HOMEROOT=/home/circleci/${CIRCLE_PROJECT_REPONAME}
else
    export HOME=/home/vagrant
    export HOMEROOT=/home/vagrant/www
fi

export PYTHONPATH=${HOMEROOT}:${HOMEROOT}/lib:${HOMEROOT}/IDC-Common
echo "PYTHONPATH IS ${PYTHONPATH}"

#python3 ./manage_unit_test.py test --noinput

python3 ./manage_unit_test.py test solr_helpers google_helpers.bigquery --noinput
#python3 ./manage_unit_test.py test  --noinput

echo "Running module unit tests with unittest..."

#python3 -m unittest solr_helpers
