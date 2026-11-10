import os
import tempfile
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from common.file_utils import FileUtils
from common.management.commands.bootstrap_maipl import Command


class BootstrapConfigurationTests(SimpleTestCase):
    def test_redirect_urls_are_synchronized_from_the_environment(self):
        constance = SimpleNamespace(
            ALLOWED_REDIRECT_URLS="localhost:8080",
            ANNOTATION_CONTENT_TYPE="text/csv",
            RAW_CONTENT_TYPE="audio/wav",
        )

        with (
            patch.dict(
                os.environ,
                {"ALLOWED_REDIRECT_URLS": "dev.maipl-dev.com"},
            ),
            patch(
                "common.management.commands.bootstrap_maipl.config",
                constance,
            ),
        ):
            Command()._verify_constance()

        self.assertEqual(constance.ALLOWED_REDIRECT_URLS, "dev.maipl-dev.com")


class InternalStorageDownloadTests(SimpleTestCase):
    def setUp(self):
        self.file_utils = FileUtils.__new__(FileUtils)
        self.file_utils.logger = MagicMock()
        self.file_utils.file_download_lock_timeout = 1800
        self.file_utils.file_download_blocking_timeout = 60
        self.file_utils.file_download_lock_renewal_interval = 600

        self.lock = MagicMock()
        self.lock.acquire.return_value = True
        self.lock.owned.return_value = True
        self.file_utils.redis_client = MagicMock()
        self.file_utils.redis_client.lock.return_value = self.lock

        self.file_instance = MagicMock()
        self.file_instance.basename = "source.wav"
        self.file_instance.file.chunks.return_value = [b"audio", b"data"]

    def test_download_uses_internal_storage_and_populates_cache_atomically(self):
        with tempfile.TemporaryDirectory() as cache_dir:
            cache_path = os.path.join(cache_dir, "cached-file")
            with (
                patch("common.file_utils.File.objects.get", return_value=self.file_instance),
                patch("common.file_utils.shared_file_cache.get", return_value=None),
                patch(
                    "common.file_utils.shared_file_cache._get_file_path",
                    return_value=cache_path,
                ),
                patch("common.file_utils.shared_file_cache.set") as cache_set,
            ):
                result = self.file_utils.download_file(123)

            self.assertEqual(result, cache_path)
            with open(cache_path, "rb") as cached_file:
                self.assertEqual(cached_file.read(), b"audiodata")
            self.file_instance.file.open.assert_called_once_with("rb")
            self.file_instance.file.storage.url.assert_not_called()
            cache_set.assert_called_once_with(123)

    def test_empty_download_is_rejected_and_not_cached(self):
        self.file_instance.file.chunks.return_value = []
        with tempfile.TemporaryDirectory() as cache_dir:
            cache_path = os.path.join(cache_dir, "cached-file")
            with (
                patch("common.file_utils.File.objects.get", return_value=self.file_instance),
                patch("common.file_utils.shared_file_cache.get", return_value=None),
                patch(
                    "common.file_utils.shared_file_cache._get_file_path",
                    return_value=cache_path,
                ),
                patch("common.file_utils.shared_file_cache.set") as cache_set,
            ):
                result = self.file_utils.download_file(123)

            self.assertIsNone(result)
            self.assertFalse(os.path.exists(cache_path))
            cache_set.assert_not_called()
