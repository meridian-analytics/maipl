import os
import tempfile
from django.core.files import File as DjangoFile
from common.logger import file_logger
import h5py
from celery import shared_task

@shared_task(bind=True)
def update_meta_from_h5_file(self, file_id):
    """
    Update the meta information for a file based on its H5 file.

    Args:
        file_id: ID of the file to update
    """
    #log the start of the task
    file_logger.info(f"Starting update_meta_from_h5_file task for file ID: {file_id}")

    try:
        from .models import File
        from common.download_file import download_file
        file = File.objects.get(id=file_id)
        #log the file details
        file_logger.info(f"File details: {file.id}, {file.path}")
        
        #download the file
        local_file_path = download_file(file.id)

        #open the file
        with h5py.File(local_file_path, 'r') as f:
            groups = {}
            for group in list(f.keys()):
                groups[group] = list(f[group].keys())
            file.meta = {
                'groups': groups
            }
            file.save()
        # log the meta information
        file_logger.info(f"Meta information: {file.meta}")
    except Exception as e:
        file_logger.error(f"Error updating meta from H5 file: {e}")
        raise e
        
    
    