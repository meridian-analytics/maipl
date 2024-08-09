/**
 * SchemaContext
 * Maipl only supports a subset of Json Schema
 * Supported features are described by simple zod parsers
 */

import type * as JSF from "@rjsf/utils"
import * as R from "react"
import type * as Specviz from "specviz-react"
import * as Z from "zod"

export const OptionsSchema = Z.array(
  Z.object({
    const: Z.string(),
    title: Z.string(),
  }),
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

export const MaiplSchemaFromJson = Z.preprocess(json => {
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
  getLabel: (key: unknown | unknown[]) => string
  labels: Map<string, string>
  schema: JsonSchema
  uiSchema: UiSchema
}

const defaultContext: Context = {
  getLabel: () => {
    throw Error("lookup called outside ot context provider")
  },
  labels: new Map(),
  schema: {
    properties: {
      label: {
        oneOf: [
          { const: "0", title: "0" },
          { const: "1", title: "1" },
        ],
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
  uiSchema: {},
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
        console.warn("SchemaContext parse error. Using default schema", err)
      }
      return {
        schema: defaultContext.schema,
        uiSchema: defaultContext.uiSchema,
      }
    }
  }, [props.jsonSchema])
  const labels = R.useMemo<Context["labels"]>(() => {
    const res: Context["labels"] = new Map()
    const label = schema.properties["label"]
    if (label) {
      if ("oneOf" in label) {
        for (const m of label.oneOf) {
          res.set(m.const, m.title)
        }
      } else if ("anyOf" in label) {
        for (const m of label.anyOf) {
          res.set(m.const, m.title)
        }
      } else if ("enum" in label)
        for (const m of label.enum) {
          res.set(m, m)
        }
    }
    return res
  }, [schema])
  const getLabel = R.useCallback<Context["getLabel"]>(
    key =>
      Array.isArray(key)
        ? key.length == 0
          ? "(Unlabeled)"
          : key.map(k => labels.get(k as string) ?? `(NoLabel ${k})`).join(", ")
        : labels.get(key as string) ?? `(NoLabel ${key})`,
    [labels],
  )
  const value = R.useMemo<Context>(
    () => ({ getLabel, labels, schema, uiSchema }),
    [getLabel, labels, schema, uiSchema],
  )
  return <Context.Provider value={value} children={props.children} />
}

export function useContext() {
  return R.useContext(Context)
}

export function deriveFilterUiSchema(
  schema: JsonSchema,
  uiSchema: UiSchema,
): UiSchema {
  return {
    ...uiSchema,
    ...objectFlatMap(schema.properties, ([key, field]) => {
      switch (field.type) {
        case "boolean":
          return [[key, { "ui:widget": "CheckboxesWidget" }]]
        case "string":
          if ("enum" in field || "anyOf" in field || "oneOf" in field)
            return [[key, { "ui:widget": "CheckboxesWidget" }]]
          return []
        case "number":
          return [[key, { "ui:widget": "NumberMinMaxWidget" }]]
        default:
          return []
      }
    }),
  }
}

export function deriveMonoFormUiSchema(
  schema: JsonSchema,
  uiSchema: UiSchema,
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
  uiSchema: UiSchema,
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
  regions: Specviz.RegionState,
  selection: Specviz.SelectionState,
): Record<string, Specviz.RegionValue> {
  const m: Map<string, Specviz.RegionValue> = new Map()
  for (const r of regions.values()) {
    if (selection.has(r.id)) {
      for (const k of Object.keys(schema.properties)) {
        const v1 = r[k]
        if (v1 == null) continue
        const v2 = m.get(k)
        if (v2 == null) {
          m.set(k, v1)
        } else if (Array.isArray(v1) && Array.isArray(v2)) {
          m.set(k, Array.from(new Set(v1).intersection(new Set(v2))))
        } else if (v1 !== v2) {
          m.set(k, "")
        }
        // else v == v2, do nothing
      }
    }
  }
  for (const [k, v] of m) {
    if ((Array.isArray(v) && v.length == 0) || v == "") {
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
          ]),
        ),
      }
    default:
      return schema
  }
}

function objectFlatMap<A, B>(
  object: Record<string, A>,
  fn: (entry: [string, A]) => Array<[string, B]>,
): Record<string, B> {
  return Object.fromEntries(Object.entries(object).flatMap(entry => fn(entry)))
}
