import { RJSFSchema, UiSchema } from "@rjsf/utils"

export const schema: RJSFSchema = {
  type: "object",
  required: ["freq_max", "freq_min", "step_size", "window_length"],
  properties: {
    window_length: {
      default: 0.051,
      title: "Window length(s)",
      type: "number",
    },
    step_size: {
      default: 0.01955,
      title: "Step size(s)",
      type: "number",
    },
    freq_min: {
      default: 0,
      title: "Frequency min(Hz)",
      type: "integer",
    },
    freq_max: {
      default: 10000,
      title: "Frequency max(Hz)",
      type: "integer",
    },
    rate: {
      default: 24000,
      title: "Rate(Hz)",
      type: "integer",
    },
    vmin: {
      default: 0,
      maximum: 1,
      minimum: 0,
      multipleOf: 0.1,
      title: "vmin",
      type: "integer",
    },
    vmax: {
      default: 1,
      maximum: 1,
      minimum: 0,
      multipleOf: 0.1,
      title: "vmax",
      type: "integer",
    },
    amplification: {
      default: 1,
      maximum: 5,
      minimum: 1,
      multipleOf: 0.1,
      title: "Amplification",
      type: "integer",
    },
    channel: {
      default: 0,
      enum: [0, 1, 2],
      title: "Channel",
      type: "integer",
    },
    low_pass: {
      title: "Low Pass(Hz)",
      type: "integer",
    },
    high_pass: {
      title: "High Pass(Hz)",
      type: "integer",
    },
    color_map: {
      default: "viridis",
      enum: ["magma", "viridis"],
      title: "Color Map",
      type: "string",
    },
    type: {
      default: "MagSpectrogram",
      enum: ["MagSpectrogram"],
      title: "Type",
      type: "string",
    },
  },
}

export const uiSchema: UiSchema = {
  amplification: {
    "ui:widget": "range",
  },
  vmax: {
    "ui:widget": "range",
  },
  vmin: {
    "ui:widget": "range",
  },
}
