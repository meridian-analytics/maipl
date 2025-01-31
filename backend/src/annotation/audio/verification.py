import soundfile as sf

def verify_audio_file(audio_file_path):
    """Verify audio file can be read and get basic information.
    
    Checks if the file is readable and prints basic audio properties:
    - Sample rate
    - Number of channels
    - Duration
    
    Args:
        audio_file_path: Path to the audio file
        
    Returns:
        bool: True if file is valid and readable, False otherwise
    """
    try:
        # Read the audio file and get the sample rate
        data, rate = sf.read(audio_file_path)

        # Retrieve the number of channels and the duration of the audio
        num_channels = data.shape[1] if len(data.shape) > 1 else 1
        duration = len(data) / rate

        # Print some basic information about the audio file
        print(f"Audio file: {audio_file_path}")
        print(f"Sample rate: {rate} Hz")
        print(f"Number of channels: {num_channels}")
        print(f"Duration: {duration:.2f} seconds")

        return True
    except Exception as e:
        print(f"Error reading audio file: {e}")
        return False 