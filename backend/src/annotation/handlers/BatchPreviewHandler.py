import tempfile

from django.core.cache import cache

from annotation.services import generate_image
from common.file_utils import FileUtils
from file.models import File


class BatchPreviewHandler:
    """Handler for previewing batch with files or import file.
    
    This handler manages the preview generation for a batch, including:
    - Loading audio files
    - Generating spectrograms with specified parameters
    - Managing temporary files and caching
    
    Attributes:
        required_fields: List of required fields for validation
        import_file_id: ID of the import file (if any)
        filelist: List of files to process
        parameters: Spectrogram generation parameters
        segment_parameters: Parameters for segment creation
        segment: Current segment being processed
        start: Start time for the segment
        file_id: ID of the current file
        preview_url: URL of the generated preview
    """

    def __init__(self, request, required_fields):
        self.required_fields = required_fields
        self.import_file_id = request.data.get("import_file", None)
        self.filelist = request.data.get("filelist", [])
        self.parameters = request.data.get("parameters", {})
        self.segment_parameters = request.data.get("segment_parameters", {})
        self.segment = None
        self.start = request.data.get("start", 0)
        self.file_id = None
        self.preview_url = None
        self.file_utils = FileUtils()

        self.__set_file_id()
        self.__create_segment()

    def get_preview_url(self):
        """Get the URL of the generated preview image."""
        return self.preview_url

    def generate_preview(self):
        """Generate a preview spectrogram for the current segment.
        
        Downloads the audio file if not cached, generates a spectrogram
        with the specified parameters, and saves it as a temporary file.
        """
        local_path = cache.get(self.file_id)
        if not local_path:
            local_path = self.file_utils.download_file(self.file_id)

        with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as img_output:
            generate_image(
                local_path,
                img_output.name,
                self.parameters,
                self.segment["start"],
                self.segment["end"],
            )
            self.preview_url = img_output.name

    def __set_file_id(self):
        """Set the file ID from either import file or filelist."""
        if self.import_file_id:
            pass
        else:
            self.file_id = self.filelist[0]

    def __create_segment(self):
        """Create a segment based on the specified parameters.
        
        Uses segment_length from parameters and adjusts the end time
        if it exceeds the file duration.
        """
        segment_length = self.segment_parameters.get("segment_length", 60)

        file = File.objects.get(id=self.file_id)
        duration = file.meta["duration"]
        end = self.start + segment_length
        if end > duration:
            end = duration

        self.segment = {
            "start": self.start,
            "end": end,
        }
