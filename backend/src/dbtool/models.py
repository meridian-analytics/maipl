from typing import Dict, Any
from django.db import models
from django.db.models.signals import pre_delete
from django.dispatch import receiver

from common.logger import dbtool_logger
from file.models import File
from user.models import User


class DatabaseTask(models.Model):
    """
    DatabaseTask model for storing database creation or modification tasks.
    Represents a complete database task with groups and processing configuration.
    """
    
    TASK_STATUS = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('in_progress', 'In Progress'),
    ]
    
    DATABASE_SELECTION_MODE = [
        ('new_database', 'New Database'),
        ('use_existing', 'Use Existing'),
    ]
    
    class Meta:
        ordering = ['id']
    
    # Basic task information
    task_name = models.CharField(max_length=255, help_text='Human-readable task name')
    description = models.TextField(blank=True, null=True, help_text='Optional task description')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, help_text='Task creation timestamp')
    updated_at = models.DateTimeField(auto_now=True, help_text='Last update timestamp')
    
    # Status
    status = models.CharField(max_length=20, choices=TASK_STATUS, default='active', help_text='Current task status')
    
    # User relationship
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='database_tasks', help_text='User who created the task')
    
    # Celery task tracking
    celery_task_id = models.CharField(max_length=255, unique=True, null=True, blank=True, help_text='Celery task ID for overall task processing')
    
    # Database selection configuration
    database_selection = models.JSONField(default=dict, help_text='Database selection mode and configuration')
    
    # Generated database file
    database_file = models.ForeignKey(
        File, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='database_file_tasks',
        help_text='Generated database file'
    )
    
    # Output settings
    output_settings = models.JSONField(default=dict, help_text='Database generation parameters and settings')
    
    # Database metadata
    database_metadata = models.JSONField(default=dict, help_text='HDF5 structure and database metadata')

    # Local path
    local_path = models.CharField(max_length=255, blank=True, null=True, help_text='Local path for task files')
    
    def __str__(self):
        return f"{self.id} - {self.task_name}"
    
    @property
    def groups_count(self):
        """Return the number of groups in this task."""
        return self.groups.count()
    
    @property
    def total_samples(self):
        """Return total samples across all groups."""
        return sum(group.statistics.get('total_samples', 0) for group in self.groups.all())
    
    def _sync_database_metadata(self):
        """
        Sync metadata from existing database file to task's database_metadata.
        """
        database_selection = self.database_selection
        mode = database_selection.get('mode')
        
        if mode == 'use_existing':
            database_file_id = database_selection.get('database_file_id')
            if database_file_id:
                try:
                    from file.models import File
                    
                    # Get the existing database file
                    database_file = File.objects.get(id=database_file_id)
                    
                    # Use existing metadata (assumed to always exist)
                    if database_file.meta:
                        self.database_metadata = database_file.meta
                        dbtool_logger.info(f"Synced metadata from file {database_file_id} to task {self.id}")
                    else:
                        dbtool_logger.error(f"Database file {database_file_id} has no metadata for task {self.id}")
                        
                except File.DoesNotExist:
                    dbtool_logger.error(f"Database file {database_file_id} not found for task {self.id}")
                except Exception as e:
                    dbtool_logger.error(f"Error syncing metadata for task {self.id}: {e}")
    
    def save(self, *args, **kwargs):
        """Override save to sync metadata when creating a task with existing database."""
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        # Sync metadata for new tasks that use existing database
        if is_new and self.database_selection.get('mode') == 'use_existing':
            self._sync_database_metadata()
            # Save again to persist the synced metadata
            super().save(update_fields=['database_metadata'])
    



class DatabaseGroup(models.Model):
    """
    DatabaseGroup model for storing audio groups with processing configuration.
    Represents a collection of audio files with specific processing settings.
    """
    
    GROUP_STATUS = [
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('in_progress', 'In Progress'),
        ('imported', 'Imported'),
    ]
    
    GROUP_SOURCE = [
        ('new_group', 'New Group'),
        ('existing_database', 'Existing Database'),
    ]
    
    class Meta:
        ordering = ['id']
        unique_together = ['task', 'name']
    
    # Group identification
    name = models.CharField(max_length=255, help_text='Group path identifier (e.g., /train, /test)')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, help_text='Group creation timestamp')
    
    # Status and source
    status = models.CharField(max_length=20, choices=GROUP_STATUS, default='in_progress', help_text='Current group status')
    source = models.CharField(max_length=20, choices=GROUP_SOURCE, default='new_group', help_text='Group source type')
    
    # Celery task tracking
    celery_task_id = models.CharField(max_length=255, unique=True, null=True, blank=True, help_text='Celery task ID for group processing')
    
    # Task relationship
    task = models.ForeignKey(
        DatabaseTask, 
        on_delete=models.CASCADE, 
        related_name='groups',
        help_text='Parent database task'
    )
    
    # Processing configuration
    config = models.JSONField(default=dict, help_text='Audio processing configuration including file IDs, annotations, etc.')
    
    # Processing statistics
    statistics = models.JSONField(default=dict, help_text='Processing results and statistics')
    
    def __str__(self):
        return f"{self.task.id} - {self.name}"
    
    @property
    def file_count(self):
        """Return the number of files in this group."""
        return self.statistics.get('file_count', 0)
    
    @property
    def label_count(self):
        """Return the number of labels in this group."""
        return self.statistics.get('label_count', 0)
    
    @property
    def total_samples(self):
        """Return total samples in this group."""
        return self.statistics.get('total_samples', 0)
    
    @property
    def audio_file_ids(self):
        """Return list of audio file IDs from config."""
        return self.config.get('audio_file_ids', [])
    
    @property
    def audio_representation_config_id(self):
        """Return audio representation config ID from config."""
        return self.config.get('audio_representation_config_id')
    
    def start_processing(self):
        """
        Start or restart processing for this group.
        
        Returns:
            str: Celery task ID if successful, None otherwise
        """
        from .tasks import start_database_processing_task
        
        try:
            celery_task_id = start_database_processing_task(self.task.id, self.id)
            
            if celery_task_id:
                dbtool_logger.info(f"Started processing for group {self.id} with celery task {celery_task_id}")
            else:
                dbtool_logger.error(f"Failed to start processing for group {self.id}")
                
            return celery_task_id
            
        except Exception as e:
            dbtool_logger.error(f"Error starting processing for group {self.id}: {e}")
            return None
    
    def cancel_processing(self):
        """
        Cancel ongoing processing for this group.
        
        Returns:
            bool: True if cancellation was successful
        """
        from .tasks import cancel_database_processing
        
        try:
            success = cancel_database_processing(self.task.id, self.id)
            
            if success:
                dbtool_logger.info(f"Cancelled processing for group {self.id}")
            else:
                dbtool_logger.error(f"Failed to cancel processing for group {self.id}")
                
            return success
            
        except Exception as e:
            dbtool_logger.error(f"Error cancelling processing for group {self.id}: {e}")
            return False
    
    def get_hdf5_structure(self) -> Dict[str, Any]:
        """
        Get the HDF5 structure for this group.
        
        Returns:
            Dict containing HDF5 structure information
        """
        datasets = self.statistics.get('datasets', {
            'audio': 'float32',
            'labels': 'int32',
            'metadata': 'object'
        })
        
        return {
            'datasets': datasets,
            'samples': self.total_samples
        }
    
    def get_metadata_summary(self) -> Dict[str, Any]:
        """
        Get a summary of the group metadata.
        
        Returns:
            Dict containing group metadata summary
        """
        return {
            'id': self.id,
            'name': self.name,
            'status': self.status,
            'source': self.source,
            'total_samples': self.total_samples,
            'file_count': self.file_count,
            'label_count': self.label_count,
            'hdf5_structure': self.get_hdf5_structure(),
            'statistics': self.statistics,
            'created_at': self.created_at,
        }


from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(pre_delete, sender=DatabaseTask)
def cleanup_database_task(sender, instance, **kwargs):
    """
    Clean up local cached files when a database task is deleted.
    
    Note: Generated database files in storage are preserved to avoid data loss.
    Only local temporary files under /tasks/database/{task_id} are removed.
    """
    try:
        # Note: We do NOT delete the database file from storage
        # This preserves the user's generated database files
        if instance.database_file:
            dbtool_logger.info(f"Preserving database file {instance.database_file.id} in storage for task {instance.id}")
        
        # Clean up local cached files only
        if instance.local_path:
            cleanup_task_local_files(instance.local_path, instance.id)
        
        # Clean up any running celery tasks
        if instance.celery_task_id:
            cleanup_celery_task(instance.celery_task_id, instance.id)
            
        dbtool_logger.info(f"Completed cleanup for database task {instance.id}")
        
    except Exception as e:
        dbtool_logger.error(f"Error during cleanup for database task {instance.id}: {e}")
        # Don't prevent deletion, just log the error


@receiver(pre_delete, sender=DatabaseGroup)
def cleanup_database_group(sender, instance, **kwargs):
    """
    Clean up any group-specific resources when a database group is deleted.
    """
    try:
        # Clean up any running celery tasks for this group
        if instance.celery_task_id:
            cleanup_celery_task(instance.celery_task_id, instance.id)
        
        # Note: We don't clean up local files here because they're part of the task
        # and will be cleaned up when the task is deleted
        dbtool_logger.info(f"Completed cleanup for database group {instance.id}")
        
    except Exception as e:
        dbtool_logger.error(f"Error during cleanup for database group {instance.id}: {e}")
        # Don't prevent deletion, just log the error


@receiver(post_save, sender=DatabaseGroup)
def start_group_processing(sender, instance, created, **kwargs):
    """
    Automatically start processing when a new database group is created.
    """
    if created:
        from .tasks import start_database_processing_task
        
        try:
            celery_task_id = start_database_processing_task(instance.task.id, instance.id)
            
            if celery_task_id:
                dbtool_logger.info(f"Started processing for group {instance.id} with celery task {celery_task_id}")
            else:
                dbtool_logger.error(f"Failed to start processing for group {instance.id}")
                
        except Exception as e:
            dbtool_logger.error(f"Error starting processing for group {instance.id}: {e}")
            # Don't raise the exception to avoid preventing the group from being saved


def cleanup_task_local_files(local_path: str, task_id: int) -> None:
    """
    Clean up local temporary files for a database task.
    
    This removes files under /tasks/database/{task_id} including:
    - Downloaded audio files
    - Downloaded config files  
    - Temporary database files
    - Console output logs
    - Generated output files
    
    Note: Database files in MinIO storage are preserved.
    
    Args:
        local_path: Local path where task files are stored
        task_id: ID of the task being cleaned up
    """
    try:
        import os
        import shutil
        
        if not local_path or not os.path.exists(local_path):
            dbtool_logger.info(f"No local path to clean up for task {task_id}")
            return
        
        # Log what we're about to clean up
        dbtool_logger.info(f"Cleaning up local files for task {task_id} at path: {local_path}")
        
        # List contents before deletion for debugging
        try:
            contents = os.listdir(local_path)
            dbtool_logger.info(f"Task {task_id} local path contents: {contents}")
        except Exception as e:
            dbtool_logger.warning(f"Could not list contents of {local_path}: {e}")
        
        # Remove the entire task directory
        shutil.rmtree(local_path, ignore_errors=True)
        
        # Verify deletion
        if os.path.exists(local_path):
            dbtool_logger.warning(f"Failed to completely remove local path for task {task_id}: {local_path}")
        else:
            dbtool_logger.info(f"Successfully cleaned up local files for task {task_id}")
            
    except Exception as e:
        dbtool_logger.error(f"Error cleaning up local files for task {task_id}: {e}")


def cleanup_celery_task(celery_task_id: str, task_id: int) -> None:
    """
    Clean up any running celery tasks for a database task.
    
    Args:
        celery_task_id: Celery task ID to clean up
        task_id: ID of the database task
    """
    try:
        from celery.result import AsyncResult
        
        # Get the celery task result
        celery_result = AsyncResult(celery_task_id)
        
        # Check if task is still running
        if celery_result.state in ['PENDING', 'STARTED']:
            # Revoke the task
            celery_result.revoke(terminate=True)
            dbtool_logger.info(f"Revoked celery task {celery_task_id} for database task {task_id}")
        else:
            dbtool_logger.info(f"Celery task {celery_task_id} for database task {task_id} is not running (state: {celery_result.state})")
            
    except ImportError:
        dbtool_logger.warning(f"Celery not available, skipping celery task cleanup for task {task_id}")
    except Exception as e:
        dbtool_logger.error(f"Error cleaning up celery task {celery_task_id} for task {task_id}: {e}")


# Signal handlers for cleanup
