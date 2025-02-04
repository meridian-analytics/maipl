import type * as Specviz from "@meridian-analytics/specviz"
import * as R from "react"

export type UserData = {
  comments?: string
  label?: string
  score?: number
  user_id?: number
}

export type Context = {
  tool: Tool
  focus: null | Specviz.Note.Region["id"]
  setFocus: R.Dispatch<R.SetStateAction<Context["focus"]>>
  setTool: R.Dispatch<R.SetStateAction<Context["tool"]>>
}

export enum Tool {
  Annotate = "annotate",
  Select = "select",
  Zoom = "zoom",
  Move = "move",
}

const defaultContext: Context = {
  tool: Tool.Annotate,
  focus: null,
  setFocus: () => {
    throw Error("setFocus called outside of context")
  },
  setTool: () => {
    throw Error("setTool called outside of context")
  },
}

export type ProviderProps = {
  children: R.ReactNode
}

const Context = R.createContext(defaultContext)

export const useContext = () => R.useContext(Context)

export function Provider(props: ProviderProps) {
  const [tool, setTool] = R.useState<Context["tool"]>(defaultContext.tool)
  const [focus, setFocus] = R.useState<Context["focus"]>(defaultContext.focus)
  return (
    <Context.Provider
      children={props.children}
      value={{ tool, focus, setFocus, setTool }}
    />
  )
}
