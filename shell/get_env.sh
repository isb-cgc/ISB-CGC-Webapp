if [ -z "${ENV_FILE_PATH}" ] || [ ! -f "${ENV_FILE_PATH}" ]; then
    echo "Environment variables file wasn't found - doublecheck secure_path.env and make sure it is a valid, VM-relative path!"
    echo "Current value of ENV_FILE_PATH is: ${ENV_FILE_PATH}"
    echo "WINDOWS USERS: If you are on a Windows host box and seeing this message, you may need to run dos2unix on your shell scripts to fix the line terminators."
    exit 1
fi
exit 0