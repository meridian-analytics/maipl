import * as R from "react"

export default function useDebounce<T>(value: T, delay?: number): T {
  const [state, setState] = R.useState<T>(value)
  R.useEffect(() => {
    const t = setTimeout(() => setState(value), delay ?? 333)
    return () => {
      clearTimeout(t)
    }
  }, [value, delay])
  return state
}
