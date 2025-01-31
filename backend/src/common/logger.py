import logging.handlers
import os
import os.path
from django.conf import settings


logger = logging.getLogger("maipl")
formatter = logging.Formatter(
    "%(asctime)s : %(pathname)s : %(funcName)s : %(lineno)s : %(levelname)s : %(message)s"
)
fileMaxByte = 256 * 1024 * 200  # 100MB
fileHandler = logging.handlers.RotatingFileHandler(
    os.path.join(settings.LOGS_ROOT, "maipl.log"),
    maxBytes=fileMaxByte,
    backupCount=10,
)
fileHandler.setFormatter(formatter)
logger.addHandler(fileHandler)
logger.setLevel(logging.INFO)
