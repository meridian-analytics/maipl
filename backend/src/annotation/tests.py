import tempfile
from unittest.mock import patch

from django.test import SimpleTestCase

from annotation import services
from annotation.tasks import validate_generated_file


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
