if [ -z "${ENV_FILE_PATH}" ] || [ ! -f "${ENV_FILE_PATH}" ]; then
    echo "Environment variables file wasn't found - doublecheck secure_path.env and make sure it is a valid, VM-relative path!"
    echo "Current value of ENV_FILE_PATH is: ${ENV_FILE_PATH}"
    exit 1
fi
