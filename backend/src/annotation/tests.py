import importlib
import tempfile
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from annotation import services
from annotation.handlers.BatchCreateHandler import BatchCreateHandler
from annotation.schema_defaults import (
    get_default_annotation_schema_details,
    load_default_annotation_schema,
)
from annotation.tasks import validate_generated_file
from annotation.models import Batch
from annotation.serializers import BatchWriteSerializer


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


class BatchOwnershipConstraintTests(SimpleTestCase):
    def test_batch_name_is_unique_per_user_not_globally(self):
        batch_name_field = Batch._meta.get_field("batch_name")

        self.assertFalse(batch_name_field.unique)
        self.assertIn(("batch_name", "user_id"), Batch._meta.unique_together)

    def test_serializer_does_not_apply_global_name_validator(self):
        serializer = BatchWriteSerializer()
        validator_names = {
            validator.__class__.__name__
            for validator in serializer.fields["batch_name"].validators
        }

        self.assertNotIn("UniqueValidator", validator_names)


class BatchActivityTests(SimpleTestCase):
    @patch("annotation.views.track_event")
    def test_batch_created_event_contains_a_useful_summary(self, track_event):
        from annotation.views import BatchList

        batch = MagicMock()
        batch.batch_name = "survey"
        batch.description = "A test batch"
        batch.parameters = {
            "type": "MagSpectrogram",
            "rate": 24000,
            "freq_min": 100,
            "freq_max": 10000,
        }
        batch.segment_parameters = {"length": 60, "step": 30, "pad": False}
        batch.allow_change_settings = True
        batch.filelist.count.return_value = 3
        handler = MagicMock(
            batch=batch,
            annotation_config_file_id=None,
            import_file_id=9,
        )
        handler.get_segment_ids.return_value = [1, 2, 3, 4]
        handler.get_annotations.return_value = [{"label": "KW"}]
        request = MagicMock()
        response = MagicMock(status_code=201)

        BatchList._track_batch_created(request, handler, response)

        metadata = track_event.call_args.kwargs["metadata"]
        self.assertEqual(metadata["batch_name"], "survey")
        self.assertEqual(metadata["file_count"], 3)
        self.assertEqual(metadata["segment_count"], 4)
        self.assertEqual(metadata["imported_annotation_count"], 1)
        self.assertEqual(metadata["annotation_schema_source"], "default")
        self.assertEqual(metadata["segment_length_seconds"], 60)


class SegmentAnnotationActivityTests(SimpleTestCase):
    def test_annotation_save_summary_contains_changes_and_labels(self):
        from annotation.views import AnnotationBatchSegmentView

        annotations = [
            {
                "id": "annotation-1",
                "region": {"properties": {"label": ["KW", "HB"]}},
            },
            {
                "id": "annotation-2",
                "region": {"properties": {"label": "KW"}},
            },
        ]
        metadata = AnnotationBatchSegmentView._build_activity_metadata(
            batch=SimpleNamespace(id=7, batch_name="survey"),
            segment=SimpleNamespace(
                id=12,
                filename="recording.wav",
                start=Decimal("60.000"),
                end=Decimal("120.000"),
            ),
            annotations=annotations,
            created_count=1,
            updated_count=1,
            deleted_count=2,
        )

        self.assertEqual(metadata["batch_name"], "survey")
        self.assertEqual(metadata["segment_id"], 12)
        self.assertEqual(metadata["segment_start_seconds"], 60.0)
        self.assertEqual(metadata["submitted_annotation_count"], 2)
        self.assertEqual(metadata["created_count"], 1)
        self.assertEqual(metadata["updated_count"], 1)
        self.assertEqual(metadata["deleted_count"], 2)
        self.assertEqual(metadata["label_counts"], {"KW": 2, "HB": 1})
        self.assertEqual(
            metadata["annotation_ids"], ["annotation-1", "annotation-2"]
        )

    @patch("annotation.views.track_event")
    @patch("annotation.views.process_batch.delay")
    @patch("annotation.views.Batch.objects.get")
    def test_processing_started_event_contains_batch_and_task_summary(
        self, get_batch, delay_task, track_event
    ):
        from annotation.views import ProcessBatchView

        batch = MagicMock()
        batch.batch_name = "survey"
        batch.parameters = {
            "type": "MagSpectrogram",
            "rate": 24000,
            "freq_min": 100,
            "freq_max": 10000,
            "channel": 0,
            "color_map": "viridis",
        }
        batch.segment_parameters = {"length": 60, "step": 30, "pad": False}
        batch.filelist.count.return_value = 3
        batch.segments.count.return_value = 12
        get_batch.return_value = batch
        delay_task.return_value = MagicMock(id="task-123")
        request = MagicMock()
        request.data = {"batch_id": 7}

        response = ProcessBatchView().post(request)

        self.assertEqual(response.status_code, 202)
        self.assertEqual(batch.task_id, "task-123")
        batch.save.assert_called_once_with()
        metadata = track_event.call_args.kwargs["metadata"]
        self.assertEqual(metadata["batch_name"], "survey")
        self.assertEqual(metadata["task_id"], "task-123")
        self.assertEqual(metadata["file_count"], 3)
        self.assertEqual(metadata["segment_count"], 12)
        self.assertEqual(metadata["sample_rate_hz"], 24000)
        self.assertEqual(metadata["segment_length_seconds"], 60)
