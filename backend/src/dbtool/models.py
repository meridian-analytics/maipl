from django.db import models
from django.db.models.signals import pre_delete
from django.dispatch import receiver

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


# Signal handlers for cleanup
@receiver(pre_delete, sender=DatabaseTask)
def cleanup_database_task(sender, instance, **kwargs):
    """
    Clean up associated files when a database task is deleted.
    """
    if instance.database_file:
        try:
            instance.database_file.delete(force=True)
        except Exception:
            # Log error but don't prevent deletion
            pass


@receiver(pre_delete, sender=DatabaseGroup)
def cleanup_database_group(sender, instance, **kwargs):
    """
    Clean up any group-specific resources when a database group is deleted.
    """
    # Add any group-specific cleanup logic here
    pass
