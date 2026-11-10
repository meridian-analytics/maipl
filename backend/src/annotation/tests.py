import importlib
import tempfile
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from annotation import services
from annotation.handlers.BatchCreateHandler import BatchCreateHandler
from annotation.schema_defaults import (
    get_default_annotation_schema_details,
    load_default_annotation_schema,
)
from annotation.tasks import validate_generated_file


batch_create_module = importlib.import_module(
    "annotation.handlers.BatchCreateHandler"
)


class GeneratedArtifactValidationTests(SimpleTestCase):
    def test_rejects_missing_artifact(self):
        with self.assertRaisesRegex(ValueError, "was not created"):
            validate_generated_file("/tmp/maipl-missing-artifact", "Spectrogram")

    def test_rejects_empty_artifact(self):
        with tempfile.NamedTemporaryFile() as artifact:
            with self.assertRaisesRegex(ValueError, "is empty"):
                validate_generated_file(artifact.name, "Processed audio")

    def test_accepts_nonempty_artifact(self):
        with tempfile.NamedTemporaryFile() as artifact:
            artifact.write(b"data")
            artifact.flush()
            self.assertEqual(validate_generated_file(artifact.name, "Waveform"), 4)


class GenerationFailureTests(SimpleTestCase):
    @patch("annotation.services.verify_audio_file", return_value=False)
    def test_spectrogram_verification_failure_is_raised(self, _verify):
        with self.assertRaisesRegex(ValueError, "Audio file verification failed"):
            services.generate_image("bad.wav", "output.png", {}, 0, 1)

    @patch(
        "annotation.services.process_segment_audio",
        side_effect=ValueError("unsupported audio"),
    )
    def test_audio_processing_failure_is_raised(self, _process):
        parameters = {"amplification": 1, "channel": 0}
        with self.assertRaisesRegex(ValueError, "Failed to generate processed audio"):
            services.generate_audio("bad.wav", "output.flac", parameters, 0, 1)


class AnnotationSchemaSelectionTests(SimpleTestCase):
    def test_built_in_schema_details_are_readable(self):
        details = get_default_annotation_schema_details()

        self.assertEqual(details["name"], "Default marine mammal annotation schema")
        self.assertIn("Killer whale (KW)", details["description"])
        self.assertIn("Humpback whale (HB)", details["description"])
        self.assertEqual(details["config"], load_default_annotation_schema())

    def test_built_in_schema_is_valid_and_complete(self):
        config = load_default_annotation_schema()

        self.assertEqual(config["schema"]["type"], "object")
        self.assertEqual(
            config["schema"]["properties"]["label"]["enum"],
            ["KW", "HB", "KW+HB", "Background"],
        )
        self.assertIn("uiSchema", config)

    def test_missing_file_selection_uses_built_in_schema(self):
        handler = BatchCreateHandler.__new__(BatchCreateHandler)
        handler.annotation_config_file_id = None

        self.assertEqual(
            handler.get_annotation_config(), load_default_annotation_schema()
        )

    def test_inaccessible_custom_schema_is_rejected(self):
        queryset = MagicMock()
        with patch.object(batch_create_module.File, "objects") as file_objects:
            file_objects.filter.return_value = queryset
            queryset.filter.return_value = queryset
            queryset.distinct.return_value = queryset
            queryset.first.return_value = None

            handler = BatchCreateHandler.__new__(BatchCreateHandler)
            handler.annotation_config_file_id = 42
            handler.user = MagicMock()

            with self.assertRaisesRegex(ValueError, "not accessible"):
                handler.get_annotation_config()

    def test_accessible_custom_schema_overrides_default(self):
        queryset = MagicMock()
        with patch.object(batch_create_module.File, "objects") as file_objects:
            file_objects.filter.return_value = queryset
            queryset.filter.return_value = queryset
            queryset.distinct.return_value = queryset
            custom_file = MagicMock()
            custom_file.file.read.return_value = b'{"schema": {}, "uiSchema": {}}'
            queryset.first.return_value = custom_file

            handler = BatchCreateHandler.__new__(BatchCreateHandler)
            handler.annotation_config_file_id = 42
            handler.user = MagicMock()

            self.assertEqual(
                handler.get_annotation_config(), {"schema": {}, "uiSchema": {}}
            )
            custom_file.file.open.assert_called_once_with("rb")
            custom_file.file.close.assert_called_once()
