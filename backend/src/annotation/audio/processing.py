from ketos.audio.waveform import Waveform
from soundfile import write as write_audio
from ..audio.filters import low_pass_filter, high_pass_filter, amplify
from ..utils.array_ops import adjust_range

def create_audio_array(audio_file, start, end, audio_clip_rate=22050, amplification_factor=1.0, amplification_log=False, low_pass_freq=None, high_pass_freq=None, channel=0):
    """Create processed audio array from file segment.
    
    Processing steps:
    1. Load audio segment from file
    2. Apply frequency filters if specified
    3. Normalize and amplify the signal
    
    Args:
        audio_file: Path to audio file
        start, end: Time range to process in seconds
        audio_clip_rate: Target sample rate
        amplification_factor: Signal amplification
        low_pass_freq: Upper frequency cutoff
        high_pass_freq: Lower frequency cutoff
        channel: Audio channel to process
    
    Returns:
        Processed audio array ready for spectrogram generation
        
    Raises:
        ValueError: If audio file cannot be loaded or processed
    """
    if audio_file is None:
        raise ValueError("Audio file path cannot be None")

    try:
        duration = end - start
        audio_obj = Waveform.from_wav(
            audio_file, rate=audio_clip_rate, channel=channel, offset=start, duration=duration)
        if audio_obj is None:
            raise ValueError("Failed to create Waveform object")
    except Exception as e:
        print(f"Error creating Waveform object from audio file: {e}")
        raise ValueError(f"Failed to load audio file: {e}")

    try:
        audio_array = audio_obj.data
        if audio_array is None or audio_array.size == 0:
            raise ValueError("Audio data is empty")
        rate = audio_obj.rate
    except Exception as e:
        print(f"Error extracting data and rate from Waveform object: {e}")
        raise ValueError(f"Failed to extract audio data: {e}")

    if low_pass_freq:
        try:
            audio_array = low_pass_filter(
                audio_array, rate=rate, freq=low_pass_freq)
            if audio_array is None:
                raise ValueError("Low pass filter returned None")
        except Exception as e:
            print(f"Error applying low pass filter: {e}")
            raise ValueError(f"Failed to apply low pass filter: {e}")

    if high_pass_freq:
        try:
            audio_array = high_pass_filter(
                audio_array, rate=rate, freq=high_pass_freq)
            if audio_array is None:
                raise ValueError("High pass filter returned None")
        except Exception as e:
            print(f"Error applying high pass filter: {e}")
            raise ValueError(f"Failed to apply high pass filter: {e}")

    try:
        audio_array = adjust_range(audio_array)
        if audio_array is None:
            raise ValueError("Range adjustment returned None")
        audio_array = amplify(
            audio_array, amplification_factor, amplification_log)
        if audio_array is None:
            raise ValueError("Amplification returned None")
    except Exception as e:
        print(f"Error adjusting range and amplifying audio array: {e}")
        raise ValueError(f"Failed to process audio: {e}")

    return audio_array


def process_segment_audio(audio_file, start, end, audio_clip_output, audio_clip_rate=22050, amplification_factor=1.0, amplification_log=False, low_pass_freq=None, high_pass_freq=None, channel=0):
    """Process audio segment and save to file.
    
    Similar to create_audio_array but saves the processed audio
    to a file instead of returning the array.
    Useful for audio playback and verification.
    
    Raises:
        ValueError: If audio processing fails
    """
    try:
        audio = create_audio_array(
            audio_file, start, end, 
            audio_clip_rate=audio_clip_rate,
            amplification_factor=amplification_factor,
            amplification_log=amplification_log,
            low_pass_freq=low_pass_freq,
            high_pass_freq=high_pass_freq,
            channel=channel
        )
        if audio is None:
            raise ValueError("Audio processing returned None")
            
        write_audio(
            file=audio_clip_output,
            data=audio,
            samplerate=audio_clip_rate,
            format='FLAC',
            subtype='PCM_24'
        )
    except Exception as e:
        raise ValueError(f"Failed to process audio segment: {e}") 