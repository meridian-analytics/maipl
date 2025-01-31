from ketos.audio.spectrogram import (CQTSpectrogram, MagSpectrogram,
                                     MelSpectrogram, PowerSpectrogram)

# Dictionary mapping spectrogram types to their respective Ketos classes
spec_dict = {
    "MagSpectrogram": MagSpectrogram,  # Linear frequency scale
    "MelSpectrogram": MelSpectrogram,  # Mel frequency scale (better for marine acoustics)
    "PowerSpectrogram": PowerSpectrogram,  # Power spectrum representation
    "CQTSpectrogram": CQTSpectrogram  # Constant Q Transform (logarithmic frequency scale)
}

# Dictionary defining required and optional parameters for each spectrogram type
spec_params = {
    "MagSpectrogram": {
        "required": ["rate", "window", "step", "freq_min", "freq_max"],
        "optional": ["nfft", "window_func", "normalize"]
    },
    "MelSpectrogram": {
        "required": ["rate", "window", "step"],
        "optional": ["nfft", "window_func", "normalize", "num_filters", "freq_min", "freq_max"]
    },
    "PowerSpectrogram": {
        "required": ["rate", "window", "step"],
        "optional": ["nfft", "window_func", "normalize", "freq_min", "freq_max"]
    },
    "CQTSpectrogram": {
        "required": ["rate", "window", "step"],
        "optional": ["num_octaves", "bins_per_octave", "window_func", "normalize", "freq_min", "freq_max"]
    }
}

def validate_spec_config(spec_type, config):
    """Validate and process spectrogram configuration parameters.
    
    Args:
        spec_type (str): Type of spectrogram (Mag, Mel, Power, or CQT)
        config (dict): Configuration parameters including:
            - rate: Sample rate of the audio
            - window: Window size in seconds
            - step: Step size in seconds
            - nfft: Number of FFT points (determines frequency resolution)
            - num_filters: Number of mel bands (for MelSpectrogram)
            - freq_min/freq_max: Frequency range limits
        
    Returns:
        dict: Validated configuration parameters
        
    Raises:
        ValueError: If required parameters are missing or invalid
    """
    if spec_type not in spec_dict:
        raise ValueError(f"Unsupported spectrogram type: {spec_type}")
    
    params = spec_params[spec_type]
    validated_config = {}
    
    # Check required parameters
    for param in params["required"]:
        if param not in config:
            raise ValueError(f"Missing required parameter '{param}' for {spec_type}")
        validated_config[param] = config[param]
    
    # Add optional parameters if present
    for param in params["optional"]:
        if param in config:
            validated_config[param] = config[param]
            
    return validated_config 