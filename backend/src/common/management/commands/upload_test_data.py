import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from file.models import File
import hashlib
import wave
import json

class Command(BaseCommand):
    """
    Seed database
    """

    help = "Create a dev user and upload data"
    admin_email = os.environ.get("ADMIN_EMAIL")
    User = get_user_model()
    admin_user = User.objects.get(email=admin_email)

    def handle(self, *args, **kwargs):
        """
        Create a dev user with the following environment variables:
        """
        self.upload_audio_files()
        

    def upload_audio_files(self):
        """
        Create a dev user with the following environment variables:
        """
        
        # upload test files with admin_user

        # retrive files names from the directory
        audio_file_names = os.listdir("/test-data/with_belugas/")
        # upload files with admin_user
        for file_name in audio_file_names:
            path = f"/with_belugas/{file_name}"

            #if the file already exists, skip it
            if File.objects.filter(path=path, user_id=self.admin_user).exists():
                continue

            #calculate sha256
            sha256_hash = hashlib.sha256()
            with open(f"/test-data/with_belugas/{file_name}", "rb") as f:
                # Read and update hash string value in blocks of 4K
                for byte_block in iter(lambda: f.read(4096), b""):
                    sha256_hash.update(byte_block)
        # calcuate duration, get channels and sample_rate
            duration = 0
            with wave.open(f"/test-data/with_belugas/{file_name}", 'rb') as audio:
                duration = audio.getnframes() / audio.getframerate()
                channels = audio.getnchannels()
                sample_rate = audio.getframerate()
            meta = {"type": "audio/wav", "channels": channels,
                    "duration": duration, "sample_rate": sample_rate}

            file = File(
                maipl_folder="raw",
                path=path,
                sha256=sha256_hash.hexdigest(),
                user_id=self.admin_user,
                tag="test_audio_file",
                meta=meta,
            )
            file.file.save(file_name, open(f"/test-data/with_belugas/{file_name}", "rb"))
            file.save()
        self.stdout.write(self.style.SUCCESS("Test audio files uploaded successfully"))

