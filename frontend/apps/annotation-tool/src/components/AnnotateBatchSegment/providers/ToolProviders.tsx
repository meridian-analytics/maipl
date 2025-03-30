import * as R from "react"
import * as Specviz from "@meridian-analytics/specviz"
import * as Audio from "@meridian-analytics/specviz/audio"
import * as AppContext from "../../../AppContext"
import * as SchemaContext from "../../../SchemaContext"
import * as MR from "@maipl/react"
import * as Format from "@meridian-analytics/specviz/format"
import * as Rect from "@meridian-analytics/specviz/rect"
import type { LoaderData } from "../types"
import * as RR from "react-router-dom"

export function BaseToolProvider(props: { children: R.ReactNode }) {
  const audio = Specviz.Audio.useContext()
  const onContextMenu: Specviz.Action.Handler["onContextMenu"] = R.useCallback(
    ({ unit, rel, abs, xaxis, yaxis, event }) => {
      audio.transport.seek(unit.x - xaxis.min)
    },
    [audio.transport.seek]
  )
  return (
    <Specviz.Action.Provider
      children={props.children}
      onContextMenu={onContextMenu}
    />
  )
}

export function HorizontalAxisToolProvider(props: { children: R.ReactNode }) {
  const viewport = Specviz.Viewport.useContext()
  const onWheel: Specviz.Action.Handler["onWheel"] = R.useCallback(
    ({ dx, dy, event }) => {
      if (event.altKey) {
        viewport.zoomScroll(dy, 0)
      } else {
        viewport.zoomScroll(-dy, 0)
      }
    },
    [viewport.zoomScroll]
  )
  return <Specviz.Action.Provider children={props.children} onWheel={onWheel} />
}

export function VerticalAxisToolProvider(props: { children: R.ReactNode }) {
  const viewport = Specviz.Viewport.useContext()
  const onWheel: Specviz.Action.Handler["onWheel"] = R.useCallback(
    ({ dx, dy, event }) => {
      if (event.altKey) {
        viewport.zoomScroll(0, dy)
      } else {
        viewport.zoomScroll(0, -dy)
      }
    },
    [viewport.zoomScroll]
  )
  return <Specviz.Action.Provider children={props.children} onWheel={onWheel} />
}

export function NavigatorToolProvider(props: { children: R.ReactNode }) {
  const app = AppContext.useContext()
  const viewport = Specviz.Viewport.useContext()
  const onClick: Specviz.Action.Handler["onClick"] = R.useCallback(
    ({ unit, rel, abs, xaxis, yaxis, event }) => {
      switch (app.tool) {
        case "annotate":
        case "select":
        case "move":
          viewport.scrollTo({
            x: rel.x * viewport.state.zoom.x - 0.5,
            y: rel.y * viewport.state.zoom.y - 0.5,
          })
          break
        case "zoom":
          viewport.resetView()
          break
      }
    },
    [
      app.tool,
      viewport.resetView,
      viewport.scrollTo,
      viewport.state.zoom.x,
      viewport.state.zoom.y,
    ]
  )
  const onDrag: Specviz.Action.Handler["onDrag"] = R.useCallback(
    ({ dx, dy, event }) => {
      viewport.scroll(dx * viewport.state.zoom.x, dy * viewport.state.zoom.y)
    },
    [viewport.scroll, viewport.state.zoom.x, viewport.state.zoom.y]
  )
  const onWheel: Specviz.Action.Handler["onWheel"] = R.useCallback(
    ({ dx, dy, event }) => {
      if (event.altKey) {
        viewport.zoomScroll(dx, dy)
      } else {
        viewport.scroll(-dx, -dy)
      }
    },
    [viewport.zoomScroll, viewport.scroll]
  )
  return (
    <Specviz.Action.Provider
      children={props.children}
      onClick={onClick}
      onDrag={onDrag}
      onWheel={onWheel}
    />
  )
}

export function VisualizationToolProvider(props: { children: R.ReactNode }) {
  const loaderData = RR.useLoaderData() as LoaderData
  const schema = SchemaContext.useContext()
  const app = AppContext.useContext()
  const maipl = MR.useMaipl()
  const note = Specviz.Note.useContext()
  const viewport = Specviz.Viewport.useContext()
  const onWheel: Specviz.Action.Handler["onWheel"] = R.useCallback(
    ({ dx, dy, event }) => {
      if (event.altKey) {
        viewport.zoomScroll(-dx, -dy)
      } else {
        viewport.scroll(dx, dy)
      }
    },
    [viewport.zoomScroll, viewport.scroll]
  )
  const action: Specviz.Action.Context = R.useMemo(() => {
    switch (app.tool) {
      case AppContext.Tool.Annotate:
        return {
          onClick: ({ unit, rel, abs, xaxis, yaxis, event }) => {
            note.selectPoint(
              abs,
              Specviz.Note.selectionMode(event),
              xaxis,
              yaxis
            )
          },
          onRect: ({ unit, rel, abs, xaxis, yaxis, event }) => {
            const [x, width] =
              xaxis.unit == "seconds"
                ? [unit.x, unit.width]
                : [xaxis.min, xaxis.max - xaxis.min]
            const [y, height] =
              yaxis.unit == "hertz" ? [unit.y, unit.height] : [-100, 200] // Full height for waveform view
            note.create(
              {
                id: Format.randomBytes(10),
                x,
                y:
                  yaxis.unit == "hertz"
                    ? unit.y
                    : loaderData.batch.parameters.freq_min,
                width,
                height:
                  yaxis.unit == "hertz"
                    ? unit.height
                    : loaderData.batch.parameters.freq_max -
                      loaderData.batch.parameters.freq_min,
                xunit: xaxis.unit,
                yunit: "hertz", // only use hertz for both spectrogram and waveform
                properties: {
                  ...Object.fromEntries(schema.defaults),
                  user_id: maipl.user?.id,
                },
              },
              { autoSelect: true }
            )
          },
          onWheel,
        }
      case AppContext.Tool.Select:
        return {
          onClick: ({ unit, rel, abs, xaxis, yaxis, event }) => {
            note.selectPoint(
              abs,
              Specviz.Note.selectionMode(event),
              xaxis,
              yaxis
            )
          },
          onRect: ({ unit, rel, abs, xaxis, yaxis, event }) => {
            note.selectArea(
              abs,
              Specviz.Note.selectionMode(event),
              xaxis,
              yaxis
            )
          },
          onWheel,
        }
      case AppContext.Tool.Zoom:
        return {
          onClick: ({ unit, rel, abs, xaxis, yaxis, event }) => {
            viewport.zoomPoint(
              abs,
              event.ctrlKey || event.metaKey
                ? Specviz.Viewport.ZoomDirection.out
                : Specviz.Viewport.ZoomDirection.in
            )
          },
          onRect: ({ unit, rel, abs, xaxis, yaxis, event }) => {
            viewport.zoomArea(abs)
          },
          onWheel,
        }
      case AppContext.Tool.Move:
        return {
          onDrag: ({ dx, dy, event, xaxis, yaxis }) => {
            if (note.selection.size == 0) {
              viewport.scroll(-dx, -dy)
            } else {
              note.move(
                note.selection,
                (rect) =>
                  Rect.move(
                    rect,
                    dx / viewport.state.zoom.x,
                    dy / viewport.state.zoom.y
                  ),
                xaxis,
                yaxis
              )
            }
          },
          onWheel,
        }
    }
  }, [
    onWheel,
    app.tool,
    maipl.user?.id,
    note.create,
    note.move,
    note.selectArea,
    note.selectPoint,
    note.selection,
    schema.defaults,
    viewport.scroll,
    viewport.state.zoom.x,
    viewport.state.zoom.y,
    viewport.zoomArea,
    viewport.zoomPoint,
    loaderData.batch.parameters.freq_min,
    loaderData.batch.parameters.freq_max,
    loaderData.active.segment.start,
  ])
  return <Specviz.Action.Provider children={props.children} {...action} />
}
