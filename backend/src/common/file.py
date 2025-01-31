import hashlib
import os

from django.core.cache import cache
from django.core.files import File as DjangoFile

from common.logger import logger
from file.models import File


class FileUtils:
    def __init__(self):
        pass

    @staticmethod
    def upload_file(file_path, user, maipl_folder, path, tag=""):

        #check if the file with the same path and user exists and delete it
        try:
            file_instance = File.objects.get(user_id=user, maipl_folder=maipl_folder, path=path)
            file_instance.delete()
        except File.DoesNotExist:
            pass

        logger.info(f"Uploading file: {file_path}")

        try:
            sha256_hash = hashlib.sha256()
            with open(file_path, "rb") as f:
                for byte_block in iter(lambda: f.read(4096), b""):
                    sha256_hash.update(byte_block)
            file_sha256 = sha256_hash.hexdigest()

            django_file = DjangoFile(open(file_path, "rb"))

            file_instance = File(
                file=django_file,
                sha256=file_sha256,
                user_id=user,
                maipl_folder=maipl_folder,
                path=path,
                tag=tag
            )

            file_instance.save()

        except FileNotFoundError as fnf_error:
            logger.error(f"File not found error: {fnf_error}")
            return None

        except Exception as e:
            logger.error(f"An error occurred: {e}")
            return None

        else:
            django_file.close()
            # delete the file after upload
            os.remove(file_path)
            logger.info(f"File uploaded: {file_instance.id}")
            return file_instance

    @staticmethod
    def download_file(file_id):
        logger.info(f"Attempting to download file: {file_id} ")

        cached_local_path = cache.get(file_id)

        if cached_local_path:
            logger.info(f"File found in cache: {cached_local_path}")
            return cached_local_path

        try:
            file_instance = File.objects.get(id=file_id)

            local_file_path = f"/cache/{file_instance.basename}"

            with open(local_file_path, "wb") as local_file:
                for chunk in file_instance.file:
                    local_file.write(chunk)

            cache.set(file_id, local_file_path)
            logger.info(f"File downloaded to: {local_file_path}")
            return local_file_path

        except File.DoesNotExist:
            logger.error(f"No file found with id: {file_id}")
            return None
        except Exception as e:
            logger.error(f"An error occurred: {e}")
            return None