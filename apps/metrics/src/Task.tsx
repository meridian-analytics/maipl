import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import * as R from "react"

const buttonStyle = {
  position: "absolute",
  bottom: 0,
  right: 0,
  minWidth: "60px",
  minHeight: "5px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  backgroundColor: "transparent",
  color: "text.primary",
  "&:hover": {
    backgroundColor: "primary.main",
    color: "primary.contrastText",
  },
  boxShadow: 1,
  borderRadius: "0",
  borderTopLeftRadius: "8px",
  borderTopRightRadius: "8px",
  borderColor: "rgba(0, 0, 0, 0.05)",
  padding: "0 4px",
}

const Task = ({ task }) => {
  const {
    id,
    bg_audio_list,
    output_files,
    description,
    folder,
    type,
    threshold_min,
    threshold_max,
    threshold_increment,
    total_time_units,
    add_bg_ref,
    bg_label,
    status,
    created_at,
    updated_at,
    eval_file,
    ref_file,
  } = task

  const [showOutputFiles, setShowOutputFiles] = R.useState(false)

  return (
    <M.Stack spacing={1}>
      <M.Card variant='outlined' sx={{ position: "relative" }}>
        <M.CardContent>
          <M.Grid container spacing={1} id='task-status'>
            <M.Grid item xs={6}>
              <M.Typography variant='body2'>
                Metrics Created at: {new Date(created_at).toLocaleDateString()}{" "}
                {new Date(created_at).toLocaleTimeString()}
              </M.Typography>
            </M.Grid>
            <M.Grid item xs={6} style={{ textAlign: "right" }}>
              <M.Typography variant='body2'>Status: {status}</M.Typography>
            </M.Grid>
            <M.Grid item xs={12} id='eval-and-ref-files'>
              <M.Typography variant='body2'>
                Evaluation File: {eval_file.path}
              </M.Typography>
              <M.Typography variant='body2'>
                Reference File: {ref_file.path}
              </M.Typography>
            </M.Grid>
            <M.Grid item xs={12} id='output-files'>
              <M.Collapse in={showOutputFiles}>
                <M.Grid container item spacing={2} xs={12} id='task-settings'>
                  <M.Grid item xs={3}>
                    <M.Typography variant='body2'>Type: {type}</M.Typography>
                  </M.Grid>
                  <M.Grid item xs={3}>
                    <M.Typography variant='body2'>
                      Folder: {folder}
                    </M.Typography>
                  </M.Grid>
                  <M.Grid item xs={3}>
                    <M.Typography variant='body2'>
                      Threshold: {threshold_min} - {threshold_max} (Increment:{" "}
                      {threshold_increment})
                    </M.Typography>
                  </M.Grid>
                  <M.Grid item xs={3}>
                    <M.Typography variant='body2'>
                      Total Time Units: {total_time_units}
                    </M.Typography>
                  </M.Grid>
                </M.Grid>
                <M.Typography variant='body2'>Output Files:</M.Typography>
                {output_files &&
                  output_files.map((file, index) => (
                    <M.Typography key={index} variant='body2'>
                      - {file.path}
                    </M.Typography>
                  ))}
              </M.Collapse>
            </M.Grid>
          </M.Grid>
        </M.CardContent>
        <M.Button
          onClick={() => setShowOutputFiles(!showOutputFiles)}
          sx={buttonStyle}
        >
          {showOutputFiles ? "Hide Details" : "Show Details"}
        </M.Button>
      </M.Card>
    </M.Stack>
  )
}

export default Task
