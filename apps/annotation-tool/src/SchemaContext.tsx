/**
 * SchemaContext
 * Maipl only supports a subset of Json Schema
 * Supported features are described by simple zod parsers
 */

import * as R from "react"
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
    return defaultContext
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
