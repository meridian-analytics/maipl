import * as M from "@mui/material"
import * as R from "react"
import type { DatabaseTask } from "../types"

interface DatabaseStructureViewProps {
  task: DatabaseTask
}

export default function DatabaseStructureView({ task }: DatabaseStructureViewProps) {
  const metadata = task.database_metadata

  if (!metadata || !metadata.hdf5_structure) {
    return (
      <M.Paper sx={{ p: 2, bgcolor: "grey.50" }}>
        <M.Typography variant="body2" color="text.secondary">
          No database structure available
        </M.Typography>
      </M.Paper>
    )
  }

  const renderGroup = (groupName: string, datasets: Record<string, string>) => (
    <M.Box key={groupName} sx={{ ml: 2, mb: 1 }}>
      <M.Typography variant="subtitle2" color="primary">
        {groupName}
      </M.Typography>
      {Object.entries(datasets).map(([datasetName, datasetType]) => (
        <M.Box key={datasetName} sx={{ ml: 2, display: "flex", alignItems: "center", gap: 1 }}>
          <M.Icon fontSize="small" color="action">data_object</M.Icon>
          <M.Typography variant="body2" color="text.secondary">
            {datasetName} ({datasetType})
          </M.Typography>
        </M.Box>
      ))}
    </M.Box>
  )

  return (
    <M.Paper sx={{ p: 2 }}>
      <M.Typography variant="h6" gutterBottom>
        Database Structure
      </M.Typography>
      
      <M.Stack spacing={1}>
        <M.Typography variant="body2" color="text.secondary">
          Total Groups: {metadata.groups.length}
        </M.Typography>
        
        {metadata.total_samples > 0 && (
          <M.Typography variant="body2" color="text.secondary">
            Total Samples: {metadata.total_samples}
          </M.Typography>
        )}
        
        <M.Divider sx={{ my: 1 }} />
        
        {Object.entries(metadata.hdf5_structure).map(([groupName, datasets]) =>
          renderGroup(groupName, datasets)
        )}
      </M.Stack>
    </M.Paper>
  )
} 