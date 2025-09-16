import * as R from "react"
import * as RR from "react-router-dom"
import * as Specviz from "@meridian-analytics/specviz"
import type { LoaderData } from "../types"

function supportOpenRegions(old: Specviz.Note.Region): Specviz.Note.Region {
  const { id, x, y, width, height, xunit, yunit, properties, ...splat } = old
  return {
    id,
    x,
    y,
    width,
    height,
    xunit,
    yunit,
    properties: {
      ...splat, // collect splat properties into properties object
      ...properties, // in collision, explicit properties override splat
    },
  }
}

export function LoadRegionsEffect() {
  const note = Specviz.Note.useContext()
  const loaderData = RR.useLoaderData() as LoaderData
  R.useEffect(() => {
    note.reset(
      new Map(
        loaderData.annotations.map((a) => [a.id, supportOpenRegions(a.region)])
      )
    )
  }, [loaderData.annotations, note.reset])
  return <></>
}
