import * as R from "react"
import * as Specviz from "specviz-react"
import * as SchemaContext from "./SchemaContext"

type Context = {
  dispatch: R.Dispatch<Action>
  filters: State
}

type State = FilterState

type Action =
  | { kind: "setFilters"; filters: R.SetStateAction<FilterState> }
  | { kind: "resetFilters" }

type FilterValueString = string | string[]
type FilterValueNumber = number | [null | number, null | number]
type FilterValueBoolean = boolean
type FilterValue = FilterValueString | FilterValueNumber | FilterValueBoolean
type FilterState = Record<string, FilterValue>

export function resetFilters(): Action {
  return { kind: "resetFilters" }
}

export function setFilters(filters: FilterState): Action {
  return { kind: "setFilters", filters }
}

function reducer(state: State, action: Action): State {
  switch (action.kind) {
    case "resetFilters":
      return {}
    case "setFilters":
      return typeof action.filters == "function"
        ? action.filters(state)
        : action.filters
  }
}

const defaultContext: Context = {
  dispatch: () => {
    console.error("dispatch called outside of context")
  },
  filters: {},
}

const Context = R.createContext(defaultContext)

export function Provider(props: { children: R.ReactNode }) {
  const schema = SchemaContext.useContext()
  const [filters, dispatch] = R.useReducer(reducer, defaultContext.filters)

  const filterFn: Specviz.RegionContext.TransformProps["fn"] = R.useMemo(
    () =>
      Specviz.RegionContext.transformFilter((region: Specviz.Region) =>
        Object.entries(schema.schema.properties).every(([key, field]) =>
          filterAuxField(region, key, field, filters),
        ),
      ),
    [schema.schema.properties, filters],
  )

  const value: Context = R.useMemo(() => ({ dispatch, filters }), [filters])

  return (
    <Context.Provider value={value}>
      <Specviz.RegionContext.Transform
        fn={filterFn}
        children={props.children}
      />
    </Context.Provider>
  )
}

export function useContext() {
  return R.useContext(Context)
}

function filterAuxField(
  region: Specviz.Region,
  key: string,
  field: SchemaContext.FieldSchema,
  filters: FilterState,
): boolean {
  if (key in filters) {
    if (key in region) {
      switch (field.type) {
        case "boolean":
          return filterAuxBoolean(
            region[key],
            filters[key] as FilterValueBoolean,
          )
        case "string":
          return filterAuxString(
            region[key],
            rjsfCheckboxesBugfix(filters[key]) as FilterValueString,
          )
        case "number":
          return filterAuxNumber(region[key], filters[key] as FilterValueNumber)
      }
    }
    return false
  }
  return true
}

function filterAuxString(value: unknown, filter: FilterValueString): boolean {
  if (Array.isArray(value) && Array.isArray(filter)) {
    return filter.length == 0 || value.some(v => filter.includes(v))
  }
  if (Array.isArray(value)) {
    return value.includes(filter as string)
  }
  if (Array.isArray(filter)) {
    return filter.length == 0 || filter.includes(value as string)
  }
  return value === filter
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
  return value == filter
}

export function rjsfCheckboxesBugfix(a: unknown) {
  return Array.isArray(a) ? a.filter(Boolean) : a
}
