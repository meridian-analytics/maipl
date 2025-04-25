import logging.handlers
import os
import os.path
from django.conf import settings
import gzip
import shutil
import subprocess

# Configure base logger
logger = logging.getLogger("maipl")
formatter = logging.Formatter(
    "%(asctime)s : %(pathname)s : %(funcName)s : %(lineno)s : %(levelname)s : %(message)s"
)

# Log rotation settings
MAX_BYTES = 10 * 1024 * 1024  # 10MB per log file
BACKUP_COUNT = 2  # Keep 2 rotated files

def namer(name):
    """Custom namer function to add .gz extension to rotated files"""
    return name + ".gz"

def rotator(source, dest):
    """Custom rotator function to compress rotated files"""
    with open(source, 'rb') as f_in:
        with gzip.open(dest, 'wb') as f_out:
            shutil.copyfileobj(f_in, f_out)
    os.remove(source)

def get_hostname():
    """Get the hostname using multiple methods"""
    # Try environment variables first (commonly set in Docker)
    hostname = os.environ.get('HOSTNAME')
    
    # If no HOSTNAME, try hostname command
    if not hostname:
        try:
            hostname = subprocess.check_output(['hostname']).decode().strip()
        except:
            hostname = "unknown"
    
    return hostname

# Configure handlers for different components
def setup_logger(component_name):
    """Setup logger for a specific component"""
    hostname = get_hostname()
    log_file = os.path.join(settings.LOGS_ROOT, f"{component_name}-{hostname}.log")
    
    # Create logs directory if it doesn't exist
    os.makedirs(settings.LOGS_ROOT, exist_ok=True)
    
    handler = logging.handlers.RotatingFileHandler(
        log_file,
        maxBytes=MAX_BYTES,
        backupCount=BACKUP_COUNT
    )
    handler.setFormatter(formatter)
    handler.rotator = rotator
    handler.namer = namer
    
    logger_name = f"maipl.{component_name}"
    component_logger = logging.getLogger(logger_name)
    component_logger.addHandler(handler)
    component_logger.setLevel(logging.INFO)
    return component_logger

# Setup loggers for different components
backend_logger = setup_logger("backend")
worker_logger = setup_logger("worker")
api_logger = setup_logger("api")
annotation_logger = setup_logger("annotation")
file_logger = setup_logger("file")
modelrunner_logger = setup_logger("modelrunner")
modeltrainer_logger = setup_logger("modeltrainer")
