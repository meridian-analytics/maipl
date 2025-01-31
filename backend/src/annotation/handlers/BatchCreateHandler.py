import csv
import json
import os
import uuid

from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Q

from annotation.models import Annotation, Batch, Segment
from common.download_file import download_file
from file.models import File


class BatchCreateHandler:
    """Handler for creating a batch with files or import file.
    
    This handler manages the batch creation process, including:
    - Loading and validating import files
    - Creating segments from files
    - Importing and mapping annotations
    - Managing file and user associations
    
    Attributes:
        required_fields: List of required fields for validation
        annotation_config_file_id: ID of the annotation configuration file
        import_file_id: ID of the import file (if any)
        filelist: List of files to process
        annotations: List of annotations from import file
        batch_id: ID of the created batch
        batch: Batch instance
        user: User instance
        segments: List of created segments
        file_ids: Dictionary mapping filenames to file IDs
    """

    def __init__(self, request, required_fields):
        self.required_fields = required_fields
        self.annotation_config_file_id = request.data['annotation_file']
        self.import_file_id = request.data.get('import_file', None)
        self.filelist = []
        self.annotations = []
        self.batch_id = None
        self.batch = None
        self.user = get_user_model().objects.get(id=request.user.id)
        self.segments = []
        self.file_ids = {}

    def get_annotation_config(self):
        """Get the annotation configuration from file."""
        return json.loads(File.objects.get(id=self.annotation_config_file_id).file.read())

    def get_import_file_id(self):
        """Get the import file ID."""
        return self.import_file_id

    def get_filelist(self):
        """Get the list of files after handling import file."""
        self.__handle_import_file()
        return self.filelist

    def get_annotations(self):
        """Get the list of annotations."""
        return self.annotations

    def get_batch(self):
        """Get the batch instance."""
        batch = Batch.objects.get(id=self.batch_id)
        return batch

    def get_segment_ids(self):
        """Get list of segment IDs."""
        return [segment.id for segment in self.segments]

    def set_batch_id(self, batch_id):
        """Set the batch ID and get the batch instance."""
        self.batch_id = batch_id
        self.batch = Batch.objects.get(id=batch_id)

    def generate_segments_with_filelist(self):
        """Generate segments for all files in the batch."""
        file_ids = [file.id for file in self.batch.filelist.all()]
        self.__create_segments_with_file_ids(file_ids)
        return self.segments

    def __handle_import_file(self):
        """Handle the import file CSV.
        
        Validates required fields and loads file information.
        For each file path:
        1. Tries to find a file owned by the user
        2. Or tries to find a file shared with the user
        3. Raises an error if the file doesn't exist or user doesn't have access
        
        Raises ValueError if:
        - Required fields are missing
        - Files don't exist
        - User doesn't have access to the files
        """
        try:
            file_local_path = download_file(self.import_file_id)
            self.__check_required_fields(file_local_path)
            with open(file_local_path, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                self.annotations = list(reader)
            local_filename = os.path.basename(file_local_path)

            filenames = set()
            for annotation in self.annotations:
                filenames.add(annotation['filename'])

            fileset = set()
            for filename in filenames:
                # Try to find a file that the user owns or has shared access to
                accessible_files = File.objects.filter(
                    path=filename
                ).filter(
                    Q(user_id=self.user) | Q(shared_to=self.user)
                ).distinct()

                if not accessible_files.exists():
                    raise ValueError(
                        f"You don't have access to the file '{filename}'. "
                        "Please ensure the file exists and you have proper permissions."
                    )

                fileset.add(accessible_files.first().id)

            self.filelist = list(fileset)
        except Exception as e:
            raise ValueError(str(e)) from e

    def __check_required_fields(self, file_local_path):
        """Check if the required fields are present in the file.
        
        Args:
            file_local_path: Path to the CSV file
            
        Raises:
            ValueError: If required fields are missing
        """
        with open(file_local_path, 'r', encoding='utf-8') as file:
            reader = csv.reader(file)
            first_row = next(reader)
            if not all(key in first_row for key in self.required_fields):
                missing_fields = [key for key in self.required_fields if key not in first_row]
                missing_fields = ', '.join(missing_fields)
                raise ValueError(f"Missing {missing_fields} fields in the file.")

    def __create_segments_with_file_ids(self, file_ids):
        """Create segments for each file based on segment parameters.
        
        Args:
            file_ids: List of file IDs to create segments for
            
        Creates segments based on:
        - Segment length
        - Step size (overlap)
        - Padding settings
        """
        segment_parameters = self.batch.segment_parameters
        segment_length = segment_parameters['length']
        segment_step = segment_parameters.get('step', segment_length)
        segment_pad = segment_parameters.get('pad', False)

        if segment_step == 0:
            segment_step = segment_length

        for file_id in file_ids:
            file = File.objects.get(id=file_id)
            duration = file.meta['duration']
            number_of_segments = int(duration / segment_step)

            # Create regular segments
            for i in range(number_of_segments):
                start = i * segment_step
                end = min(start + segment_length, duration)
                self.segments.append(Segment.objects.create(
                    filename=file.path,
                    start=start,
                    end=end,
                    file=file,
                    batch=self.batch,
                    user_id=self.user,
                ))

            # Add final segment if needed
            if duration % segment_length > 0 and not segment_pad:
                start = number_of_segments * segment_step
                end = duration
                self.segments.append(Segment.objects.create(
                    filename=file.path,
                    start=start,
                    end=end,
                    file=file,
                    batch=self.batch,
                    user_id=self.user,
                ))

    def import_annotations_to_batch(self):
        """Import annotations/detections from a CSV file to a batch.
        
        Process:
        1. Map file IDs to filenames
        2. Map annotations to segments
        3. Create annotation objects
        
        Raises:
            ValueError: If there are issues during import
        """
        try:
            self.__map_file_id_to_filename()
            self.__map_annotations_to_segments()
        except Exception as e:
            raise ValueError(f"{str(e)} It happened during importing annotations to the batch.") from e

    def __map_file_id_to_filename(self):
        """Map filenames to file IDs.
        
        Creates a mapping of filenames to their corresponding file IDs
        for efficient lookup during annotation import.
        
        Raises:
            FileNotFoundError: If a file doesn't exist in the database
        """
        filenames = {annotation['filename'] for annotation in self.annotations}
        
        for filename in filenames:
            try:
                file = File.objects.get(path=filename)
                self.file_ids[filename] = file.id
            except File.DoesNotExist as exc:
                raise FileNotFoundError(f"File with path {filename} does not exist.") from exc

    def __map_annotations_to_segments(self):
        """Map annotations to their corresponding segments.
        
        For each annotation:
        1. Extract required and optional fields
        2. Find matching segment
        3. Create annotation object with correct region format
        
        Region format:
        {
            'id': UUID,
            'x': start time in seconds,
            'y': minimum frequency in Hz,
            'width': duration in seconds,
            'height': frequency range in Hz,
            'xunit': 'seconds',
            'yunit': 'hertz',
            'properties': {
                'label': label string,
                'score': score value,
                'call_type': call type string,
                'quality': quality value,
                'comments': comments string,
                'user_id': user ID
            }
        }
        """
        try:
            for annotation in self.annotations:
                # Required fields
                start = float(annotation['start'])
                end = float(annotation['end'])
                label = annotation['label']

                # Optional fields with defaults
                score = float(annotation.get('score', 0))
                freq_min = float(annotation.get('freq_min', self.batch.parameters.get('freq_min', 0)))
                freq_max = float(annotation.get('freq_max', self.batch.parameters.get('freq_max', 0)))
                call_type = annotation.get('call_type')
                quality = annotation.get('quality')
                comments = annotation.get('comments')

                # Find matching segment
                segments_in_same_file = [
                    segment for segment in self.segments 
                    if segment.file_id == self.file_ids[annotation['filename']]
                ]
                matched_segment = min(
                    (segment for segment in segments_in_same_file if segment.start <= start),
                    key=lambda segment: start - segment.start
                )

                # Create annotation with correct region format
                generated_id = str(uuid.uuid4())
                region = {
                    'id': generated_id,
                    'x': start,
                    'y': freq_min,
                    'width': end - start,
                    'height': freq_max - freq_min,
                    'xunit': 'seconds',
                    'yunit': 'hertz',
                    'properties': {
                        'label': label,
                        'score': score,
                        'call_type': call_type,
                        'quality': quality,
                        'comments': comments,
                        'user_id': self.user.id
                    }
                }
                
                file_id = self.file_ids[annotation['filename']]
                file = File.objects.get(id=file_id)
                Annotation.objects.create(
                    id=generated_id,
                    segment=matched_segment,
                    batch=self.batch,
                    file=file,
                    region=region,
                    user_id=self.user,
                    created_at=timezone.now()
                )
        except Exception as e:
            raise ValueError(f"{str(e)} It happened during mapping annotations to segments.") from e
