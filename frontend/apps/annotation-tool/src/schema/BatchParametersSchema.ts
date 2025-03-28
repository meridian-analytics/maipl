import type { RJSFSchema, UiSchema } from "@rjsf/utils"

export const MagSpectrogramSchema: RJSFSchema = {
  type: "object",
  required: ["freq_max", "freq_min", "step_size", "window_length"],
  properties: {
    window_length: {
      default: 0.051,
      title: "Window length(s)",
      description: "Window size in seconds for the spectrogram computation",
      type: "number",
    },
    step_size: {
      default: 0.01955,
      title: "Step size(s)",
      description: "Step size in seconds between consecutive windows",
      type: "number",
    },
    freq_min: {
      default: 0,
      title: "Frequency min(Hz)",
      description: "Lower frequency bound in Hz for the spectrogram",
      type: "integer",
    },
    freq_max: {
      default: 10000,
      title: "Frequency max(Hz)",
      description: "Upper frequency bound in Hz for the spectrogram",
      type: "integer",
    },
    rate: {
      default: 24000,
      title: "Rate(Hz)",
      description:
        "Desired sampling rate in Hz. If not specified, original sampling rate will be used",
      type: "integer",
    },
    vmin: {
      default: 0,
      maximum: 1,
      minimum: 0,
      multipleOf: 0.1,
      title: "vmin",
      description:
        "Minimum value for color scaling in the spectrogram visualization",
      type: "integer",
    },
    vmax: {
      default: 1,
      maximum: 1,
      minimum: 0,
      multipleOf: 0.1,
      title: "vmax",
      description:
        "Maximum value for color scaling in the spectrogram visualization",
      type: "integer",
    },
    amplification: {
      default: 1,
      maximum: 5,
      minimum: 1,
      multipleOf: 0.1,
      title: "Amplification",
      description: "Amplification factor applied to the spectrogram values",
      type: "integer",
    },
    channel: {
      default: 0,
      enum: [0, 1, 2],
      title: "Channel",
      description:
        "Audio channel to process. Only relevant for stereo recordings",
      type: "integer",
    },
    low_pass: {
      title: "Low Pass(Hz)",
      description: "Low-pass filter cutoff frequency in Hz",
      type: "integer",
      default: 0,
    },
    high_pass: {
      title: "High Pass(Hz)",
      description: "High-pass filter cutoff frequency in Hz",
      type: "integer",
      default: 0,
    },
    color_map: {
      default: "viridis",
      enum: ["magma", "viridis"],
      title: "Color Map",
      description: "Color scheme used for spectrogram visualization",
      type: "string",
    },
    type: {
      type: "string",
      default: "MagSpectrogram",
    },
  },
}

export const MagSpectrogramUiSchema: UiSchema = {
  amplification: {
    "ui:widget": "range",
  },
  vmax: {
    "ui:widget": "range",
  },
  vmin: {
    "ui:widget": "range",
  },
  type: {
    "ui:widget": "hidden",
  },
}

export const MelSpectrogramSchema: RJSFSchema = {
  type: "object",
  required: ["window_length", "step_size"],
  properties: {
    window_length: {
      default: 0.2,
      title: "Window length(s)",
      description: "Window size in seconds",
      type: "number",
    },
    step_size: {
      default: 0.01,
      title: "Step size(s)",
      description: "Step size in seconds",
      type: "number",
    },
    freq_min: {
      default: 0,
      title: "Frequency min(Hz)",
      description: "Lower frequency bound in Hz for the spectrogram",
      type: "integer",
    },
    freq_max: {
      default: 12000,
      title: "Frequency max(Hz)",
      description: "Upper frequency bound in Hz for the spectrogram",
      type: "integer",
    },
    vmin: {
      default: 0,
      maximum: 1,
      minimum: 0,
      multipleOf: 0.1,
      title: "vmin",
      description:
        "Minimum value for color scaling in the spectrogram visualization",
      type: "integer",
    },
    vmax: {
      default: 1,
      maximum: 1,
      minimum: 0,
      multipleOf: 0.1,
      title: "vmax",
      description:
        "Maximum value for color scaling in the spectrogram visualization",
      type: "integer",
    },
    amplification: {
      default: 1,
      maximum: 5,
      minimum: 1,
      multipleOf: 0.1,
      title: "Amplification",
      description: "Amplification factor applied to the spectrogram values",
      type: "integer",
    },
    channel: {
      default: 0,
      title: "Channel",
      description: "Channel to read from. Only relevant for stereo recordings",
      type: "integer",
    },
    rate: {
      default: 24000,
      title: "Rate(Hz)",
      description: "Desired sampling rate in Hz",
      type: "integer",
    },
    window_func: {
      default: "hamming",
      enum: ["bartlett", "blackman", "hamming", "hanning"],
      title: "Window Function",
      description: "Window function to use for the spectrogram",
      type: "string",
    },
    num_filters: {
      default: 400,
      title: "Number of Filters",
      description: "The number of filters in the filter bank",
      type: "integer",
      minimum: 1,
    },
    normalize_wav: {
      default: false,
      title: "Normalize Waveform",
      description: "Normalize the waveform to have mean=0 and std=1",
      type: "boolean",
    },
    resample_method: {
      default: "scipy",
      enum: ["kaiser_best", "kaiser_fast", "scipy", "polyphase"],
      title: "Resample Method",
      description: "Method used for resampling when rate is specified",
      type: "string",
    },
    smooth: {
      default: 0.01,
      title: "Smooth",
      description:
        "Width in seconds of the smoothing region for stitching audio files",
      type: "number",
      minimum: 0,
    },
    low_pass: {
      title: "Low Pass(Hz)",
      description: "Low-pass filter cutoff frequency in Hz",
      type: "integer",
      default: 0,
    },
    high_pass: {
      title: "High Pass(Hz)",
      description: "High-pass filter cutoff frequency in Hz",
      type: "integer",
      default: 0,
    },
    color_map: {
      default: "viridis",
      enum: ["magma", "viridis"],
      title: "Color Map",
      description: "Color scheme used for spectrogram visualization",
      type: "string",
    },
    type: {
      type: "string",
      default: "MelSpectrogram",
    },
  },
}

export const MelSpectrogramUiSchema: UiSchema = {
  normalize_wav: {
    "ui:widget": "checkbox",
  },
  window_func: {
    "ui:widget": "select",
  },
  resample_method: {
    "ui:widget": "select",
  },
  type: {
    "ui:widget": "hidden",
  },
  vmax: {
    "ui:widget": "range",
  },
  vmin: {
    "ui:widget": "range",
  },
  amplification: {
    "ui:widget": "range",
  },
}
