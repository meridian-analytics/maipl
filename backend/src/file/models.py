from os.path import basename, dirname, splitext

from django.core.files.storage import default_storage
from django.db import models
from django.db.models.signals import pre_delete, pre_save
from django.dispatch import receiver
from django_minio_backend import MinioBackend
from rest_framework.exceptions import ValidationError

from user.models import User

def upload_to(instance, filename):
    user = User.objects.get(id=instance.user_id.id)
    return f"{user.email}/{instance.maipl_folder}/{instance.path}"


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

    def delete(self, *args, **kwargs):
        """
        Delete must be overridden because the inherited delete method does not call `self.file.delete()`.
        """
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
        storage=MinioBackend(bucket_name="files", replace_existing=True),
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


@receiver(pre_save, sender=File)
def on_save(sender, instance, **kwargs):
    if instance.file:
        instance.size = instance.file.size
    else:
        instance.size = 0


@receiver(pre_delete, sender=File)
def on_delete(sender, instance, **kwargs):
    if instance.file:
        default_storage.delete(instance.file.name)
