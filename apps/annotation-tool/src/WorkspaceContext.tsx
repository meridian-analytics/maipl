import * as R from "react"
import type * as Specviz from "specviz-react"
import * as A from "./AnnotationContext"
import * as S from "./SchemaContext"

type Context = {
  dispatch: R.Dispatch<Action>
  filteredRegions: Specviz.Regions
  state: State
}

type State = {
  filters: Filters
  regions: Specviz.Regions
  selection: Specviz.Selection
}

type Action =
  | { kind: "setFilters"; filters: R.SetStateAction<Filters> }
  | { kind: "setRegions"; regions: R.SetStateAction<Specviz.Regions> }
  | { kind: "setSelection"; selection: R.SetStateAction<Specviz.Selection> }
  | { kind: "resetFilters" }

type FilterValueString = string | string[]
type FilterValueNumber = [null | number, null | number]
type FilterValueBoolean = boolean
type FilterValue = FilterValueString | FilterValueNumber | FilterValueBoolean
type Filters = Record<string, FilterValue>

export const actions = {
  resetFilters: (): Action => ({ kind: "resetFilters" }),
  setFilters: (filters: Filters): Action => ({ kind: "setFilters", filters }),
  setRegions: (regions: R.SetStateAction<Specviz.Regions>): Action => ({
    kind: "setRegions",
    regions,
  }),
  setSelection: (selection: R.SetStateAction<Specviz.Selection>): Action => ({
    kind: "setSelection",
    selection,
  }),
}

function reducer(state: State, action: Action): State {
  switch (action.kind) {
    case "resetFilters":
      return { ...state, filters: {} }
    case "setFilters":
      return {
        ...state,
        filters:
          typeof action.filters == "function"
            ? action.filters(state.filters)
            : action.filters,
      }
    case "setRegions":
      return {
        ...state,
        regions:
          typeof action.regions == "function"
            ? action.regions(state.regions)
            : action.regions,
      }
    case "setSelection":
      return {
        ...state,
        selection:
          typeof action.selection == "function"
            ? action.selection(state.selection)
            : action.selection,
      }
  }
}

const defaultContext: Context = {
  dispatch: () => {
    console.error("dispatch called outside of WorkspaceContext")
  },
  filteredRegions: new Map(),
  state: {
    filters: {},
    regions: new Map(),
    selection: new Set(),
  },
}

const WorkspaceContext = R.createContext(defaultContext)

export function WorkspaceContextProvider(props: { children: R.ReactNode }) {
  const ctx = A.useAnnotationContext()
  const { schema } = S.useSchema()
  const [state, dispatch] = R.useReducer(reducer, defaultContext.state, s => ({
    ...s,
    regions: new Map(ctx.annotations.map(a => [a.id, a.region])),
  }))
  const filteredRegions = R.useMemo(() => {
    const m: Specviz.Regions = new Map()
    for (const region of state.regions.values()) {
      if (
        Object.entries(schema.properties).every(([key, field]) =>
          filterAuxField(region, key, field, state.filters),
        )
      ) {
        m.set(region.id, region)
      }
    }
    return m
  }, [state.regions, state.filters, schema])
  return (
    <WorkspaceContext.Provider
      value={{ dispatch, filteredRegions, state }}
      children={props.children}
    />
  )
}

export function useWorkspace() {
  return R.useContext(WorkspaceContext)
}

function filterAuxField(
  region: Specviz.Region,
  key: string,
  field: S.FieldSchema,
  filters: Filters,
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
  if (typeof value != "number" || !Array.isArray(filter)) {
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
