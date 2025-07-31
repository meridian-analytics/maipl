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
    if instance.file:
        instance.size = instance.file.size
    else:
        instance.size = 0


@receiver(pre_delete, sender=File)
def delete_file(sender, instance, **kwargs):
    if instance.file:
        default_storage.delete(instance.file.name)

@receiver(post_save, sender=File)
def handle_h5_file_meta_post_save(sender, instance, **kwargs):
    # Only trigger if this is a new file or if the file field was updated
    update_fields = kwargs.get('update_fields', []) or []
    if instance.file and instance.file.name and instance.file.name.endswith('.h5') and (kwargs.get('created', False) or 'file' in update_fields):
        from .tasks import update_meta_from_h5_file
        update_meta_from_h5_file.delay(instance.id)
    
    