export PYTHONPATH=${HOMEROOT}:${HOMEROOT}/lib:${HOMEROOT}/ISB-CGC-Common
echo "PYTHONPATH IS ${PYTHONPATH}"

python3 ./manage_unit_test.py test