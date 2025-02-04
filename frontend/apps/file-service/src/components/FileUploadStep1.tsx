import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import * as R from "react"
import * as DZ from "react-dropzone"
import * as MR from "@maipl/react"
import type { FileUploadProps } from "../types"
import { UploadIcon } from "./UploadIcon"
import { style } from "../styles"

// First step of file upload process - handles file selection
export function FileUploadStep1(props: FileUploadProps) {
  const dz = DZ.useDropzone({
    accept: props.accept,
    disabled: props.disabled,
    validator: props.validator,
    onDrop: props.onDrop,
  })

  const dzStyle = R.useMemo(
    () => ({
      ...style.base,
      ...(dz.isFocused ? style.focused : {}),
      ...(dz.isDragAccept ? style.accept : {}),
      ...(dz.isDragReject ? style.reject : {}),
    }),
    [dz.isFocused, dz.isDragAccept, dz.isDragReject]
  )

  return (
    <MR.Modal onClose={props.onClose}>
      <M.Stack>
        <M.Typography
          variant="h5"
          children={`Upload files to: /${props.folder}`}
        />
        <M.Box {...dz.getRootProps({ sx: dzStyle })}>
          <input {...dz.getInputProps()} />
          {props.disabled ? (
            <M.Stack alignItems="center" spacing={6}>
              <UploadIcon icon={I.Cancel} label="Not Allowed" />
              <M.Typography>
                {props.text ?? "This folder does not allow uploads"}
              </M.Typography>
            </M.Stack>
          ) : (
            <M.Stack alignItems="center" spacing={6}>
              <M.Stack direction="row">
                <UploadIcon icon={I.FolderOutlined} label="Folder" />
                {Object.entries(props.accept ?? {}).flatMap(([_mime, exts]) =>
                  exts.map((e) => (
                    <UploadIcon
                      icon={I.InsertDriveFileOutlined}
                      key={e}
                      label={e}
                    />
                  ))
                )}
              </M.Stack>
              <M.Typography>
                {props.text ?? "Drag and drop or click to select files here"}
              </M.Typography>
            </M.Stack>
          )}
        </M.Box>
        <M.Stack direction="row-reverse">
          <M.Button children="Cancel" onClick={props.onClose} />
        </M.Stack>
      </M.Stack>
    </MR.Modal>
  )
} 