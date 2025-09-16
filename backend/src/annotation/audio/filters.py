import numpy as np
from scipy.signal import butter, sosfilt

def low_pass_filter(sig, rate, order=10, freq=400):
    """ Apply a low pass butter filter to the input signal.

        Args:
            sig: 1D numpy array (floats or ints)
                The audio signal(time domain) to be filtered
            rate: int
                The sampling rate of the signal
            order: int
                Filter order
            freq: int
                The frequency used for the filter. 

        Return:
            filtered_signal: 1D numpy array
                The signal with frequencies above 'freq' filtered out.
    """
    butter_filter = butter(N=order, fs=rate, Wn=freq,
                           btype="lowpass", output="sos")
    filtered_signal = sosfilt(butter_filter, sig)
    return filtered_signal


def high_pass_filter(sig, rate, order=10, freq=400):
    """ Apply a high pass butter filter to the input signal.

        Args:
            sig: 1D numpy array (floats or ints)
                The audio signal(time domain) to be filtered
            rate: int
                The sampling rate of the signal
            order: int
                Filter order
            freq: int
                The frequency used for the filter. 

        Return:
            filtered_signal: 1D numpy array
                The signal with frequencies below 'freq' filtered out.
    """
    butter_filter = butter(N=order, fs=rate, Wn=freq,
                           btype="highpass", output="sos")
    filtered_signal = sosfilt(butter_filter, sig)
    return filtered_signal


def amplify(signal, factor, log=False):
    """Amplify the audio signal.
    
    Args:
        signal: Audio signal array
        factor: Amplification factor
        log: Whether to use logarithmic amplification
    """
    if log:
        amp_signal = signal * np.power(10, factor / 20)
    else:
        amp_signal = signal * factor
    return amp_signal 