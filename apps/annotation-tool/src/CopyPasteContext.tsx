import * as Specviz from "@meridian-analytics/specviz"
import * as React from "react"
import * as SchemaContext from "./SchemaContext"

export type Context = {
  fields: Set<string>
  copy?: () => void
  paste?: () => void
  setField: (field: string, checked: boolean) => void
}

export function Provider(props: { children: React.ReactNode }) {
  const { schema } = SchemaContext.useContext()
  const [state, setState] = React.useState<State>(() => ({
    clipboard: emptyClipboard,
    fields: new Set(Object.keys(schema.properties)),
  }))
  const note = Specviz.Note.useContext()
  const size = note.selection.size
  const ids = Array.from(note.selection)
  const id = ids[0]
  const region = id == null ? undefined : note.regions.get(id)
  const copy: Context["copy"] = React.useMemo(
    () =>
      size != 1 || region == null
        ? undefined
        : () =>
            setState(prev => ({
              clipboard: region.properties ?? emptyClipboard,
              fields: prev.fields,
            })),
    [region, size],
  )
  const paste: Context["paste"] = React.useMemo(
    () =>
      state.clipboard == emptyClipboard || size == 0 || state.fields.size == 0
        ? undefined
        : () =>
            note.updateProperties(note.selection, prev =>
              updateProperties(prev ?? {}, state.fields, state.clipboard),
            ),
    [
      note.updateProperties,
      note.selection,
      size,
      state.clipboard,
      state.fields,
    ],
  )
  const setField: Context["setField"] = React.useCallback(
    (field, checked) =>
      setState(prev => {
        const next = new Set(prev.fields)
        if (checked) next.add(field)
        else next.delete(field)
        return { clipboard: prev.clipboard, fields: next }
      }),
    [],
  )
  return (
    <Context.Provider
      children={props.children}
      value={{ copy, fields: state.fields, paste, setField }}
    />
  )
}

export function useContext() {
  return React.useContext(Context)
}

// internals
type State = {
  clipboard: Specviz.Note.Properties
  fields: Set<string>
}

const emptyClipboard: Specviz.Note.Properties = {}

const defaultContext: Context = {
  fields: new Set(),
  copy() {
    throw Error("copy called outside of context")
  },
  paste() {
    throw Error("paste called outside of context")
  },
  setField() {
    throw Error("toggleField called outside of context")
  },
}

const Context = React.createContext(defaultContext)

function updateProperties(
  props: Specviz.Note.Properties,
  fields: Set<string>,
  clipboardData: Record<string, unknown>,
) {
  const next = { ...props }
  for (const key of fields) {
    const v = clipboardData[key]
    if (v === null) delete next[key]
    else next[key] = v
  }
  return next
}
