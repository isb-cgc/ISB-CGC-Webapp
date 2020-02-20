if [ -n "$CI" ]; then
    export HOME=/home/circleci/${CIRCLE_PROJECT_REPONAME}
    export HOMEROOT=/home/circleci/${CIRCLE_PROJECT_REPONAME}
else
    export HOME=/home/vagrant
    export HOMEROOT=/home/vagrant/www
fi

export PYTHONPATH=${HOMEROOT}:${HOMEROOT}/lib:${HOMEROOT}/ISB-CGC-Common
export DJANGO_SETTINGS_MODULE=isb_cgc.settings_unit_test
echo "PYTHONPATH IS ${PYTHONPATH}"

echo "Running Django unit tests..."

python3 ./manage_unit_test.py test --noinput

echo "Running module unit tests with unittest..."

python3 -m unittest common_tests
