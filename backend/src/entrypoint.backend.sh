#!/bin/bash

echo "DEBUG: $DEBUG"

python manage.py showmigrations | tee /logs/show_migrate.log
python manage.py migrate | tee /logs/command_migrate.log
python manage.py showmigrations | tee /logs/show_migrate.log
python manage.py collectstatic --noinput | tee /logs/command_collectstatic.log

if [[ "$DEBUG" = 1 ]]; then
    echo "development backend starting"
    gunicorn --worker-class=gevent --max-requests 50 --reload --bind 0.0.0.0:8000 --log-level=info api.wsgi 2>&1 | tee /logs/gunicorn_django.log
else
    echo "production backend starting"
    gunicorn --worker-class=gevent --max-requests 50 --bind 0.0.0.0:8000 --log-level=info api.wsgi 2>&1 | tee /logs/gunicorn_django.log
fi