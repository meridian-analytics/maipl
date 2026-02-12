from common.logger import annotation_logger

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
        annotation_logger.info("The audio file is working.")
    else:
        annotation_logger.error("The audio file is not working.")
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
        annotation_logger.error(f"Error setting up spectrogram configuration: {e}")
        return

    try:
        start = float(start)
        end = float(end)
    except Exception as e:
        annotation_logger.error(f"Error converting start and end times to float: {e}")
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
        annotation_logger.error(f"Error processing segment image: {e}")


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
        annotation_logger.error(f"Error setting up parameters: {e}")
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
        annotation_logger.error(f"Error processing segment audio: {e}")


def generate_waveform(input_file_path, output_file_path, parameters, start, end):
    """Generate waveform visualization from audio file.
    
    Args:
        input_file_path: Path to input audio file
        output_file_path: Path to save the waveform image
        parameters: Dictionary containing visualization parameters
        start: Start time in seconds
        end: End time in seconds
    """
    try:
        from ketos.audio.waveform import Waveform
        import matplotlib.pyplot as plt
        import numpy as np
        import os
        from decimal import Decimal
        import soundfile as sf

        annotation_logger.info(f"Starting waveform generation for audio file: {os.path.basename(input_file_path)}")
        
        # Convert Decimal to float
        start_float = float(start)
        end_float = float(end)
        duration = end_float - start_float
        annotation_logger.info(f"Processing time range: {start_float:.3f}s to {end_float:.3f}s (duration: {duration:.3f}s)")

        # Verify audio file
        is_working = verify_audio_file(input_file_path)
        if not is_working:
            annotation_logger.error(f"Audio file verification failed for: {os.path.basename(input_file_path)}")
            return
        annotation_logger.info("Audio file verification successful")

        # First get the sample rate
        with sf.SoundFile(input_file_path) as sf_file:
            sample_rate = sf_file.samplerate
            
        # Read audio file with original sampling rate
        annotation_logger.info("Reading audio file with original sampling rate...")
        data = sf.read(input_file_path, 
                      start=int(start_float * sample_rate), 
                      stop=int(end_float * sample_rate))[0]
        
        if len(data.shape) > 1:
            # If stereo, take the first channel
            data = data[:, 0]

        annotation_logger.info(f"Audio loaded with sample rate: {sample_rate} Hz")
        annotation_logger.info(f"Number of samples: {len(data)}")

        # Create time array with full resolution
        times = np.linspace(start_float, end_float, len(data))

        # Calculate dimensions to match spectrogram exactly
        spec_dpi = 400  # Match spectrogram DPI
        desired_height_pixels = 400  # Match spectrogram height
        # Calculate width using the same formula as spectrogram
        width_pixels = int(duration / 10 * spec_dpi)  # This matches spectrogram width calculation
        # Ensure minimum width of 100 pixels for very short segments
        width_pixels = max(width_pixels, 100)
        
        # Create figure with exact pixel dimensions
        annotation_logger.info(f"Creating matplotlib figure with dimensions: {width_pixels}x{desired_height_pixels} pixels at {spec_dpi} DPI")
        fig = plt.figure(dpi=spec_dpi)
        fig.set_size_inches(width_pixels/spec_dpi, desired_height_pixels/spec_dpi)
        
        # Create axis that fills the whole figure with no padding
        ax = plt.Axes(fig, [0., 0., 1., 1.])
        ax.set_axis_off()
        fig.add_axes(ax)
        
        # Set white background
        ax.set_facecolor('white')
        fig.patch.set_facecolor('white')
        
        # Plot waveform with thinner line and no padding
        annotation_logger.info("Plotting waveform data...")
        ax.plot(times, data, color='black', linewidth=0.05, solid_capstyle='butt')
        
        # Set exact axis limits to remove padding
        ax.set_xlim(start_float, end_float)
        max_amplitude = np.max(np.abs(data))
        ax.set_ylim(-max_amplitude, max_amplitude)
        
        # Save plot with white background and no padding
        # Using SVG format for scalable vector graphics that can be scaled without quality loss
        annotation_logger.info(f"Saving waveform visualization to: {os.path.basename(output_file_path)}")
        plt.savefig(output_file_path, 
                   dpi=spec_dpi,
                   bbox_inches='tight',
                   pad_inches=0,
                   facecolor='white',
                   edgecolor='none',
                   format='svg')
        plt.close()

        # Verify file was created and has content
        if os.path.exists(output_file_path):
            file_size = os.path.getsize(output_file_path)
            annotation_logger.info(f"Waveform visualization saved successfully. File size: {file_size/1024:.2f} KB")
            if file_size == 0:
                annotation_logger.error("Generated waveform file is empty, removing...")
                if os.path.exists(output_file_path):
                    os.remove(output_file_path)
        else:
            annotation_logger.error("Failed to create waveform visualization file")

    except ImportError as e:
        annotation_logger.error(f"Failed to import required packages for waveform generation: {e}")
    except Exception as e:
        annotation_logger.error(f"Error during waveform generation: {e}")
        import traceback
        annotation_logger.error(f"Full traceback:\n{traceback.format_exc()}") 