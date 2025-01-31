import matplotlib.pyplot as plt
from ..utils.array_ops import adjust_range  # Import from utils


def setup_figure(width_pixels, height_pixels, dpi):
    """Set up matplotlib figure with exact pixel dimensions.
    
    Args:
        width_pixels: Desired width in pixels
        height_pixels: Desired height in pixels
        dpi: Dots per inch for the figure
        
    Returns:
        fig: matplotlib Figure object
        ax: matplotlib Axes object
    """
    # Create figure with pixel dimensions
    fig = plt.figure(dpi=dpi)
    # Set size in pixels by converting to inches
    fig.set_size_inches(width_pixels/dpi, height_pixels/dpi)
    
    # Create axis that fills the whole figure
    ax = plt.Axes(fig, [0., 0., 1., 1.])
    ax.set_axis_off()
    fig.add_axes(ax)
    
    return fig, ax


def save_figure(fig, output_path, dpi):
    """Save figure with exact pixel dimensions.
    
    Args:
        fig: matplotlib Figure object
        output_path: Path to save the image
        dpi: Dots per inch for output
    """
    plt.savefig(output_path, 
                dpi=dpi,
                bbox_inches='tight',
                pad_inches=0,
                format='png')  # Specify PNG format for exact pixels
    plt.close(fig) 