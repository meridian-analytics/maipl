#!/bin/bash

LOG_FILE="/logs/worker-${HOSTNAME}.log"

echo "Hostname: ${HOSTNAME}"

if [[ "$DEBUG" == "1" ]]; then
    echo "Ketos worker starting in debug mode"
    watchmedo auto-restart -d . -p '*.py' --recursive -- celery -A api worker --loglevel=info 2>&1 | tee ${LOG_FILE}
else
    echo "Ketos worker starting in production mode"
    celery -A api worker -l info 2>&1 | tee ${LOG_FILE}
fi