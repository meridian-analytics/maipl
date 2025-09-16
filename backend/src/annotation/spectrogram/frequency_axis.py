import numpy as np
from ketos.audio.utils.axis import MelAxis

def compute_frequency_axis(spec_config):
    """
    Compute frequency axis based on spectrogram type and configuration.
    
    Args:
        spec_config: dict containing:
            - type: str, spectrogram type ('MagSpectrogram', 'MelSpectrogram')
            - rate: int, sampling rate (used to determine Nyquist frequency)
            For MagSpectrogram:
                - freq_min: float, minimum frequency (defaults to 0)
                - freq_max: float, maximum frequency (defaults to 10000)
            For MelSpectrogram:
                - freq_min: float, minimum frequency (defaults to 0)
                - freq_max: float, maximum frequency (defaults to rate/2)
                - num_filters: int, number of mel filters (used in spectrogram generation)
            
    Returns:
        list: Frequency values in Hz in descending order (high to low frequency).
             For MagSpectrogram: 20 linearly spaced points between freq_min and freq_max.
             For MelSpectrogram: Mel-scaled frequencies between freq_min and freq_max,
                                with logarithmic spacing (more points at lower frequencies).
    """
    spec_type = spec_config['type']
    
    if spec_type == 'MagSpectrogram':
        # For linear scale, generate 20 evenly spaced frequencies
        freq_min = spec_config.get('freq_min', 0)
        freq_max = spec_config.get('freq_max', 10000)
        
        # Return frequencies in descending order
        return [int(round(freq)) for freq in np.linspace(freq_min, freq_max, 20)][::-1]
        
    elif spec_type == 'MelSpectrogram':
        # Get frequency range parameters
        sample_rate = spec_config['rate']
        nyquist = sample_rate / 2
        freq_min = spec_config.get('freq_min', 0)
        freq_max = spec_config.get('freq_max', nyquist)
        
        # Ensure freq_max doesn't exceed Nyquist frequency
        freq_max = min(freq_max, nyquist)
        
        # Create MelAxis with 40 points up to freq_max
        mel_axis = MelAxis(num_filters=40, freq_max=freq_max)
        
        # Get mel-scaled frequencies
        frequencies = [int(round(mel_axis.low_edge(b))) for b in range(40)]
        
        # Filter frequencies if we have a non-zero minimum
        if freq_min > 0:
            frequencies = [f for f in frequencies if freq_min <= f <= freq_max]
        
        # Return frequencies in descending order
        return frequencies[::-1]
        
    else:
        raise ValueError(f"Unsupported spectrogram type: {spec_type}")