#!/bin/bash

# Get hostname using multiple methods
LOG_FILE="/logs/backend-${HOSTNAME}.log"

echo "DEBUG: $DEBUG"

python manage.py showmigrations | tee ${LOG_FILE}
python manage.py migrate | tee -a ${LOG_FILE}
python manage.py showmigrations | tee -a ${LOG_FILE}
python manage.py collectstatic --noinput | tee -a ${LOG_FILE}

if [[ "$DEBUG" = 1 ]]; then
    echo "development backend starting"
    gunicorn --worker-class=gevent --max-requests 50 --reload --bind 0.0.0.0:8000 --log-level=info api.wsgi 2>&1 | tee -a ${LOG_FILE}
else
    echo "production backend starting"
    gunicorn --worker-class=gevent --max-requests 50 --bind 0.0.0.0:8000 --log-level=info api.wsgi 2>&1 | tee -a ${LOG_FILE}
fi