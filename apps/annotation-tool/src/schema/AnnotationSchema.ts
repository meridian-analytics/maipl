import { RJSFSchema, UiSchema } from "@rjsf/utils"

export const schema: RJSFSchema = {
  type: "object",
  required: ["call_type", "confidence", "species"],
  properties: {
    species: {
      items: {
        enum: ["Bird", "Insect", "Mammal", "Other"],
        type: "string",
      },
      title: "Species",
      type: "array",
      uniqueItems: true,
    },
    call_type: {
      enum: ["A", "B", "C"],
      title: "Call Type",
      type: "string",
    },
    confidence: {
      default: 3,
      maximum: 5,
      minimum: 1,
      multipleOf: 1,
      title: "Confidence",
      type: "integer",
    },
    comments: {
      size: "small",
      title: "Comments",
      type: "string",
    },
  },
}

export const uiSchema: UiSchema = {
  species: {
    "ui:widget": "checkboxes",
    "ui:options": {
      inline: true,
    },
  },
  call_type: {
    "ui:widget": "select",
  },
  confidence: {
    "ui:widget": "range",
  },
  "ui:submitDisabled": true,
}
