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

  // Handle region reset and loading state
  R.useEffect(() => {
    // Show loading state
    setShowLoading(true)

    // Reset regions
    note.reset(new Map(loaderData.annotations.map((a) => [a.id, a.region])))

    // Only use timer for local data switches
    if (navigation.state !== "loading") {
      const timer = setTimeout(() => {
        setShowLoading(false)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [
    loaderData.annotations,
    note.reset,
    loaderData.active.segment.id,
    navigation.state,
  ])

  // Clear loading state when navigation is complete
  R.useEffect(() => {
    if (navigation.state === "idle") {
      setShowLoading(false)
    }
  }, [navigation.state])

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
