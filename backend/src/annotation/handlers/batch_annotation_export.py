import os
import csv
import logging
from datetime import datetime
from django.conf import settings
from rest_framework import status
from rest_framework.response import Response

from common.file_utils import upload_file
from ..models import Batch, Annotation
from ..permissions import UserCan
from django.contrib.auth import get_user_model
logger = logging.getLogger(__name__)

class BatchAnnotationExportHandler:
    """Handler for exporting batch annotations to CSV.
    
    This handler manages the process of:
    1. Validating user permissions
    2. Retrieving relevant annotations
    3. Creating CSV with annotation data
    4. Uploading the file to storage
    """
    
    def __init__(self, user, batch_id):
        """
        Initialize the handler.
        
        Args:
            user: User instance (not user ID)
            batch_id: ID of the batch to export
        """
        user_id = user.id
        self.user = get_user_model().objects.get(id=user_id)
        self.batch_id = batch_id
        self.batch = None
        self.annotations = None
        
    def validate_and_get_batch(self):
        """Validate batch exists and user has permission to access it."""
        try:
            self.batch = Batch.objects.get(id=self.batch_id)
            
            if not (UserCan.view_all_annotations(self.user, self.batch) or 
                   UserCan.view_annotation(self.user, self.batch)):
                return Response(
                    {"error": "You don't have permission to export annotations from this batch"},
                    status=status.HTTP_403_FORBIDDEN
                )
                
            return None  # No error response means validation passed
            
        except Batch.DoesNotExist:
            logger.error(f"Batch with id {self.batch_id} does not exist")
            return Response(
                {"error": f"Batch with id {self.batch_id} does not exist"},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def get_annotations(self):
        """Get annotations based on user permissions."""
        try:
            if UserCan.view_all_annotations(self.user, self.batch):
                self.annotations = Annotation.objects.filter(batch_id=self.batch_id)
            else:
                self.annotations = Annotation.objects.filter(
                    batch_id=self.batch_id, 
                    user_id=self.user
                )
            logger.info(f"Retrieved {self.annotations.count()} annotations for batch {self.batch_id}")
        except Exception as e:
            logger.error(f"Error retrieving annotations: {str(e)}")
            raise
    
    def create_csv_file(self):
        """Create CSV file with annotation data."""
        try:
            # Create temporary directory if it doesn't exist
            temp_dir = os.path.join(settings.MEDIA_ROOT, 'temp')
            os.makedirs(temp_dir, exist_ok=True)

            # Generate filename with timestamp
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"Batch-{self.batch.batch_name}-{timestamp}.csv"
            temp_filepath = os.path.join(temp_dir, filename)

            # Write annotations to CSV
            with open(temp_filepath, 'w', newline='') as csvfile:
                fieldnames = [
                    'start', 'end', 'freq_min', 'freq_max', 'duration',
                    'filename', 'label', 'call_type', 'quality', 'comments',
                    'score'
                ]
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()

                for annotation in self.annotations:
                    region = annotation.region
                    properties = region.get('properties', {})
                    
                    # Calculate time values
                    start = region.get('x', 0)
                    duration = region.get('width', 0)
                    end = start + duration
                    
                    # Calculate frequency values
                    freq_min = region.get('y', 0)
                    freq_max = freq_min + region.get('height', 0)

                    # Get file path
                    file_path = annotation.file.path

                    # Build row data
                    row = {
                        'start': round(start, 3),
                        'end': round(end, 3),
                        'freq_min': round(freq_min, 2),
                        'freq_max': round(freq_max, 2),
                        'duration': round(duration, 3),
                        'filename': file_path,
                        'label': properties.get('label', ''),
                        'call_type': properties.get('call_type', ''),
                        'quality': properties.get('quality', ''),
                        'comments': properties.get('comments', ''),
                        'score': properties.get('score', '')
                    }
                    writer.writerow(row)
            
            logger.info(f"Created CSV file at {temp_filepath}")
            return filename, temp_filepath, timestamp
            
        except Exception as e:
            logger.error(f"Error creating CSV file: {str(e)}")
            raise
    
    def upload_csv_file(self, filename, temp_filepath, timestamp):
        """Upload CSV file to storage."""
        try:
            # Verify the file exists and is readable
            if not os.path.exists(temp_filepath):
                logger.error(f"Temporary file not found: {temp_filepath}")
                return Response(
                    {"error": "Failed to create export file"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            # Check file size
            file_size = os.path.getsize(temp_filepath)
            logger.info(f"File size: {file_size} bytes")
            if file_size == 0:
                logger.error("Generated file is empty")
                return Response(
                    {"error": "Generated export file is empty"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            file_path = os.path.join('export', filename)
            meta = {
                'batch_id': self.batch_id,
                'export_time': timestamp,
                'annotation_count': self.annotations.count(),
                'file_size': file_size
            }
            
            logger.info(f"Attempting to upload file: {file_path}")
            # Pass the User instance directly, not just the ID
            file_obj = upload_file(
                local_file_path=temp_filepath,
                maipl_folder='annotation',
                path=file_path,
                meta=meta,
                user=self.user  
            )
            
            if not file_obj:
                logger.error("File upload failed")
                return Response(
                    {"error": "Failed to upload the exported file"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            logger.info(f"File uploaded successfully with id: {file_obj.id}")
            return Response({
                'file_id': file_obj.id,
                'filename': file_obj.path,
                'message': 'Annotations exported successfully'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error during file upload: {str(e)}")
            return Response(
                {"error": f"Failed to upload file: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        finally:
            # Clean up temporary file
            try:
                if os.path.exists(temp_filepath):
                    os.remove(temp_filepath)
                    logger.info(f"Cleaned up temporary file: {temp_filepath}")
            except Exception as e:
                logger.error(f"Error cleaning up temporary file: {str(e)}")
    
    def handle(self):
        """Main method to handle the export process."""
        try:
            # Validate batch and permissions
            error_response = self.validate_and_get_batch()
            if error_response:
                return error_response
            
            # Get annotations
            self.get_annotations()
            
            # Create CSV file
            filename, temp_filepath, timestamp = self.create_csv_file()
            
            # Upload file and return response
            return self.upload_csv_file(filename, temp_filepath, timestamp)
            
        except Exception as e:
            logger.error(f"Error in export process: {str(e)}")
            return Response(
                {"error": f"An error occurred while exporting annotations: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            ) 