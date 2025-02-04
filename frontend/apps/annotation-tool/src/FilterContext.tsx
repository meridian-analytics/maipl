import type * as Specviz from "@meridian-analytics/specviz"
import * as R from "react"
import * as SchemaContext from "./SchemaContext"

type Context = {
  filters: State
  setFilters: R.Dispatch<R.SetStateAction<Context["filters"]>>
  resetFilters: () => void
  filterFn?: Specviz.Note.FilterFn
}

type State = Record<string, FilterValue>

type FilterValueString = string | string[]
type FilterValueNumber = number | [null | number, null | number]
type FilterValueBoolean = boolean | boolean[]
type FilterValue = FilterValueString | FilterValueNumber | FilterValueBoolean

const defaultContext: Context = {
  filters: {},
  resetFilters() {
    throw Error("resetFilters called outside of context")
  },
  setFilters() {
    throw Error("setFilters called outside of context")
  },
}

const Context = R.createContext(defaultContext)

const emptyState: State = {}

function objectIsEmpty(obj: Record<string, unknown>): boolean {
  for (const _ in obj) return false
  return true
}

export function Provider(props: { children: R.ReactNode }) {
  const schema = SchemaContext.useContext()
  const [state, internalSetState] = R.useState(emptyState)
  const setFilters: Context["setFilters"] = R.useCallback(
    fn =>
      internalSetState(prev => {
        const next = typeof fn == "function" ? fn(prev) : fn
        if (Object.is(next, prev)) return prev
        if (objectIsEmpty(next)) return emptyState
        return next
      }),
    [],
  )
  const resetFilters: Context["resetFilters"] = R.useCallback(
    () => internalSetState(emptyState),
    [],
  )
  const filterFn: Specviz.Note.FilterFn = R.useCallback(
    region =>
      Object.entries(schema.schema.properties).every(([key, field]) =>
        filterAuxField(region.properties ?? {}, key, field, state),
      ),
    [schema.schema.properties, state],
  )
  return (
    <Context.Provider
      children={props.children}
      value={{
        filters: state,
        filterFn: state == emptyState ? undefined : filterFn,
        resetFilters,
        setFilters,
      }}
    />
  )
}

export function useContext() {
  return R.useContext(Context)
}

function filterAuxField(
  properties: Specviz.Note.Properties,
  key: string,
  field: SchemaContext.FieldSchema,
  filters: State,
): boolean {
  const f: undefined | FilterValue = filters[key]
  if (f == null) return true
  const p = properties?.[key]
  switch (field.type) {
    case "boolean":
      return filterAuxBoolean(p, f as FilterValueBoolean)
    case "string":
      return filterAuxString(p, f as FilterValueString)
    case "number":
      return filterAuxNumber(p, f as FilterValueNumber)
  }
}

function filterAuxString(value: unknown, filter: FilterValueString): boolean {
  if (Array.isArray(value) && Array.isArray(filter)) {
    return filter.length == 0 || value.some(v => filter.includes(v))
  }
  if (Array.isArray(value)) {
    return filter == "" || value.includes(filter as string)
  }
  if (Array.isArray(filter)) {
    return (
      filter.length == 0 ||
      filter.includes(value == null ? "" : (value as string))
    )
  }
  return value == filter
}

function filterAuxNumber(value: unknown, filter: FilterValueNumber): boolean {
  // when schema contains a default value, the initial filter is the default value
  // this means the filter has not been set by the user, so value should not be filtered
  if (!Array.isArray(filter)) {
    return true
  }
  if (typeof value != "number") {
    return false
  }
  if (filter[0] != null && value < filter[0]) {
    return false
  }
  if (filter[1] != null && value > filter[1]) {
    return false
  }
  return true
}

function filterAuxBoolean(value: unknown, filter: FilterValueBoolean): boolean {
  if (!Array.isArray(filter)) {
    return true
  }
  return filter.length == 0 || filter.includes(value as boolean)
}

export function rjsfCheckboxesBugfix(a?: FilterValueString) {
  return Array.isArray(a) ? a.filter(v => v !== undefined) : a
}
