import { File } from "@maipl/api"
import * as M from "@mui/material"

export default function FolderPicker(props: {
  folder: File.t_maipl_folder
  folders: Array<File.t_maipl_folder>
  setFolder: (folder: File.t_maipl_folder) => void
  disabled?: boolean
}) {
  return (
    <M.FormControl size="small">
      <M.InputLabel>Folder</M.InputLabel>
      <M.Select
        disabled={props.disabled}
        label="Folder"
        value={props.folder}
        onChange={e => props.setFolder(e.target.value as File.t_maipl_folder)}
      >
        {props.folders.map(f => (
          <M.MenuItem key={f} value={f} children={f} />
        ))}
      </M.Select>
    </M.FormControl>
  )
}
