from ketos.audio.waveform import Waveform
from ..audio.processing import create_audio_array
from .config import spec_dict, validate_spec_config
from .visualization import adjust_range, setup_figure, save_figure

def process_segment_image(audio_file, start, end, spec_config, spec_output, amplification_factor=1.0, amplification_log=False, low_pass_freq=None, high_pass_freq=None, channel=0, spec_height=1, spec_dpi=400, vmin=0, vmax=1, cmap="viridis"):
    """Generate spectrogram image from audio segment.
    
    Key parameters:
        spec_config: Dictionary containing spectrogram parameters including:
            - type: Spectrogram type (Mel, Mag, Power, CQT)
            - nfft: Number of FFT points (frequency resolution)
            - num_filters: Number of mel bands (for MelSpectrogram)
        spec_dpi: DPI for image output (affects physical size)
        
    The output image dimensions are determined by:
        - Height: num_filters for MelSpectrogram, nfft/2 for others
        - Width: Calculated from duration and DPI
    """
    try:
        audio = create_audio_array(audio_file, start, end, audio_clip_rate=spec_config['rate'], amplification_factor=amplification_factor,
                                   amplification_log=amplification_log, low_pass_freq=low_pass_freq, high_pass_freq=high_pass_freq, channel=channel)
    except Exception as e:
        print(f"Error creating audio array: {e}")
        return

    try:
        wav = Waveform(data=audio, offset=start,
                       rate=spec_config['rate'], window=spec_config['window'], step=spec_config['step'])
    except Exception as e:
        print(f"Error creating Waveform object: {e}")
        return

    duration = end - start

    try:
        spec_type = spec_config['type']
        validated_config = validate_spec_config(spec_type, spec_config)
        
        # For MelSpectrogram, handle freq_min and freq_max separately
        if spec_type == 'MelSpectrogram':
            freq_min = validated_config.pop('freq_min', None)
            freq_max = validated_config.pop('freq_max', None)
            spec = spec_dict[spec_type].from_waveform(wav, **validated_config)
            # Apply frequency range after creation if specified
            if freq_min is not None and freq_max is not None:
                spec = spec.crop(freq_min=freq_min, freq_max=freq_max)
        else:
            # For other spectrogram types, pass all parameters directly
            spec = spec_dict[spec_type].from_waveform(wav, **validated_config)
            
    except Exception as e:
        print(f"Error creating spectrogram: {e}")
        return

    try:
        # Calculate dimensions to get exact pixel sizes
        desired_height_pixels = 400
        width_pixels = int(duration / 10 * spec_dpi)  # Calculate width in pixels
        
        # Set up the figure with exact pixel dimensions
        fig, ax = setup_figure(width_pixels, desired_height_pixels, spec_dpi)
        
        # Process and normalize the spectrogram data
        img_data = spec.data
        img_data = adjust_range(img_data)
        
        # Display the spectrogram
        ax.imshow(img_data.T, origin='lower', vmin=vmin, vmax=vmax, cmap=cmap, 
                 aspect='auto', interpolation='none')  # Disable interpolation
        
        # Save the figure
        save_figure(fig, spec_output, spec_dpi)
        
    except Exception as e:
        print(f"Error saving spectrogram image: {e}") 