import * as R from "react"
import * as RR from "react-router-dom"
import * as M from "@mui/material"
import * as Specviz from "@meridian-analytics/specviz"
import * as AppContext from "../../../AppContext"
import type { LoaderData, ImageType } from "../types"
import {
  NavigatorToolProvider,
  HorizontalAxisToolProvider,
  VerticalAxisToolProvider,
  VisualizationToolProvider,
} from "../providers/ToolProviders"
import { VisualizationLoadingState } from "./VisualizationLoadingState"

interface VisualizationToolProps {
  imageType: ImageType
}

export function VisualizationTool({ imageType }: VisualizationToolProps) {
  const loaderData = RR.useLoaderData() as LoaderData
  const navigation = RR.useNavigation()
  const app = AppContext.useContext()
  const showSelection = app.tool != AppContext.Tool.Move
  const note = Specviz.Note.useContext()
  const [showLoading, setShowLoading] = R.useState(true)

  // Clean up regions only when segment changes
  R.useEffect(() => {
    note.reset(new Map(loaderData.annotations.map((a) => [a.id, a.region])))
  }, [loaderData.annotations, note.reset])

  // Show loading state for 0.5s when navigation starts or segment changes
  R.useEffect(() => {
    if (navigation.state === "loading") {
      setShowLoading(true)
    } else {
      const timer = setTimeout(() => {
        setShowLoading(false)
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [navigation.state, loaderData.active.id])

  // Show loading state during navigation or artificial delay
  if (showLoading) {
    return <VisualizationLoadingState />
  }

  // Create a unique key that changes with both segment and image type
  const visualizationKey = `${loaderData.active.segment.id}-${imageType}`

  const activeImage =
    imageType === "spectrogram"
      ? loaderData.active.spectrogram
      : loaderData.active.waveform

  return (
    <M.Paper
      sx={{
        margin: "0 auto",
        overflow: "hidden",
        padding: "1rem",
        resize: "horizontal",
      }}
    >
      <div
        style={{
          display: "grid",
          gridGap: "1rem",
          gridTemplateColumns: "80px 1fr",
          gridTemplateRows: "40px 300px 20px",
          gridTemplateAreas: `
            ". nav"
            "y spec"
            ". x"
          `,
        }}
      >
        {/* Spectrogram Visualization */}
        <div
          style={{ display: imageType === "spectrogram" ? "contents" : "none" }}
        >
          <Specviz.Plane.Provider xaxis="seconds" yaxis="hertz">
            <div style={{ gridArea: "nav" }}>
              <NavigatorToolProvider>
                <Specviz.Navigator src={loaderData.active.spectrogram.image} />
              </NavigatorToolProvider>
            </div>
            <div style={{ gridArea: "x", overflow: "hidden" }}>
              <HorizontalAxisToolProvider>
                <Specviz.Axis.Horizontal />
              </HorizontalAxisToolProvider>
            </div>
            <div style={{ gridArea: "y", overflow: "hidden" }}>
              <VerticalAxisToolProvider>
                <Specviz.Axis.Vertical />
              </VerticalAxisToolProvider>
            </div>
            <div style={{ gridArea: "spec" }} key={visualizationKey}>
              <VisualizationToolProvider>
                <Specviz.Visualization
                  showSelection={showSelection}
                  src={loaderData.active.spectrogram.image}
                />
              </VisualizationToolProvider>
            </div>
          </Specviz.Plane.Provider>
        </div>

        {/* Waveform Visualization */}
        <div
          style={{ display: imageType === "waveform" ? "contents" : "none" }}
        >
          <Specviz.Viewport.Transform
            fn={(state) => ({
              scroll: { x: state.scroll.x, y: 0 },
              zoom: { x: state.zoom.x, y: 1 },
            })}
          >
            <Specviz.Plane.Provider xaxis="seconds" yaxis="percent">
              <div style={{ gridArea: "nav" }}>
                <NavigatorToolProvider>
                  <Specviz.Navigator src={loaderData.active.waveform.image} />
                </NavigatorToolProvider>
              </div>
              <div style={{ gridArea: "x", overflow: "hidden" }}>
                <HorizontalAxisToolProvider>
                  <Specviz.Axis.Horizontal />
                </HorizontalAxisToolProvider>
              </div>
              <div style={{ gridArea: "y", overflow: "hidden" }}>
                <VerticalAxisToolProvider>
                  <Specviz.Axis.Vertical />
                </VerticalAxisToolProvider>
              </div>
              <div style={{ gridArea: "spec" }} key={visualizationKey}>
                <VisualizationToolProvider>
                  <Specviz.Visualization
                    showSelection={showSelection}
                    src={loaderData.active.waveform.image}
                  />
                </VisualizationToolProvider>
              </div>
            </Specviz.Plane.Provider>
          </Specviz.Viewport.Transform>
        </div>
      </div>
    </M.Paper>
  )
}
