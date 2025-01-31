from .audio.verification import verify_audio_file
from .audio.processing import process_segment_audio
from .spectrogram.generation import process_segment_image

def generate_image(input_file_path, output_file_path, parameters, start, end):
    """Generate spectrogram image from audio file.
    
    Args:
        parameters: Dictionary containing:
            - type: Spectrogram type
            - rate: Sample rate
            - window_length: Analysis window length in seconds
            - step_size: Time step between windows
            - num_filters: Number of mel bands (for MelSpectrogram)
            - nfft: Number of FFT points (frequency resolution)
    """
    is_working = verify_audio_file(input_file_path)

    if is_working:
        print("The audio file is working.")
    else:
        print("The audio file is not working.")
        return

    try:
        # Basic spectrogram configuration with required parameters
        spec_config = {
            "type": parameters['type'],
            "rate": int(parameters['rate']),
            "window": float(parameters['window_length']),  # Analysis window length in seconds
            "step": float(parameters['step_size']),  # Time step between windows
        }

        # Add optional parameters based on spectrogram type
        if parameters['type'] == "MelSpectrogram":
            spec_config['nfft'] = 1024  # Higher frequency resolution for mel scale conversion (gives 513 freq bins)
        elif parameters['type'] == "CQTSpectrogram":
            if 'num_octaves' in parameters:
                spec_config['num_octaves'] = int(parameters['num_octaves'])
            if 'bins_per_octave' in parameters:
                spec_config['bins_per_octave'] = int(parameters['bins_per_octave'])
        else:
            # For MagSpectrogram and PowerSpectrogram
            spec_config['nfft'] = 800  # Gives exactly 400 frequency bins (nfft/2)

        # Common optional parameters for all spectrogram types
        if 'window_func' in parameters:
            spec_config['window_func'] = parameters['window_func']  # Window function for FFT
        if 'normalize' in parameters:
            spec_config['normalize'] = bool(parameters['normalize'])  # Normalize spectrogram values
        if 'freq_min' in parameters:
            spec_config['freq_min'] = int(parameters['freq_min'])  # Lower frequency limit
        if 'freq_max' in parameters:
            spec_config['freq_max'] = int(parameters['freq_max'])  # Upper frequency limit
        if 'num_filters' in parameters:
            spec_config['num_filters'] = int(parameters['num_filters'])  # Number of mel bands (determines height for MelSpectrogram)

    except Exception as e:
        print(f"Error setting up spectrogram configuration: {e}")
        return

    try:
        start = float(start)
        end = float(end)
    except Exception as e:
        print(f"Error converting start and end times to float: {e}")
        return

    # Set default values for visualization parameters if not provided
    visualization_params = {
        'amplification': float(parameters.get('amplification', 1.0)),
        'low_pass_freq': int(parameters['low_pass']) if 'low_pass' in parameters else None,
        'high_pass_freq': int(parameters['high_pass']) if 'high_pass' in parameters else None,
        'channel': int(parameters.get('channel', 0)),
        'vmin': float(parameters.get('vmin', 0)),
        'vmax': float(parameters.get('vmax', 1)),
        'color_map': parameters.get('color_map', 'viridis'),
        'spec_height': 1.0  # Fixed to 1 inch since we're using native resolution
    }

    try:
        process_segment_image(
            audio_file=input_file_path,
            start=start,
            end=end,
            spec_config=spec_config,
            spec_output=output_file_path,
            amplification_factor=visualization_params['amplification'],
            low_pass_freq=visualization_params['low_pass_freq'],
            high_pass_freq=visualization_params['high_pass_freq'],
            channel=visualization_params['channel'],
            vmin=visualization_params['vmin'],
            vmax=visualization_params['vmax'],
            cmap=visualization_params['color_map'],
            spec_height=visualization_params['spec_height'])
    except Exception as e:
        print(f"Error processing segment image: {e}")


def generate_audio(input_file_path, output_file_path, parameters, start, end):
    """Generate processed audio segment from audio file.
    
    Args:
        parameters: Dictionary containing:
            - amplification: Signal amplification factor
            - low_pass: Upper frequency cutoff
            - high_pass: Lower frequency cutoff
            - channel: Audio channel to process
    """
    try:
        start = float(start)
        end = float(end)
        amplification_factor = float(parameters['amplification'])
        low_pass_freq = int(parameters.get('low_pass', None)) if parameters.get('low_pass') is not None else None
        high_pass_freq = int(parameters.get('high_pass', None)) if parameters.get('high_pass') is not None else None
        channel = int(parameters['channel'])
    except Exception as e:
        print(f"Error setting up parameters: {e}")
        return

    try:
        process_segment_audio(
            audio_file=input_file_path,
            start=start,
            end=end,
            audio_clip_output=output_file_path,
            amplification_factor=amplification_factor,
            low_pass_freq=low_pass_freq,
            high_pass_freq=high_pass_freq,
            channel=channel)
    except Exception as e:
        print(f"Error processing segment audio: {e}") 