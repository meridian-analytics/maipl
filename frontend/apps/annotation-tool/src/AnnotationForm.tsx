import * as MR from "@maipl/react"
import * as Specviz from "@meridian-analytics/specviz"
import * as Audio from "@meridian-analytics/specviz/audio"
import * as Rect from "@meridian-analytics/specviz/rect"
import * as Axis from "@meridian-analytics/specviz/axis"
import * as Note from "@meridian-analytics/specviz/note"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import { Form } from "@rjsf/mui"
import validator from "@rjsf/validator-ajv8"
import React from "react"
import { ErrorBoundary } from "react-error-boundary"
import * as AppContext from "./AppContext"
import * as SchemaContext from "./SchemaContext"
import type { LoaderData } from "./types"
import * as RR from "react-router-dom"

export default function AnnotationForm(props: { sx?: M.SxProps }) {
  const note = Note.useContext()
  const app = AppContext.useContext()
  const audio = Audio.useContext()
  const schema = SchemaContext.useContext()
  const ids = Array.from(note.selection)

  // Memoized values for all forms
  const derivedSchema = React.useMemo(
    () => SchemaContext.deriveSchemaWithoutDefaults(schema.schema),
    [schema.schema]
  )
  const derivedUi = React.useMemo(
    () => SchemaContext.derivePolyFormUiSchema(schema.schema, schema.uiSchema),
    [schema.schema, schema.uiSchema]
  )
  const formData = React.useMemo(
    () =>
      SchemaContext.derivePolyFormData(
        schema.schema,
        note.regions,
        note.selection
      ),
    [note.regions, note.selection, schema.schema]
  )
  const derivedUiSchema = React.useMemo(
    () => SchemaContext.deriveMonoFormUiSchema(schema.schema, schema.uiSchema),
    [schema.schema, schema.uiSchema]
  )

  // Get the selected region if it exists
  const selectedRegion = React.useMemo(() => 
    ids.length === 1 ? note.regions.get(ids[0]) : null,
    [ids, note.regions]
  )

  // Determine which form to show
  const formType = React.useMemo(() => {
    if (ids.length === 0) return 'null'
    if (ids.length === 1) return 'mono'
    return 'poly'
  }, [ids.length])

  return (
    <ErrorBoundary
      fallbackRender={({ error }) => <p>Error: {error.message}</p>}
    >
      {formType === 'null' && (
        <NullForm sx={props.sx} schema={schema} />
      )}
      {formType === 'mono' && selectedRegion && (
        <MonoForm 
          sx={props.sx} 
          regionId={ids[0]} 
          key={ids[0]}
          app={app}
          audio={audio}
          note={note}
          schema={schema}
          derivedUiSchema={derivedUiSchema}
          active_segment={props.active_segment}
          active_batch={props.active_batch}
        />
      )}
      {formType === 'poly' && (
        <PolyForm 
          sx={props.sx}
          note={note}
          schema={schema}
          derivedSchema={derivedSchema}
          derivedUi={derivedUi}
          formData={formData}
        />
      )}
    </ErrorBoundary>
  )
}

function NullForm(props: { 
  sx?: M.SxProps
  schema: SchemaContext.Context
}) {
  return (
    <MR.Panel
      sx={props.sx}
      title="Edit Annotation"
      contents={
        <M.Box sx={{ marginTop: -4, padding: 2 }}>
          <Form
            children=" "
            formData={{}}
            readonly={true}
            schema={props.schema.schema}
            uiSchema={props.schema.uiSchema}
            validator={validator}
          />
        </M.Box>
      }
    />
  )
}

type UseWheelProps = {
  onWheel?: (delta: number, event: WheelEvent) => void
}

function useWheel(ref: React.MutableRefObject<null | HTMLInputElement>, props: UseWheelProps) {
  const onWheel = React.useCallback(
    (event: WheelEvent) => {
      if (ref.current) {
        event.preventDefault()
        // Normalize the delta by the input's height
        const delta = event.deltaY / ref.current.clientHeight
        // Apply speed control based on modifier keys
        const speed = event.ctrlKey || event.metaKey ? 0.1 : 1
        props.onWheel?.(delta * speed, event)
      }
    },
    [props.onWheel, ref],
  )

  React.useEffect(() => {
    if (ref.current) {
      ref.current.addEventListener("wheel", onWheel, { passive: false })
    }
    return () => {
      if (ref.current) {
        ref.current.removeEventListener("wheel", onWheel)
      }
    }
  }, [ref, onWheel])
}

function MonoForm(props: { 
  regionId: string
  sx?: M.SxProps
  app: AppContext.Context
  audio: Audio.Context
  note: Specviz.Note.Context
  schema: SchemaContext.Context
  derivedUiSchema: SchemaContext.UiSchema
  active_segment: LoaderData["active"]["segment"]
  active_batch: LoaderData["batch"]
}) {
  const region = props.note.regions.get(props.regionId)
  const isRegionHidden = region == null
  
  if (isRegionHidden) {
    return <p>Warning: Selected region is hidden by one or more filters</p>
  }

  const axis = Axis.useContext()
  const rect = Note.computeRectInverse(region, axis)
  const freq_axis_min = axis[region.yunit]["min"]
  const freq_axis_max = axis[region.yunit]["max"]
  const time_axis_min = axis[region.xunit]["min"]
  const time_axis_max = axis[region.xunit]["max"]

  // Add refs for wheel event handling
  const offsetRef = React.useRef<HTMLInputElement>(null)
  const durationRef = React.useRef<HTMLInputElement>(null)
  const minFreqRef = React.useRef<HTMLInputElement>(null)
  const maxFreqRef = React.useRef<HTMLInputElement>(null)

  // Add local state for input values
  const [offset, setOffset] = React.useState(region?.x.toFixed(2) ?? "0.00")
  const [duration, setDuration] = React.useState(region?.width.toFixed(2) ?? "0.00")
  const [minFreq, setMinFreq] = React.useState((region?.y ?? 0).toFixed(2))
  const [maxFreq, setMaxFreq] = React.useState(((region?.y + region?.height) ?? 0).toFixed(2))

  // Update local state when region changes
  React.useEffect(() => {
    if (region) {
      setOffset(region.x.toFixed(2))
      setDuration(region.width.toFixed(2))
      setMinFreq(region.y.toFixed(2))
      setMaxFreq((region.y + region.height).toFixed(2))
    }
  }, [region])

  // Helper functions for validation and updates
  const handleOffsetChange = (value: string) => {
    setOffset(value)
  }

  const handleOffsetUpdate = React.useCallback((value: string) => {
    let numValue = parseFloat(value)
    // if numValue is out of range, set it to the nearest valid value
    if (numValue < time_axis_min) {
      numValue = time_axis_min
    } else if (numValue > time_axis_max - region.width) {
      numValue = time_axis_max - region.width
    }
    const normalizedValue = Axis.computeUnitInverse(axis[region.xunit], numValue)
    const delta = normalizedValue - rect.x
    props.note.move(new Set([region.id]), (rect) => Rect.setX(rect, delta))
  }, [axis, region, rect, props.note, time_axis_min, time_axis_max])

  const handleDurationChange = (value: string) => {
    setDuration(value)
  }

  const handleDurationUpdate = React.useCallback((value: string) => {
    let numValue = parseFloat(value)
    // if numValue is out of range, set it to the nearest valid value
    if (numValue < 0.01) {
      numValue = 0.01
    } else if (numValue > time_axis_max - region.x) {
      numValue = time_axis_max - region.x
    }
    const normalizedValue = Axis.computeUnitInverse(axis[region.xunit], numValue)
    const delta = normalizedValue - rect.width
    props.note.move(new Set([region.id]), (rect) => Rect.setX2(rect, delta))
  }, [axis, region, rect, props.note, time_axis_max])

  const handleMinFreqChange = (value: string) => {
    setMinFreq(value)
  }

  const handleMinFreqUpdate = React.useCallback((value: string) => {
    let numValue = parseFloat(value)
    // if numValue is out of range, set it to the nearest valid value
    if (numValue < freq_axis_min) {
      numValue = freq_axis_min
    } else if (numValue > freq_axis_max - region.height) {
      numValue = freq_axis_max - region.height
    }
    const normalizedValue = Axis.computeUnitInverse(axis[region.yunit], numValue)
    const delta = (normalizedValue - rect.y) - rect.height
    props.note.move(new Set([region.id]), (rect) => Rect.setY2(rect, delta))
  }, [axis, region, rect, props.note, freq_axis_min, freq_axis_max])

  const handleMaxFreqChange = (value: string) => {
    setMaxFreq(value)
  }

  const handleMaxFreqUpdate = React.useCallback((value: string) => {
    let numValue = parseFloat(value)
    // if numValue is out of range, set it to the nearest valid value
    if (numValue < freq_axis_min) {
      numValue = freq_axis_min
    } else if (numValue > freq_axis_max - region.height) {
      numValue = freq_axis_max - region.height
    }
    const normalizedValue = Axis.computeUnitInverse(axis[region.yunit], numValue)
    const delta = normalizedValue - rect.y
    props.note.move(new Set([region.id]), (rect) => Rect.setY1(rect, delta))
  }, [axis, region, rect, props.note, freq_axis_min, freq_axis_max])

  // Setup wheel handlers
  const handleWheel = React.useCallback((delta: number, step: number, handler: (value: string) => void, ref: React.RefObject<HTMLInputElement>) => {
    const currentValue = parseFloat((ref.current as HTMLInputElement).value)
    if (!isNaN(currentValue)) {
      // Apply the normalized delta to the step size
      const newValue = (currentValue + (delta * step)).toFixed(2)
      handler(newValue)
    }
  }, [])

  // Use the wheel hook for each input
  useWheel(offsetRef, {
    onWheel: (delta) => handleWheel(delta, 0.1, handleOffsetUpdate, offsetRef)
  })
  useWheel(durationRef, {
    onWheel: (delta) => handleWheel(delta, 0.1, handleDurationUpdate, durationRef)
  })
  useWheel(minFreqRef, {
    onWheel: (delta) => handleWheel(delta, 1, handleMinFreqUpdate, minFreqRef)
  })
  useWheel(maxFreqRef, {
    onWheel: (delta) => handleWheel(delta, 1, handleMaxFreqUpdate, maxFreqRef)
  })

  if (isRegionHidden) {
    return <p>Warning: Selected region is hidden by one or more filters</p>
  }

  return (
    <MR.Panel
      sx={props.sx}
      title="Edit Annotation"
      actions={[
        props.app.focus &&
        !props.audio.state.pause &&
        region.id == props.app.focus ? (
          <MR.ActionButton
            key="0"
            children={<I.Stop />}
            onClick={() => {
              props.audio.transport.stop()
              props.app.setFocus(null)
            }}
            title="Stop Annotation"
          />
        ) : (
          <MR.ActionButton
            key="0"
            children={<I.PlayArrow />}
            onClick={() => {
              props.app.setFocus(region.id)
              props.audio.transport.play()
            }}
            title="Play Annotation"
          />
        ),
        <MR.ActionButton
          key="1"
          children={<I.DeleteForever />}
          disabled={!props.note.canDelete(region)}
          onClick={() => props.note.delete(new Set([region.id]))}
          title="Delete Annotation"
        />,
      ]}
      contents={
        <M.Box sx={{ marginTop: -4, padding: 2 }}>
          <Form
            children=" "
            formData={region.properties}
            onChange={(e) =>
              props.note.updateProperties(new Set([region.id]), (prev) =>
                updateProperties(prev ?? {}, props.schema.schema, e.formData)
              )
            }
            readonly={!props.note.canUpdate(region)}
            schema={props.schema.schema}
            uiSchema={props.derivedUiSchema}
            validator={validator}
          />
        </M.Box>
      }
      footer={
        <M.Paper
          sx={{
            backgroundColor: "action.hover",
            padding: 1,
            position: "relative",
          }}
        >
          <M.Grid container spacing={1} flexGrow={1}>
            <M.Grid item xs={3}>
              <M.TextField
                label="Offset (s)"
                type="number"
                value={offset}
                size="small"
                fullWidth
                inputRef={offsetRef}
                inputProps={{
                  step: 0.01,
                  min: time_axis_min,
                  max: time_axis_max - region.width,
                }}
                onChange={(e) => handleOffsetChange(e.target.value)}
                onBlur={(e) => handleOffsetUpdate(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleOffsetUpdate(e.target.value)
                  } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault()
                    const step = e.key === 'ArrowUp' ? 0.01 : -0.01
                    const newValue = (parseFloat(e.target.value) + step).toFixed(2)
                    handleOffsetUpdate(newValue)
                  }
                }}
              />
            </M.Grid>
            <M.Grid item xs={3}>
              <M.TextField
                label="Duration (s)"
                type="number"
                value={duration}
                size="small"
                fullWidth
                inputRef={durationRef}
                inputProps={{
                  step: 0.01,
                  min: 0.01,
                  max: time_axis_max - region.x,
                }}
                onChange={(e) => handleDurationChange(e.target.value)}
                onBlur={(e) => handleDurationUpdate(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleDurationUpdate(e.target.value)
                  } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault()
                    const step = e.key === 'ArrowUp' ? 0.01 : -0.01
                    const newValue = (parseFloat(e.target.value) + step).toFixed(2)
                    handleDurationUpdate(newValue)
                  }
                }}
              />
            </M.Grid>
            <M.Grid item xs={3}>
              <M.TextField
                label="Min Freq (Hz)"
                type="number"
                value={minFreq}
                size="small"
                fullWidth
                inputRef={minFreqRef}
                inputProps={{
                  step: 1,
                  min: freq_axis_min,
                  max: freq_axis_max - region.height,
                }}
                onChange={(e) => handleMinFreqChange(e.target.value)}
                onBlur={(e) => handleMinFreqUpdate(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleMinFreqUpdate(e.target.value)
                  } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault()
                    const step = e.key === 'ArrowUp' ? 1 : -1
                    const newValue = (parseFloat(e.target.value) + step).toFixed(2)
                    handleMinFreqUpdate(newValue)
                  }
                }}
              />
            </M.Grid>
            <M.Grid item xs={3}>
              <M.TextField
                label="Max Freq (Hz)"
                type="number"
                value={maxFreq}
                size="small"
                fullWidth
                inputRef={maxFreqRef}
                inputProps={{
                  step: 1,
                  min: region.y + 1,
                  max: freq_axis_max,
                }}
                onChange={(e) => handleMaxFreqChange(e.target.value)}
                onBlur={(e) => handleMaxFreqUpdate(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleMaxFreqUpdate(e.target.value)
                  } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault()
                    const step = e.key === 'ArrowUp' ? 1 : -1
                    const newValue = (parseFloat(e.target.value) + step).toFixed(2)
                    handleMaxFreqUpdate(newValue)
                  }
                }}
              />
            </M.Grid>
          </M.Grid>
        </M.Paper>
      }
    />
  )
}

function PolyForm(props: { 
  sx?: M.SxProps
  note: Specviz.Note.Context
  schema: SchemaContext.Context
  derivedSchema: SchemaContext.JsonSchema
  derivedUi: SchemaContext.UiSchema
  formData: Record<string, unknown>
}) {
  return (
    <MR.Panel
      sx={props.sx}
      title="Edit Annotation"
      contents={
        <M.Box sx={{ marginTop: -4, padding: 2 }}>
          <Form
            children=" "
            formData={props.formData}
            onChange={(e) => {
              props.note.updateProperties(props.note.selection, (prev) =>
                updateProperties(prev ?? {}, props.schema.schema, e.formData)
              )
            }}
            schema={props.derivedSchema}
            uiSchema={props.derivedUi}
            validator={validator}
          />
        </M.Box>
      }
    />
  )
}

function updateProperties(
  props: Record<string, unknown>,
  schema: SchemaContext.JsonSchema,
  formData: Record<string, unknown>
) {
  const next = { ...props }
  let v: unknown
  for (const key in schema.properties) {
    v = formData[key]
    if (v === undefined) delete next[key]
    else next[key] = v
  }
  return next
}
