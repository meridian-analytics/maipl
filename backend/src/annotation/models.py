from django.db import models
from django.db.models.signals import pre_delete
from django.dispatch import receiver
from django_celery_results.models import TaskResult
from django_minio_backend import MinioBackend
from rest_framework.exceptions import ValidationError
from .spectrogram.frequency_axis import compute_frequency_axis

from file.models import File
from user.models import User

from api.settings import MINIO_BUCKET_NAME

def get_storage():
    return MinioBackend(bucket_name=MINIO_BUCKET_NAME, replace_existing=True)

def isOwner(user, obj):
    return obj.user_id.id == user.id


class Permission(models.Model):
    name = models.CharField(max_length=255)
    description = models.CharField(max_length=255)

    def __str__(self):
        return f"{self.name} - {self.description}"


class Role(models.Model):
    name = models.CharField(max_length=255)
    code = models.IntegerField(unique=True)
    permissions = models.ManyToManyField(Permission, related_name="roles")

    def __str__(self):
        return f"{self.code} - {self.name}"


class Batch(models.Model):
    """
    Batch model for storing batch information and settings.
    """

    batch_name = models.CharField(max_length=250, unique=True)
    description = models.TextField(blank=True, null=True)
    parameters = models.JSONField()
    allow_change_settings = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    user_id = models.ForeignKey(User, on_delete=models.CASCADE)
    task_id = models.CharField(max_length=128, blank=True, null=True)
    annotation_file = models.ForeignKey(
        File, on_delete=models.SET_NULL, blank=True, null=True
    )
    annotation_file_text = models.TextField(blank=True, null=True)
    segment_parameters = models.JSONField(blank=True, null=True)
    filelist = models.ManyToManyField(File, related_name="batches", blank=True)
    import_file = models.ForeignKey(
        File,
        on_delete=models.SET_NULL,
        related_name="imported_batches",
        blank=True,
        null=True,
    )
    shared_to = models.ManyToManyField(User, related_name="batch_shared_to", blank=True)
    frequency_axis = models.JSONField(null=True, blank=True)

    class Meta:
        ordering = ["id"]
        unique_together = ["batch_name", "user_id"]

    def __str__(self):
        return self.batch_name + " - " + repr(self.user_id.last_name)

    def task_status(self):
        if not self.task_id:
            return None
        try:
            task = TaskResult.objects.get(task_id=self.task_id)
            return task.status
        except TaskResult.DoesNotExist:
            return None
    
    def share_batch(self, user, change):
        if isOwner(user, self) is False:
            raise ValidationError(
                f"Batch {self.batch_name} is not owned by the user"
            )
        target_user_id, code = change
        user = User.objects.get(id=target_user_id)
        if code != 0:
            self.shared_to.add(target_user_id)
            UserRoleBatch.objects.update_or_create(user=user, batch=self, role_id=code)
        else:
            self.shared_to.remove(target_user_id)
            UserRoleBatch.objects.filter(user=user, batch=self).delete()
    
    def compute_and_save_frequency_axis(self):
        """Compute and save frequency axis based on batch parameters."""
        try:
            frequency_axis = compute_frequency_axis(self.parameters)
            self.frequency_axis = frequency_axis
            super().save(update_fields=['frequency_axis'])
        except Exception as e:
            raise ValueError(f"Error computing frequency axis: {str(e)}")
    
    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        if is_new and self.parameters:  # Only compute on creation and if parameters exist
            self.compute_and_save_frequency_axis()

class UserRoleBatch(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    role = models.ForeignKey(Role, on_delete=models.CASCADE)
    batch = models.ForeignKey(Batch, on_delete=models.CASCADE)

    class Meta:
        unique_together = ["user", "role", "batch"]

    def __str__(self):
        return f"{self.user} - {self.role} - {self.batch}"


class Segment(models.Model):

    file = models.ForeignKey(File, on_delete=models.CASCADE)
    filename = models.CharField(max_length=250)
    start = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    end = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    tag = models.CharField(max_length=128, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    user_id = models.ForeignKey(User, on_delete=models.CASCADE)
    batch = models.ForeignKey(
        Batch, related_name="segments", on_delete=models.CASCADE, blank=True, null=True
    )

    def __str__(self):
        return self.filename + " - " + str(self.start) + " - " + str(self.end)


class Annotation(models.Model):

    id = models.CharField(max_length=128, primary_key=True)
    segment = models.ForeignKey(
        Segment,
        on_delete=models.CASCADE,
    )
    batch = models.ForeignKey(
        Batch,
        on_delete=models.CASCADE,
    )
    file = models.ForeignKey(File, on_delete=models.CASCADE)
    region = models.JSONField()
    user_id = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField()

    def __str__(self):
        return (
            self.batch.batch_name
            + " - "
            + self.segment.filename
            + " - "
            + self.user_id.last_name
        )


def upload_to_image(instance, filename):
    return f"images/batch-{instance.batch_id.id}/segment-{instance.segment_id.id}/user-{instance.user_id.id}/{filename}"

class ProcessedImage(models.Model):

    def delete(self, *args, **kwargs):
        """
        Delete must be overridden because the inherited delete method does not call `self.image.delete()`.
        """
        self.image.delete()
        super(ProcessedImage, self).delete(*args, **kwargs)

    segment_id = models.ForeignKey(
        Segment,
        on_delete=models.CASCADE,
    )
    batch_id = models.ForeignKey(
        Batch,
        on_delete=models.CASCADE,
    )
    user_id = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
    )
    image = models.FileField(
        upload_to=upload_to_image,
        storage=get_storage,
        max_length=255
    )
    image_type = models.CharField(max_length=255, default="spectrogram")
    created_at = models.DateTimeField(auto_now_add=True)

    objects = models.Manager()

    def __str__(self):
        return self.image.name


def upload_to_audio(instance, filename):
    return f"audio/batch-{instance.batch_id.id}/segment-{instance.segment_id.id}/user-{instance.user_id.id}/{filename}"

class ProcessedAudio(models.Model):

    def delete(self, *args, **kwargs):
        """
        Delete must be overridden because the inherited delete method does not call `self.audio.delete()`.
        """
        self.audio.delete()
        super(ProcessedAudio, self).delete(*args, **kwargs)

    segment_id = models.ForeignKey(
        Segment,
        on_delete=models.CASCADE,
    )
    batch_id = models.ForeignKey(
        Batch,
        on_delete=models.CASCADE,
    )
    user_id = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
    )
    audio = models.FileField(
        upload_to=upload_to_audio,
        storage=get_storage,
        max_length=255
    )

    created_at = models.DateTimeField(auto_now_add=True)

    objects = models.Manager()

    def __str__(self):
        return self.audio.name


@receiver(pre_delete, sender=ProcessedImage)
def image_delete(sender, instance, **kwargs):
    instance.image.delete(False)


@receiver(pre_delete, sender=ProcessedAudio)
def audio_delete(sender, instance, **kwargs):
    instance.audio.delete(False)
