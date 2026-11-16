from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

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
