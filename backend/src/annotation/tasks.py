import os
import tempfile

from celery import shared_task, states
from celery.exceptions import SoftTimeLimitExceeded
from django.core.cache import cache
from django.core.files import File as DjangoFile

from common.file_utils import FileUtils
from common.logger import annotation_logger
from file.models import File

from .models import Batch, ProcessedAudio, ProcessedImage
from .services import generate_audio, generate_image, generate_waveform

@shared_task(bind=True)
def process_batch(self, batch_id):
    """Process all segments in a batch.
    
    For each segment in the batch:
    1. Generate spectrogram image
    2. Generate processed audio
    3. Save both to the database
    
    Args:
        batch_id: ID of the batch to process
    """
    annotation_logger.info(f"Starting batch processing for batch ID: {batch_id}")
    try:
        # Fetch batch details from the database
        batch = Batch.objects.get(id=batch_id)
        segments = batch.segments.all()
        annotation_logger.info(f"Found {segments.count()} segments to process in batch '{batch.batch_name}'")
     
        for segment in segments:
            result = process_segment(segment)
            if result is False:  # If segment processing failed
                raise Exception(f"Failed to process segment {segment.id}")

    except Batch.DoesNotExist:
        annotation_logger.error(f"Batch with ID {batch_id} not found in database")
        self.update_state(state=states.FAILURE, 
                         meta={'error': f"Batch with ID {batch_id} not found in database"})
        raise
    except SoftTimeLimitExceeded:
        annotation_logger.warning(f"Batch processing for batch ID {batch_id} exceeded the soft time limit")
        self.update_state(state=states.FAILURE,
                         meta={'error': f"Processing timeout for batch {batch_id}"})
        raise
    except Exception as e:
        annotation_logger.error(f"Unexpected error processing batch {batch_id}: {e}")
        self.update_state(state=states.FAILURE,
                         meta={'error': str(e)})
        raise


def process_segment(segment):
    """Process a single segment from a batch.
    
    Steps:
    1. Download audio file if not cached
    2. Generate and save spectrogram image
    3. Generate and save waveform image
    4. Generate and save processed audio
    
    Args:
        segment: Segment model instance containing:
            - start/end times
            - file reference
            - batch reference
            - user reference
            
    Returns:
        bool: True if successful, False if failed
    """
    try:
        annotation_logger.info(f"Processing segment ID: {segment.id} from file '{segment.filename}' (time range: {segment.start}s to {segment.end}s)")
        
        # Fetch segment details from the database
        start = segment.start
        end = segment.end
        file_id = segment.file_id
        basename = segment.file.basename
        batch = segment.batch
        parameters = batch.parameters
        user = segment.user_id

        # Download the file if it hasn't been cached locally
        local_path = cache.get(file_id)
        if not local_path:
            annotation_logger.info(f"Audio file {basename} not found in cache, downloading...")
            file_utils = FileUtils()
            local_path = file_utils.download_file(file_id)
            if local_path is None:
                annotation_logger.error(f"Failed to download audio file: {basename}")
                return False
            annotation_logger.info(f"Successfully downloaded and cached audio file: {basename}")
        else:
            annotation_logger.info(f"Using cached audio file: {basename}")

        # Generate spectrogram image and save to database
        with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as img_output:
            annotation_logger.info(f"Generating spectrogram for segment {segment.id}...")
            try:
                generate_image(local_path, img_output.name, parameters, start, end)
                image_file_name = f"{basename}-[{start}-{end}]-spectrogram.png"
                with DjangoFile(open(img_output.name, 'rb'), name=image_file_name) as image_file:
                    # Delete existing spectrogram if it exists, and create or update new spectrogram
                    existing_image = ProcessedImage.objects.filter(
                        segment_id=segment, 
                        batch_id=batch, 
                        user_id=user,
                        image_type="spectrogram"
                    )
                    if existing_image:
                        annotation_logger.info(f"Removing existing spectrogram for segment {segment.id}")
                        existing_image.delete()

                    ProcessedImage.objects.update_or_create(
                        segment_id=segment,
                        batch_id=batch,
                        user_id=user,
                        image_type="spectrogram",
                        defaults={'image': image_file}
                    )
                    annotation_logger.info(f"Successfully saved spectrogram for segment {segment.id}")
            except Exception as e:
                annotation_logger.error(f"Failed to generate spectrogram for segment {segment.id}: {e}")
                return False
            finally:
                os.remove(img_output.name)

        # Generate waveform image and save to database
        # Using SVG format for scalable vector graphics that can be scaled without quality loss
        with tempfile.NamedTemporaryFile(delete=False, suffix=".svg") as waveform_output:
            annotation_logger.info(f"Generating waveform for segment {segment.id}...")
            try:
                generate_waveform(local_path, waveform_output.name, parameters, start, end)
                waveform_file_name = f"{basename}-[{start}-{end}]-waveform.svg"
                with DjangoFile(open(waveform_output.name, 'rb'), name=waveform_file_name) as waveform_file:
                    # Delete existing waveform if it exists, and create or update new waveform
                    existing_waveform = ProcessedImage.objects.filter(
                        segment_id=segment, 
                        batch_id=batch, 
                        user_id=user,
                        image_type="waveform"
                    )
                    if existing_waveform:
                        annotation_logger.info(f"Removing existing waveform for segment {segment.id}")
                        existing_waveform.delete()

                    ProcessedImage.objects.update_or_create(
                        segment_id=segment,
                        batch_id=batch,
                        user_id=user,
                        image_type="waveform",
                        defaults={'image': waveform_file}
                    )
                    annotation_logger.info(f"Successfully saved waveform for segment {segment.id}")
            except Exception as e:
                annotation_logger.error(f"Failed to generate waveform for segment {segment.id}: {e}")
                return False
            finally:
                os.remove(waveform_output.name)
                
        # Generate audio and save to database
        with tempfile.NamedTemporaryFile(delete=False, suffix=".flac") as audio_output:
            annotation_logger.info(f"Generating processed audio for segment {segment.id}...")
            try:
                generate_audio(local_path, audio_output.name, parameters, start, end)
                audio_file_name = f"{basename}-[{start}-{end}].flac"
                with DjangoFile(open(audio_output.name, 'rb'), name=audio_file_name) as audio_file:
                    # Delete existing audio if it exists, and create or update new audio
                    existing_audio = ProcessedAudio.objects.filter(segment_id=segment, batch_id=batch, user_id=user)
                    if existing_audio:
                        annotation_logger.info(f"Removing existing processed audio for segment {segment.id}")
                        existing_audio.delete()
                    
                    ProcessedAudio.objects.update_or_create(
                        segment_id=segment,
                        batch_id=batch,
                        user_id=user,
                        defaults={'audio': audio_file}
                    )
                    annotation_logger.info(f"Successfully saved processed audio for segment {segment.id}")
            except Exception as e:
                annotation_logger.error(f"Failed to generate audio for segment {segment.id}: {e}")
                return False
            finally:
                os.remove(audio_output.name)

        return True

    except Exception as e:
        annotation_logger.error(f"Unexpected error processing segment {segment.id}: {e}")
        return False   