import os
import tempfile
from django.core.files import File as DjangoFile
from common.logger import file_logger
import h5py
from celery import shared_task
from common.file_utils import FileUtils
from common.h5_metadata import extract_h5_metadata_from_file


@shared_task(bind=True)
def update_meta_from_h5_file(self, file_id):
    """
    Update the meta information for a file based on its H5 file.

    Args:
        file_id: ID of the file to update
    """
    # log the start of the task
    file_logger.info(f"Starting update_meta_from_h5_file task for file ID: {file_id}")

    try:
        from .models import File
        file = File.objects.get(id=file_id)
        # log the file details
        file_logger.info(f"File details: {file.id}, {file.path}")
        
        # download the file
        file_utils = FileUtils()
        local_file_path = file_utils.download_file(file.id)

        # Extract metadata using the shared module
        metadata = extract_h5_metadata_from_file(local_file_path)
        
        if metadata:
            # Update the file metadata
            file.meta = metadata
            file.save()
            
            # log the meta information
            file_logger.info(f"Meta information updated: {file.meta}")
        else:
            file_logger.error(f"Failed to extract metadata from H5 file: {local_file_path}")
            
    except Exception as e:
        file_logger.error(f"Error updating meta from H5 file: {e}")
        raise e
        
    
    