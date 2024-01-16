import * as R from "react"

type t_use_filter_state = Record<string, string>

type t_use_filter<T extends t_use_filter_state> = {
  state: t_use_filter_state
  fields: Array<keyof T>
  get: (key: keyof T) => string
  set: (key: keyof T, value: string) => void
  enabled: boolean
  toggle: () => void
  clear: () => void
}

export default function useFilter<T extends t_use_filter_state>(
  initFilter: T,
  initEnabled = true,
): t_use_filter<T> {
  const [state, setState] = R.useState(initFilter)
  const [enabled, setEnabled] = R.useState(initEnabled)
  return R.useMemo(
    () => ({
      state,
      fields: Object.keys(initFilter),
      get: key => (enabled ? state[key] : ""),
      set: (key, value) => setState({ ...state, [key]: value }),
      enabled,
      toggle: () => setEnabled(!enabled),
      clear: () => setState(initFilter),
    }),
    [enabled, initFilter, state],
  )
}
