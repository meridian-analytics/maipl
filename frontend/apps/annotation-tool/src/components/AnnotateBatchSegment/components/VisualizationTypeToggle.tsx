import * as R from "react"
import * as M from "@mui/material"
import type { ImageType } from "../types"

interface VisualizationTypeToggleProps {
  value: ImageType
  onChange: (value: ImageType) => void
}

export function VisualizationTypeToggle({
  value,
  onChange,
}: VisualizationTypeToggleProps) {
  return (
    <M.Stack direction="row" spacing={1} alignItems="center">
      <M.Typography variant="body2">Spectrogram</M.Typography>
      <M.Switch
        checked={value === "waveform"}
        onChange={(e) =>
          onChange(e.target.checked ? "waveform" : "spectrogram")
        }
        size="small"
      />
      <M.Typography variant="body2">Waveform</M.Typography>
    </M.Stack>
  )
}
