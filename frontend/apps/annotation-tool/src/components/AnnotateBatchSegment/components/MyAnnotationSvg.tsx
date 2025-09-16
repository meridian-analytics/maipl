import * as R from "react"
import * as Specviz from "@meridian-analytics/specviz"
import * as Format from "@meridian-analytics/specviz/format"
import * as AppContext from "../../../AppContext"
import * as RR from "react-router-dom"
import type { LoaderData } from "../types"

export function MyAnnotationSvg(
  props: Specviz.Note.AnnotationProps<AppContext.UserData>
) {
  const [mounted, setMounted] = R.useState(false)
  const loaderData = RR.useLoaderData() as LoaderData
  const navigation = RR.useNavigation()

  R.useEffect(() => {
    // Reset mounted state when navigation starts
    if (navigation.state === "loading") {
      setMounted(false)
    }
    // Set mounted state when navigation is complete and we have region data
    else if (navigation.state === "idle" && props.region) {
      setMounted(true)
    }
  }, [navigation.state, props.region])

  const lines = props.selected
    ? [
        `${props.region?.properties?.label ?? "?"} ${
          props.region?.properties?.score ?? 0
        }`,
        `${Format.timestamp(props.region.x)} - ${Format.timestamp(
          props.region.x + props.region.width
        )}`,
        props.region.yunit == "hertz"
          ? `${Format.hz(props.region.y)} - ${Format.hz(
              props.region.y + props.region.height
            )}`
          : "",
      ]
    : [
        `${props.region?.properties?.label ?? "?"} ${
          props.region?.properties?.score ?? 0
        }`,
      ]
  return (
    <svg {...props.svgProps} key={mounted ? 1 : 0}>
      <rect
        style={{
          width: "100%",
          height: "100%",
          fill: "rgba(66, 66, 66, 0.66)",
          stroke: "rgba(200, 200, 200, 0.66)",
          strokeWidth: "1",
          vectorEffect: "non-scaling-stroke",
        }}
      />
      {lines.map((line, lineno) => (
        <text
          key={String(lineno)}
          x="4"
          y={String(4 + 24 * lineno)}
          style={{
            fill: "rgba(200, 200, 200, 0.66)",
            fontSize: "10pt",
            textAnchor: "start",
            alignmentBaseline: "hanging",
            fontFamily: "monospace",
            mixBlendMode: "difference",
          }}
          children={line}
        />
      ))}
    </svg>
  )
}
