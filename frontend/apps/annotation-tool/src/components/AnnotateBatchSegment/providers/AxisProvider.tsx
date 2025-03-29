import * as R from "react"
import * as RR from "react-router-dom"
import * as Specviz from "@meridian-analytics/specviz"
import * as Format from "@meridian-analytics/specviz/format"
import type { LoaderData } from "../types"

export function AxisProvider(props: { children: R.ReactNode }) {
  const loaderData = RR.useLoaderData() as LoaderData
  const axes: Specviz.Axis.Context = R.useMemo(() => {
    return {
      seconds: Specviz.Axis.time(
        loaderData.active.segment.start,
        loaderData.active.segment.end
      ),
      hertz: Specviz.Axis.nonlinear(
        loaderData.batch.frequency_axis,
        "hertz",
        Format.hz
      ),
      percent: Specviz.Axis.linear(100, -100, "percent", (v) => `${v}%`),
    }
  }, [
    loaderData.active.segment.start,
    loaderData.active.segment.end,
    loaderData.batch.frequency_axis,
  ])
  return <Specviz.Axis.Provider value={axes} children={props.children} />
}
