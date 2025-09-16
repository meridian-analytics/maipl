import * as M from "@mui/material"
import Grid from "@mui/material/Unstable_Grid2"

export function LoadingState() {
  return (
    <Grid
      container
      sx={{
        maxHeight: "100%",
        overflow: "hidden",
      }}
    >
      <Grid xs={12}>
        <M.Stack direction="row" spacing={2}>
          <M.Skeleton variant="text" width={200} height={32} />
          <M.Stack flexGrow={5} />
          <M.Stack direction="row" spacing={1}>
            <M.Skeleton variant="circular" width={40} height={40} />
            <M.Skeleton variant="circular" width={40} height={40} />
            <M.Skeleton variant="circular" width={40} height={40} />
          </M.Stack>
        </M.Stack>
      </Grid>
      <Grid xs={12}>
        <M.Skeleton variant="rectangular" height={400} />
      </Grid>
      <Grid xs={4}>
        <M.Skeleton variant="rectangular" height={400} />
      </Grid>
      <Grid xs={4}>
        <M.Skeleton variant="rectangular" height={400} />
      </Grid>
      <Grid xs={4}>
        <M.Skeleton variant="rectangular" height={400} />
      </Grid>
    </Grid>
  )
}
