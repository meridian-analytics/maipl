def adjust_range(array, min_value=0, max_value=1):
    """Normalize array values to specified range.
    
    Used to scale audio and spectrogram data for visualization.
    
    Args:
        array: Input array to normalize
        min_value: Target minimum value
        max_value: Target maximum value
        
    Returns:
        Normalized array with values between min_value and max_value
    """
    adjusted_array = min_value + \
        (array - array.min()) * (max_value -
                                 min_value) / (array.max() - array.min())
    return adjusted_array 