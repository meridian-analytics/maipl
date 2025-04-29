#!/bin/bash

# Get hostname using multiple methods
LOG_FILE="/logs/backend-${HOSTNAME}.log"

echo "DEBUG: $DEBUG"

# Use Python to log the initial messages and capture output
python3 -c "
import logging
import sys
import subprocess
from logging.handlers import RotatingFileHandler

# Configure logging
logger = logging.getLogger('maipl.backend')
logger.setLevel(logging.INFO)

# Create rotating file handler
handler = RotatingFileHandler('$LOG_FILE', maxBytes=10485760, backupCount=2)
handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
logger.addHandler(handler)

# Log initial messages
logger.info('Starting backend service')
logger.info('Running migrations...')

# Run migrations and capture output
def run_command(cmd):
    process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    for line in process.stdout:
        logger.info(line.strip())
    process.wait()
    return process.returncode

# Run migrations
run_command(['python', 'manage.py', 'showmigrations'])
run_command(['python', 'manage.py', 'migrate'])
run_command(['python', 'manage.py', 'showmigrations'])
run_command(['python', 'manage.py', 'collectstatic', '--noinput'])

# Start gunicorn
if '$DEBUG' == '1':
    logger.info('Starting development backend')
    run_command(['gunicorn', '--worker-class=gevent', '--max-requests', '50', '--reload', '--bind', '0.0.0.0:8000', '--log-level=info', 'api.wsgi'])
else:
    logger.info('Starting production backend')
    run_command(['gunicorn', '--worker-class=gevent', '--max-requests', '50', '--bind', '0.0.0.0:8000', '--log-level=info', 'api.wsgi'])
"