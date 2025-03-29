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

interface VisualizationToolProps {
  imageType: ImageType
}

export function VisualizationTool({ imageType }: VisualizationToolProps) {
  const loaderData = RR.useLoaderData() as LoaderData
  const app = AppContext.useContext()
  const showSelection = app.tool != AppContext.Tool.Move

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
        {imageType === "spectrogram" ? (
          <Specviz.Plane.Provider xaxis="seconds" yaxis="hertz">
            <div style={{ gridArea: "nav" }}>
              <NavigatorToolProvider>
                <Specviz.Navigator src={activeImage.image} />
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
            <div style={{ gridArea: "spec" }}>
              <VisualizationToolProvider>
                <Specviz.Visualization
                  showSelection={showSelection}
                  src={activeImage.image}
                />
              </VisualizationToolProvider>
            </div>
          </Specviz.Plane.Provider>
        ) : (
          <Specviz.Viewport.Transform
            fn={(state) => ({
              scroll: { x: state.scroll.x, y: 0 },
              zoom: { x: state.zoom.x, y: 1 },
            })}
          >
            <Specviz.Plane.Provider xaxis="seconds" yaxis="percent">
              <div style={{ gridArea: "nav" }}>
                <NavigatorToolProvider>
                  <Specviz.Navigator src={activeImage.image} />
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
              <div style={{ gridArea: "spec" }}>
                <VisualizationToolProvider>
                  <Specviz.Visualization
                    showSelection={showSelection}
                    src={activeImage.image}
                  />
                </VisualizationToolProvider>
              </div>
            </Specviz.Plane.Provider>
          </Specviz.Viewport.Transform>
        )}
      </div>
    </M.Paper>
  )
}
