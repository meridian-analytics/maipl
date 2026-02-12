from os.path import basename, dirname, splitext

from django.core.files.storage import default_storage
from django.db import models
from django.db.models.signals import pre_delete, pre_save, post_save
from django.dispatch import receiver
from django_minio_backend import MinioBackend
from rest_framework.exceptions import ValidationError

from user.models import User

from api.settings import MINIO_BUCKET_NAME

def get_storage():
    return MinioBackend(bucket_name=MINIO_BUCKET_NAME, replace_existing=True)

def upload_to(instance, filename):
    user = User.objects.get(id=instance.user_id.id)
    return f"files/{user.email}/{instance.maipl_folder}/{instance.path}"


class File(models.Model):

    class Meta:
        unique_together = ["user_id", "path"]

    def share_file(self, user, changes):
        if self.user_id.id != user.id:
            raise ValidationError(
                f"File {self.basename} is not owned by the user"
            )

        for change in changes:
            target_user_id, shared = change

            if shared:
                self.shared_to.add(target_user_id)
            else:
                self.shared_to.remove(target_user_id)

    def delete(self, *args, force=False, **kwargs):
        """
        Override delete to prevent deletion of files that are in use,
        unless force=True is specified.
        """
        if not force and self.in_use:
            raise ValidationError(
                f"Cannot delete file '{self.basename}' as it is currently in use by other models. "
                "Use force=True to override this protection."
            )
        
        try:
            self.file.delete()
        except Exception as e:
            # If the file does not exist, we can ignore the error
            if "NoSuchKey" not in str(e):
                pass
            else:
                raise e

        super(File, self).delete(*args, **kwargs)

    id = models.AutoField(primary_key=True)
    created_at = models.DateTimeField(auto_now_add=True)
    file = models.FileField(
        upload_to=upload_to,
        storage=get_storage,
        max_length=255
    )
    maipl_folder = models.CharField(max_length=255)
    meta = models.JSONField(blank=True, null=True)
    path = models.CharField(max_length=255)
    sha256 = models.CharField(max_length=64)
    tag = models.CharField(max_length=255, default="")
    updated_at = models.DateTimeField(auto_now=True)
    user_id = models.ForeignKey(User, on_delete=models.CASCADE)
    shared_to = models.ManyToManyField(User, related_name="file_shared_to")

    # derived
    size = models.IntegerField()

    def __str__(self):
        return self.path

    @property
    def dirname(self):
        return dirname(self.path)

    @property
    def basename(self):
        return basename(self.path)

    @property
    def extname(self):
        filename, extension = splitext(self.basename)
        return extension

    @property
    def in_use(self):
        """
        Check if the file is being used in any related models.
        Returns True if the file is referenced by any other model, False otherwise.
        """
        # Import Batch here to avoid circular import
        from annotation.models import Batch
        
        # Check ModelRunnerTask relationships
        if (
            self.model_file_tasks.exists() or  # model_file relationship
            self.filelist_tasks.exists() or    # filelist relationship
            self.detections_tasks.exists()      # detections relationship
        ):
            return True
            
        # Check Batch relationships
        if (
            self.batches.exists() or           # filelist relationship
            Batch.objects.filter(annotation_file=self).exists() or
            Batch.objects.filter(import_file=self).exists()
        ):
            return True
            
        # Check Segment relationship
        if self.segment_set.exists():
            return True
            
        # Check Annotation relationship
        if self.annotation_set.exists():
            return True
            
        # Check Detection relationship - removed as file field was removed from Detection model
        # if self.file_detections.exists():
        #     return True
            
        # Check MetricsTask relationships
        if (
            self.audio_list_metrics_tasks.exists() or  # bg_audio_list relationship
            self.output_files_metrics_tasks.exists()    # output_files relationship
        ):
            return True
            
        # Check TrainingTask relationships
        if (
            self.dataset_file_tasks.exists() or
            self.recipe_file_tasks.exists() or
            self.model_file_train_tasks.exists()
        ):
            return True
            
        return False


@receiver(pre_save, sender=File)
def update_size(sender, instance, **kwargs):
    """
    Update the file size before saving.
    For newly uploaded files, get size from the uploaded file object directly.
    This avoids synchronous metadata requests to storage backend which can block for large files.
    """
    if instance.file:
        # For newly uploaded files, Django's FileField wraps the uploaded file
        # The uploaded file object should have size available directly
        try:
            # Check if we have a newly uploaded file (has a file-like object)
            if hasattr(instance.file, 'file') and hasattr(instance.file.file, 'read'):
                # Try to get size from the underlying file object
                # For Django's UploadedFile, size is often cached
                uploaded_file = instance.file.file
                # Check if size is already available (cached on uploaded file)
                if hasattr(uploaded_file, 'size'):
                    instance.size = uploaded_file.size
                elif hasattr(instance.file, '_size'):
                    # Check if size was cached by FileField
                    instance.size = instance.file._size
                else:
                    # Fallback: use file.size property
                    # This may make a metadata request but should be cached after first access
                    instance.size = instance.file.size
            else:
                # For existing files, use the size property
                instance.size = instance.file.size
        except (AttributeError, IOError, OSError) as e:
            # If accessing size fails, try fallback or set to 0
            try:
                instance.size = instance.file.size
            except Exception:
                instance.size = 0
    else:
        instance.size = 0


@receiver(pre_delete, sender=File)
def delete_file(sender, instance, **kwargs):
    if instance.file:
        default_storage.delete(instance.file.name)

@receiver(post_save, sender=File)
def handle_h5_file_meta_post_save(sender, instance, **kwargs):
    # Only trigger if this is a new file that uploaded by the user
    update_fields = kwargs.get('update_fields', []) or []
    if (instance.file and instance.file.name and instance.file.name.endswith('.h5') and 
        (kwargs.get('created', False) or 'file' in update_fields) and 
        instance.meta is None):
        from .tasks import update_meta_from_h5_file
        # Use update() instead of save() to avoid triggering signals and blocking the response
        # This is more efficient and non-blocking for large file uploads
        File.objects.filter(id=instance.id).update(meta={'processing': True})
        # Reload instance to get updated meta
        instance.refresh_from_db(fields=['meta'])
        update_meta_from_h5_file.delay(instance.id)


@receiver(post_save, sender=File)
def invalidate_file_cache_on_update(sender, instance, created, **kwargs):
    """
    Invalidate the shared file cache when a file's content is updated.
    
    This ensures that other tools (annotation, model runner, etc.) don't use
    stale cached versions of files after they've been updated.
    
    Args:
        sender: The model class (File)
        instance: The actual instance being saved
        created: Boolean indicating if this is a new instance
        **kwargs: Additional keyword arguments including update_fields
    """
    # Don't invalidate cache for newly created files
    if created:
        return
    
    # Get the list of fields that were updated
    update_fields = kwargs.get('update_fields', None)
    
    # If update_fields is None, it means save() was called without specifying fields
    # In this case, we should check if the file might have changed
    # If update_fields is provided and doesn't contain 'file', skip invalidation
    if update_fields is not None and 'file' not in update_fields:
        return
    
    # Import here to avoid circular imports and to access the cache and logger
    from common.shared_file_cache import shared_file_cache
    from common.logger import file_logger
    
    try:
        file_logger.info(
            f"Invalidating cache for file ID: {instance.id} "
            f"(path: {instance.path}, user: {instance.user_id.email})"
        )
        shared_file_cache.delete(instance.id)
        file_logger.info(f"Cache invalidated successfully for file ID: {instance.id}")
    except Exception as e:
        # Log the error but don't raise it to avoid breaking the save operation
        file_logger.error(
            f"Failed to invalidate cache for file ID: {instance.id}. Error: {e}"
        )
    
    