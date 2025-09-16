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

const getStatusColor = (status) => {
  switch (status.toLowerCase()) {
    case 'success':
      return '#2e7d32' // Material UI success dark
    case 'failure':
      return '#d32f2f' // Material UI error dark
    case 'running':
      return 'warning.main'
    case 'pending':
      return 'info.main'
    default:
      return 'text.secondary'
  }
}

const Task = ({ task, isNew }) => {
  const {
    id,
    bg_audio_list,
    output_files,
    description,
    folder,
    parameters,
    status,
    created_at,
    updated_at,
    eval_file,
    ref_file,
  } = task

  const [showOutputFiles, setShowOutputFiles] = R.useState(false)
  const { type, threshold_min, threshold_max, threshold_increment, total_time_units, add_bg_ref, bg_label } = parameters

  return (
    <M.Fade in={true} timeout={500}>
      <M.Stack spacing={1}>
        <M.Card 
          variant='outlined' 
          sx={{ 
            position: "relative",
            ...(isNew && {
              animation: "highlight 2s ease-in-out",
              "@keyframes highlight": {
                "0%": {
                  backgroundColor: "rgba(76, 175, 80, 0.2)",
                },
                "100%": {
                  backgroundColor: "transparent",
                },
              },
            }),
          }}
        >
          <M.CardContent>
            <M.Stack spacing={2}>
              {/* Header Section */}
              <M.Grid container spacing={1} alignItems="center">
                <M.Grid item xs={4}>
                  <M.Typography variant="subtitle2" color="text.secondary">
                    Task ID: {id}
                  </M.Typography>
                </M.Grid>
                <M.Grid item xs={4} sx={{ textAlign: 'center' }}>
                  <M.Chip 
                    label={status} 
                    size="small"
                    sx={{ 
                      backgroundColor: getStatusColor(status),
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                  />
                </M.Grid>
                <M.Grid item xs={4} sx={{ textAlign: 'right' }}>
                  <M.Typography variant="subtitle2" color="text.secondary">
                    Created: {new Date(created_at).toLocaleDateString()} {new Date(created_at).toLocaleTimeString()}
                  </M.Typography>
                </M.Grid>
              </M.Grid>

              {/* Files Section */}
              <M.Box>
                <M.Typography variant="subtitle2" gutterBottom>Files</M.Typography>
                <M.Typography variant='body2'>
                  Evaluation: {eval_file.path}
                </M.Typography>
                <M.Typography variant='body2'>
                  Reference: {ref_file.path}
                </M.Typography>
              </M.Box>

              {/* Parameters Section */}
              <M.Collapse in={showOutputFiles}>
                <M.Box>
                  <M.Typography variant="subtitle2" gutterBottom>Parameters</M.Typography>
                  <M.Grid container spacing={2}>
                    <M.Grid item xs={3}>
                      <M.Typography variant='body2'>Type: {type}</M.Typography>
                    </M.Grid>
                    <M.Grid item xs={3}>
                      <M.Typography variant='body2'>Folder: {folder}</M.Typography>
                    </M.Grid>
                    <M.Grid item xs={3}>
                      <M.Typography variant='body2'>
                        Threshold: {threshold_min} - {threshold_max}
                      </M.Typography>
                      <M.Typography variant='caption' color="text.secondary">
                        Increment: {threshold_increment}
                      </M.Typography>
                    </M.Grid>
                    <M.Grid item xs={3}>
                      <M.Typography variant='body2'>
                        Time Units: {total_time_units}
                      </M.Typography>
                    </M.Grid>
                  </M.Grid>
                </M.Box>

                {/* Output Files Section */}
                {output_files && output_files.length > 0 && (
                  <M.Box sx={{ mt: 2 }}>
                    <M.Typography variant="subtitle2" gutterBottom>Output Files</M.Typography>
                    {output_files.map((file, index) => (
                      <M.Typography key={index} variant='body2'>
                        - {file.path}
                      </M.Typography>
                    ))}
                  </M.Box>
                )}
              </M.Collapse>
            </M.Stack>
          </M.CardContent>
          <M.Button
            onClick={() => setShowOutputFiles(!showOutputFiles)}
            sx={buttonStyle}
          >
            {showOutputFiles ? "Hide Details" : "Show Details"}
          </M.Button>
        </M.Card>
      </M.Stack>
    </M.Fade>
  )
}

export default Task
