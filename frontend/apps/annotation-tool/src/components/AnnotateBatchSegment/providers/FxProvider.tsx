import * as R from "react"
import * as Specviz from "@meridian-analytics/specviz"
import * as AppContext from "../../../AppContext"
import * as SpecvizNote from "@meridian-analytics/specviz/note"
import * as RR from "react-router-dom"
import type { LoaderData } from "../types"

export function FxProvider(props: { children: React.ReactNode }) {
  const app = AppContext.useContext()
  const note = SpecvizNote.useContext()
  const loaderData = RR.useLoaderData() as LoaderData
  const fn: Specviz.Audio.TransformFxProps["fn"] = R.useCallback(
    (fxContext) => {
      const target = app.focus ? note.regions.get(app.focus) ?? null : null
      return target == null
        ? fxContext
        : {
            hpf: target.yunit === "hertz" ? target.y : undefined,
            lpf:
              target.yunit === "hertz" ? target.y + target.height : undefined,
            loop: [
              target.x - loaderData.active.segment.start,
              target.x + target.width - loaderData.active.segment.start,
            ],
          }
    },
    [app.focus, note.regions, loaderData.active.segment.start]
  )
  return <Specviz.Audio.TransformFx children={props.children} fn={fn} />
}
