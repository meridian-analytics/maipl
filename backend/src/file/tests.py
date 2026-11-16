from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from .serializers import StorageUsageSerializer

class FileUploadActivityTests(SimpleTestCase):
    @patch("file.views.track_event")
    @patch("file.views.UploadValidationHandler")
    def test_successful_upload_records_file_metadata(self, validation_handler, track_event):
        from .views import FileListView

        uploaded_file = SimpleNamespace(
            basename="recording.wav",
            path="surveys/recording.wav",
            extname=".wav",
            size=4096,
            maipl_folder="raw",
            tag="survey-2026",
            sha256="a" * 64,
        )
        serializer = MagicMock()
        serializer.save.return_value = uploaded_file
        request_file = SimpleNamespace(content_type="audio/wav")
        request = SimpleNamespace(
            user=SimpleNamespace(id=42, is_authenticated=True),
            FILES={"file": request_file},
        )
        view = FileListView()
        view.request = request

        view.perform_create(serializer)

        validation_handler.return_value.validate.assert_called_once_with()
        track_event.assert_called_once_with(
            event_type="file.uploaded",
            category="audit",
            actor=request.user,
            module="file",
            obj=uploaded_file,
            request=request,
            status_code=201,
            metadata={
                "filename": "recording.wav",
                "path": "surveys/recording.wav",
                "extension": ".wav",
                "size_bytes": 4096,
                "content_type": "audio/wav",
                "maipl_folder": "raw",
                "tag": "survey-2026",
                "sha256": "a" * 64,
            },
        )


class StorageUsageTests(SimpleTestCase):
    def test_serializer_exposes_future_quota_fields(self):
        data = StorageUsageSerializer({
            "used_bytes": 6144,
            "file_count": 2,
            "quota_bytes": None,
            "remaining_bytes": None,
            "usage_percent": None,
            "by_folder": [{
                "maipl_folder": "audio",
                "used_bytes": 6144,
                "file_count": 2,
            }],
        }).data

        self.assertEqual(data["used_bytes"], 6144)
        self.assertIsNone(data["quota_bytes"])
        self.assertEqual(data["by_folder"][0]["maipl_folder"], "audio")

    @patch("file.views.get_storage_usage")
    def test_current_user_usage_endpoint(self, get_storage_usage):
        from .views import StorageUsageView

        get_storage_usage.return_value = {
            "used_bytes": 2048,
            "file_count": 1,
            "quota_bytes": None,
            "remaining_bytes": None,
            "usage_percent": None,
            "by_folder": [],
        }
        request = APIRequestFactory().get("/api/file/storage-usage/")
        user = SimpleNamespace(id=42, is_authenticated=True)
        force_authenticate(request, user=user)

        response = StorageUsageView.as_view()(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["used_bytes"], 2048)
        get_storage_usage.assert_called_once_with(42)
