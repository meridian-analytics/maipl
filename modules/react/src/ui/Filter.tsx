import * as M from "@mui/material"
import type * as R from "react"
import type { useFilter } from "../hooks"

export default function Filter(props: {
  filter: ReturnType<typeof useFilter<Record<string, string>>>
  children: (
    key: string,
    textfield: (
      props: Omit<Parameters<typeof M.TextField>, "disabled">,
    ) => ReturnType<typeof M.TextField>,
  ) => R.ReactNode
}) {
  const { filter, children } = props
  return (
    <>
      {filter.fields.map(key =>
        children(key, props => (
          <M.TextField
            {...props}
            key={key}
            disabled={!filter.enabled}
            placeholder={`${key}...`}
            value={filter.get(key)}
            onChange={e => filter.set(key, e.currentTarget.value)}
          />
        )),
      )}
    </>
  )
}
