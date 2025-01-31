#!/bin/bash

if [[ "$DEBUG" == "1" ]]; then
    echo "Ketos worker starting in debug mode"
    watchmedo auto-restart -d . -p '*.py' --recursive -- celery -A api worker --loglevel=info 2>&1 | tee /logs/ketos_worker.log
else
    echo "Ketos worker starting in production mode"
    celery -A api worker -l info 2>&1 | tee /logs/celery_worker.log
fi