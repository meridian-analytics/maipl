/**
 * SchemaContext
 * Maipl only supports a subset of Json Schema
 * Supported features are described by simple zod parsers
 */

import { Batch } from "@maipl/api"
import * as R from "react"
import * as Z from "zod"

export const OptionsSchema = Z.array(
  Z.object({
    const: Z.string(),
    title: Z.string(),
  }),
)

export const EnumSchema = Z.object({
  enum: Z.array(Z.string()),
  title: Z.string().optional(),
  type: Z.literal("string"),
})

export const AnyOfSchema = Z.object({
  anyOf: OptionsSchema,
  title: Z.string().optional(),
  type: Z.literal("string"),
})

export const OneOfSchema = Z.object({
  oneOf: OptionsSchema,
  title: Z.string().optional(),
  type: Z.literal("string"),
})

export const NumberSchema = Z.object({
  maximum: Z.number().optional(),
  minimum: Z.number().optional(),
  multipleOf: Z.number().optional(),
  title: Z.string().optional(),
  type: Z.literal("number"),
})

export const StringSchema = Z.object({
  title: Z.string().optional(),
  type: Z.literal("string"),
})

export const FieldSchema = Z.union([
  AnyOfSchema,
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
    if (import.meta.env.DEV) {
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
export type FieldSchema = Z.infer<typeof FieldSchema>
export type JsonSchema = Z.infer<typeof JsonSchema>
export type UiSchema = Z.infer<typeof UiSchema>
export type MaiplSchema = Z.infer<typeof MaiplSchema>

const defaultContext: MaiplSchema = {
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

const SchemaContext = R.createContext<MaiplSchema>(defaultContext)

export function SchemaContextProvider(props: {
  batch: Batch.t
  children: R.ReactNode
}) {
  const schema = R.useMemo<MaiplSchema>(() => {
    try {
      return MaiplSchemaFromJson.parse(props.batch.annotation_file_text)
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn("SchemaContext parse error. Using default schema", err)
      }
      return defaultContext
    }
  }, [props.batch.annotation_file_text])
  return <SchemaContext.Provider value={schema} children={props.children} />
}

export function useSchema() {
  return R.useContext(SchemaContext)
}

type UseLabelsHook = {
  lookup: (key: string | string[]) => string
}

export function useLabels(): UseLabelsHook {
  const { schema } = useSchema()
  const labels = R.useMemo(() => {
    const res: Map<string, string> = new Map()
    if (schema.properties.label) {
      if ("oneOf" in schema.properties.label) {
        for (const m of schema.properties.label.oneOf) {
          res.set(m.const, m.title)
        }
      } else if ("anyOf" in schema.properties.label) {
        for (const m of schema.properties.label.anyOf) {
          res.set(m.const, m.title)
        }
      }
    }
    return res
  }, [schema])
  const lookup = R.useCallback(
    (key: string | string[]) =>
      typeof key == "object"
        ? key.map(k => labels.get(k) ?? `(NoLabel ${k})`).join(", ")
        : labels.get(key) ?? `(NoLabel ${key})`,
    [labels],
  )
  return { lookup }
}
