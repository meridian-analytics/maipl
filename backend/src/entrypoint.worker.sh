#!/bin/bash

LOG_FILE="/logs/worker-${HOSTNAME}.log"

echo "Hostname: ${HOSTNAME}"

# Use Python to log the initial messages and capture output
python3 -c "
import logging
import sys
import subprocess
from logging.handlers import RotatingFileHandler

# Configure logging
logger = logging.getLogger('maipl.worker')
logger.setLevel(logging.INFO)

# Create rotating file handler
handler = RotatingFileHandler('$LOG_FILE', maxBytes=10485760, backupCount=2)
handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
logger.addHandler(handler)

# Log initial messages
logger.info('Starting worker service')
logger.info(f'Hostname: ${HOSTNAME}')

# Run command and capture output
def run_command(cmd):
    process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    for line in process.stdout:
        logger.info(line.strip())
    process.wait()
    return process.returncode

# Start celery worker
if '$DEBUG' == '1':
    logger.info('Starting worker in debug mode')
    run_command(['watchmedo', 'auto-restart', '-d', '.', '-p', '*.py', '--recursive', '--', 'celery', '-A', 'api', 'worker', '--loglevel=info'])
else:
    logger.info('Starting worker in production mode')
    run_command(['celery', '-A', 'api', 'worker', '-l', 'info'])
"