import os
import tempfile

from celery import shared_task
from celery.exceptions import SoftTimeLimitExceeded
from django.core.cache import cache
from django.core.files import File as DjangoFile

from common.download_file import download_file
from file.models import File

from .models import Batch, ProcessedAudio, ProcessedImage
from .services import generate_audio, generate_image


@shared_task()
def process_batch(batch_id):
    """Process all segments in a batch.
    
    For each segment in the batch:
    1. Generate spectrogram image
    2. Generate processed audio
    3. Save both to the database
    
    Args:
        batch_id: ID of the batch to process
    """
    print(f"Processing batch: {batch_id}")
    try:
        # Fetch batch details from the database
        batch = Batch.objects.get(id=batch_id)
        segments = batch.segments.all()
     
        for segment in segments:
            process_segment(segment)

    except Batch.DoesNotExist:
        print(f"No batch found with id: {batch_id}")
    except SoftTimeLimitExceeded:
        print("Task exceeded the soft time limit")
    except Exception as e:
        print(f"An error occurred: {e}")


def process_segment(segment):
    """Process a single segment from a batch.
    
    Steps:
    1. Download audio file if not cached
    2. Generate and save spectrogram image
    3. Generate and save processed audio
    
    Args:
        segment: Segment model instance containing:
            - start/end times
            - file reference
            - batch reference
            - user reference
    """
    print(f"Processing segment: {segment.id}")
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
        print("cache miss")
        local_path = download_file(file_id)

    # Generate image and save to database
    with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as img_output:
        print(f"Generating image: {img_output.name}")
        try:
            generate_image(local_path, img_output.name, parameters, start, end)
            image_file_name = f"{basename}-[{start}-{end}].png"
            with DjangoFile(open(img_output.name, 'rb'), name=image_file_name) as image_file:
                # Delete existing image if it exists, and create or update new image
                existing_image = ProcessedImage.objects.filter(segment_id=segment, batch_id=batch, user_id=user)
                if existing_image:
                    existing_image.delete()

                ProcessedImage.objects.update_or_create(
                    segment_id=segment,
                    batch_id=batch,
                    user_id=user,
                    defaults={'image': image_file}
                )
        finally:
            os.remove(img_output.name)        
                
    # Generate audio and save to database
    with tempfile.NamedTemporaryFile(delete=False, suffix=".flac") as audio_output:
        print(f"Generating audio: {audio_output.name}")
        try:
            generate_audio(local_path, audio_output.name, parameters, start, end)
            audio_file_name = f"{basename}-[{start}-{end}].flac"
            with DjangoFile(open(audio_output.name, 'rb'), name=audio_file_name) as audio_file:
                # Delete existing audio if it exists, and create or update new audio
                existing_audio = ProcessedAudio.objects.filter(segment_id=segment, batch_id=batch, user_id=user)
                if existing_audio:
                    existing_audio.delete()
                
                ProcessedAudio.objects.update_or_create(
                    segment_id=segment,
                    batch_id=batch,
                    user_id=user,
                    defaults={'audio': audio_file}
                )
        finally:
            os.remove(audio_output.name)   