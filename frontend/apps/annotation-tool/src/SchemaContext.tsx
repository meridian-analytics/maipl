/**
 * SchemaContext
 * Maipl only supports a subset of Json Schema
 * Supported features are described by simple zod parsers
 */

import type * as Specviz from "@meridian-analytics/specviz"
import * as JSF from "@rjsf/utils"
import * as R from "react"
import * as Z from "zod"
import * as M from "@mui/material"
import * as MR from "@maipl/react"

export const OptionsSchema = Z.array(
  Z.object({
    const: Z.string(),
    title: Z.string(),
  })
)

export const EnumSchema = Z.object({
  default: Z.string().optional(),
  enum: Z.array(Z.string()),
  title: Z.string().optional(),
  type: Z.literal("string"),
})

export const AnyOfSchema = Z.object({
  anyOf: OptionsSchema,
  default: Z.string().optional(),
  title: Z.string().optional(),
  type: Z.literal("string"),
})

export const OneOfSchema = Z.object({
  default: Z.string().optional(),
  oneOf: OptionsSchema,
  title: Z.string().optional(),
  type: Z.literal("string"),
})

export const NumberSchema = Z.object({
  default: Z.number().optional(),
  maximum: Z.number().optional(),
  minimum: Z.number().optional(),
  multipleOf: Z.number().optional(),
  title: Z.string().optional(),
  type: Z.literal("number"),
})

export const StringSchema = Z.object({
  default: Z.string().optional(),
  title: Z.string().optional(),
  type: Z.literal("string"),
})

export const BooleanSchema = Z.object({
  default: Z.boolean().optional(),
  title: Z.string().optional(),
  type: Z.literal("boolean"),
})

export const FieldSchema = Z.union([
  AnyOfSchema,
  BooleanSchema,
  EnumSchema,
  OneOfSchema,
  NumberSchema,
  StringSchema,
])

export const JsonSchema = Z.object({
  properties: Z.record(FieldSchema),
  type: Z.literal("object"),
})

export const UiSchema = Z.any()

export const MaiplSchema = Z.object({
  schema: JsonSchema,
  uiSchema: UiSchema,
})

export const MaiplSchemaFromJson = Z.preprocess((json) => {
  try {
    return JSON.parse(String(json))
  } catch (err) {
    if (import.meta.env["DEV"]) {
      console.warn("Json parse error. Using default schema", err)
    }
    return {
      schema: defaultContext.schema,
      uiSchema: defaultContext.uiSchema,
    }
  }
}, MaiplSchema)

export type OptionsSchema = Z.infer<typeof OptionsSchema>
export type EnumSchema = Z.infer<typeof EnumSchema>
export type OneOfSchema = Z.infer<typeof OneOfSchema>
export type AnyOfSchema = Z.infer<typeof AnyOfSchema>
export type NumberSchema = Z.infer<typeof NumberSchema>
export type StringSchema = Z.infer<typeof StringSchema>
export type BooleanSchema = Z.infer<typeof BooleanSchema>
export type FieldSchema = Z.infer<typeof FieldSchema>
export type JsonSchema = Z.infer<typeof JsonSchema>
export type UiSchema = Z.infer<typeof UiSchema>
export type MaiplSchema = Z.infer<typeof MaiplSchema>

export type Context = {
  defaults: Map<string, unknown>
  getLabel: (key: unknown | unknown[]) => string
  labels: Map<string, string>
  schema: JsonSchema
  uiSchema: UiSchema
}

const defaultContext: Context = {
  defaults: new Map(),
  getLabel: () => {
    throw Error("lookup called outside ot context provider")
  },
  labels: new Map(),
  schema: {
    properties: {
      label: {
        enum: ["0", "1"],
        title: "Label",
        type: "string",
      },
      score: {
        default: 0,
        maximum: 1,
        minimum: 0,
        title: "Score",
        type: "number",
      },
    },
    type: "object",
  },
  uiSchema: {
    label: {
      "ui:enumNames": ["Zero", "One"],
      "ui:placeholder": "(Unlabeled)",
      "ui:widget": "SelectWidget",
    },
  },
}

const Context = R.createContext(defaultContext)

export type ProviderProps = {
  jsonSchema: string
  children: R.ReactNode
}

export function Provider(props: ProviderProps) {
  const { schema, uiSchema } = R.useMemo<MaiplSchema>(() => {
    try {
      return MaiplSchemaFromJson.parse(props.jsonSchema)
    } catch (err) {
      if (import.meta.env["DEV"]) {
        if (err instanceof Z.ZodError) {
          console.warn("Schema validation errors:", err.errors)
        } else {
          console.warn("Schema parse error:", err)
        }
      }
      return {
        schema: defaultContext.schema,
        uiSchema: defaultContext.uiSchema,
      }
    }
  }, [props.jsonSchema])

  const defaults = R.useMemo<Context["defaults"]>(() => {
    const res: Context["defaults"] = new Map()
    for (const [key, field] of Object.entries(schema.properties)) {
      if ("default" in field) res.set(key, field.default)
    }
    return res
  }, [schema.properties])

  const labels: Context["labels"] = R.useMemo(
    () =>
      new Map(
        Array.from(
          JSF.optionsList(
            schema.properties?.["label"] ?? {},
            uiSchema?.["label"]
          ) ?? [],
          (o) => [o.value, o.label]
        )
      ),
    [schema, uiSchema]
  )
  const getLabel = R.useCallback<Context["getLabel"]>(
    (key) => {
      const ui = JSF.getUiOptions(uiSchema?.["label"])
      return Array.isArray(key)
        ? key.length == 0
          ? ui.placeholder ?? "(Unlabeled)"
          : key
              .map((k) => labels.get(k as string) ?? `(NoLabel ${k})`)
              .join(", ")
        : key === undefined
        ? ui.placeholder ?? "(Unlabeled)"
        : labels.get(key as string) ?? `(NoLabel ${key})`
    },
    [labels, uiSchema]
  )

  // Show notification if using default schema
  const notify = MR.useNotify()
  const hasShownNotification = R.useRef(false)

  R.useEffect(() => {
    if (schema === defaultContext.schema && !hasShownNotification.current) {
      hasShownNotification.current = true
      try {
        // Try to parse the schema to get validation errors
        MaiplSchemaFromJson.parse(props.jsonSchema)
      } catch (err) {
        if (err instanceof Z.ZodError) {
          notify(
            (onClose) => (
              <M.Alert
                severity="warning"
                onClose={onClose}
                sx={{
                  "& .MuiAlert-message": {
                    width: "100%",
                  },
                }}
                action={
                  <M.Button color="inherit" size="small" onClick={onClose}>
                    Dismiss
                  </M.Button>
                }
              >
                <M.Typography variant="subtitle1" gutterBottom>
                  Invalid Schema Configuration
                </M.Typography>
                <M.Typography variant="body2" paragraph>
                  The provided schema did not pass validation. The system is
                  using the default schema. Here are the validation errors:
                </M.Typography>
                <M.List dense>
                  {err.errors.map((error, index) => (
                    <M.ListItem key={index}>
                      <M.ListItemText
                        primary={error.path.join(".")}
                        secondary={error.message}
                      />
                    </M.ListItem>
                  ))}
                </M.List>
                <M.Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 2 }}
                >
                  Using default schema with the following fields:
                </M.Typography>
                <M.List dense>
                  <M.ListItem>
                    <M.ListItemText
                      primary="label"
                      secondary="String field with options: Zero, One"
                    />
                  </M.ListItem>
                  <M.ListItem>
                    <M.ListItemText
                      primary="score"
                      secondary="Number field (read-only) with range: 0 to 1"
                    />
                  </M.ListItem>
                </M.List>
                <M.Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 2 }}
                >
                  Please check the schema documentation for valid configuration
                  options.
                </M.Typography>
              </M.Alert>
            ),
            { autoHideDuration: 30000 }
          )
        } else {
          // Handle non-Zod errors
          notify(
            (onClose) => (
              <M.Alert
                severity="warning"
                onClose={onClose}
                sx={{
                  "& .MuiAlert-message": {
                    width: "100%",
                  },
                }}
                action={
                  <M.Button color="inherit" size="small" onClick={onClose}>
                    Dismiss
                  </M.Button>
                }
              >
                <M.Typography variant="subtitle1" gutterBottom>
                  Schema Configuration Error
                </M.Typography>
                <M.Typography variant="body2" paragraph>
                  There was an error parsing the schema configuration. The
                  system is using the default schema.
                </M.Typography>
                <M.Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 2 }}
                >
                  Using default schema with the following fields:
                </M.Typography>
                <M.List dense>
                  <M.ListItem>
                    <M.ListItemText
                      primary="label"
                      secondary="String field with options: Zero, One"
                    />
                  </M.ListItem>
                  <M.ListItem>
                    <M.ListItemText
                      primary="score"
                      secondary="Number field (read-only) with range: 0 to 1"
                    />
                  </M.ListItem>
                </M.List>
                <M.Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 2 }}
                >
                  Please check the schema documentation for valid configuration
                  options.
                </M.Typography>
              </M.Alert>
            ),
            { autoHideDuration: 30000 }
          )
        }
      }
    }
  }, [schema, notify, props.jsonSchema])

  return (
    <Context.Provider
      children={props.children}
      value={{
        defaults,
        getLabel,
        labels,
        schema,
        uiSchema,
      }}
    />
  )
}

export function useContext() {
  return R.useContext(Context)
}

export function deriveFilterUiSchema(
  schema: JsonSchema,
  uiSchema: UiSchema
): UiSchema {
  return {
    ...uiSchema,
    ...objectFlatMap(schema.properties, ([key, field]) => {
      switch (field.type) {
        case "boolean": {
          return [[key, { "ui:widget": "CheckboxesWidget" }]]
        }
        case "string": {
          if ("enum" in field || "anyOf" in field || "oneOf" in field) {
            const ui = uiSchema?.[key]
            return [
              [
                key,
                {
                  "ui:widget": "EnumWidget",
                  "ui:placeholder": ui?.["ui:placeholder"],
                  "ui:enumNames": ui?.["ui:enumNames"],
                },
              ],
            ]
          }
          return []
        }
        case "number": {
          return [[key, { "ui:widget": "NumberMinMaxWidget" }]]
        }
        default: {
          return []
        }
      }
    }),
  }
}

export function deriveMonoFormUiSchema(
  schema: JsonSchema,
  uiSchema: UiSchema
): UiSchema {
  return {
    ...uiSchema,
    score: {
      "ui:readonly": true,
      ...uiSchema.score,
    },
  }
}

export function derivePolyFormUiSchema(
  schema: JsonSchema,
  uiSchema: UiSchema
): UiSchema {
  return {
    ...uiSchema,
    ...objectFlatMap(schema.properties, ([key, field]) => {
      switch (field.type) {
        case "boolean":
          return [[key, { "ui:widget": "SelectWidget" }]]
        default:
          return []
      }
    }),
  }
}

export function derivePolyFormData(
  schema: JsonSchema,
  regions: Specviz.Note.RegionState,
  selection: Specviz.Note.SelectionState
): Record<string, unknown> {
  const m: Map<string, unknown> = new Map()
  const undef = Symbol()
  const mixed = Symbol()
  for (const r of regions.values()) {
    if (selection.has(r.id)) {
      for (const k of Object.keys(schema.properties)) {
        const v1 = r.properties?.[k] ?? undef
        const v2 = m.get(k)
        if (v2 === undefined) {
          m.set(k, v1)
        } else if (Array.isArray(v1) && Array.isArray(v2)) {
          m.set(k, Array.from(new Set(v1).intersection(new Set(v2))))
        } else if (v1 != v2) {
          m.set(k, mixed)
        }
        // else v == v2, do nothing
      }
    }
  }
  for (const [k, v] of m) {
    if (v == undef || v == mixed || (Array.isArray(v) && v.length == 0)) {
      m.delete(k)
    }
  }
  return Object.fromEntries(m)
}

export function deriveSchemaWithoutDefaults({
  default: _,
  ...schema
}: JSF.RJSFSchema): JSF.RJSFSchema {
  switch (typeof schema.properties) {
    case "object":
      return {
        ...schema,
        properties: Object.fromEntries(
          Object.entries(schema.properties).map(([key, field]) => [
            key,
            deriveSchemaWithoutDefaults(field as JSF.RJSFSchema),
          ])
        ),
      }
    default:
      return schema
  }
}

function objectFlatMap<A, B>(
  object: Record<string, A>,
  fn: (entry: [string, A]) => Array<[string, B]>
): Record<string, B> {
  return Object.fromEntries(
    Object.entries(object).flatMap((entry) => fn(entry))
  )
}
