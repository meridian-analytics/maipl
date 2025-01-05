import { File } from "@maipl/api"
import * as JS from "@maipl/js"
import * as MR from "@maipl/react"
import * as R from "react"
import * as DZ from "react-dropzone"
import * as RR from "react-router-dom"
import * as RRT from "react-router-typesafe"
import type { FileUploadProps } from "./types"
import { FileUploadStep1 } from "./components/FileUploadStep1"
import { FileUploadStep2 } from "./components/FileUploadStep2"

export const element = <Element />

export const loader = (_maipl: MR.t_context) =>
  (async ({ request }) => {
    // folder query param
    const url = new URL(request.url)
    const search = url.searchParams
    const folder = search.get("folder") ?? "raw"
    JS.invariantEnum(folder, File.t_maipl_folder, "File.t_maipl_folder")
    // payload
    return { folder }
  }) satisfies RR.LoaderFunction

function Element() {
  const navigate = RR.useNavigate()
  const { folder } = RRT.useLoaderData<ReturnType<typeof loader>>()
  const onClose = () => {
    navigate(-1)
  }
  switch (folder) {
    case File.t_maipl_folder.annotation:
      return (
        <FileUpload
          folder={folder}
          onClose={onClose}
          accept={{
            "text/csv": [".csv"],
          }}
        />
      )
    case File.t_maipl_folder.config:
      return (
        <FileUpload
          folder={folder}
          onClose={onClose}
          accept={{
            "application/json": [".json"],
          }}
        />
      )
    case File.t_maipl_folder.dataset:
      return (
        <FileUpload
          folder={folder}
          onClose={onClose}
          accept={{
            "application/hdf5": [".h5"],
          }}
        />
      )
    case File.t_maipl_folder.model:
      return (
        <FileUpload
          folder={folder}
          onClose={onClose}
          accept={{
            "application/zip": [".kt"],
          }}
        />
      )
    case File.t_maipl_folder.raw:
      return (
        <FileUpload
          folder={folder}
          onClose={onClose}
          accept={{
            "audio/flac": [".flac"],
            "audio/x-wav": [".wav"],
          }}
        />
      )
    case File.t_maipl_folder.metrics:
      return (
        <FileUpload
          folder={folder}
          onClose={onClose}
          accept={{
            "text/csv": [".csv"],
          }}
        />
      )
    case File.t_maipl_folder.recipe:
      return (
        <FileUpload
          folder={folder}
          onClose={onClose}
          accept={{
            "application/json": [".json"],
          }}
        />
      )
  }
}

// Main file upload component with two steps:
// 1. File selection via dropzone
// 2. Upload management with progress tracking
export default function FileUpload(props: FileUploadProps) {
  const [acceptedFiles, setAcceptedFiles] = R.useState<DZ.FileWithPath[]>([])

  const onDrop = R.useCallback((acceptedFiles: DZ.FileWithPath[]) => {
    setAcceptedFiles(acceptedFiles)
  }, [])

  if (acceptedFiles.length > 0) {
    return (
      <FileUploadStep2
        files={dz.acceptedFiles as Array<DZ.FileWithPath>}
        folder={props.folder}
        onClose={props.onClose}
      />
    )
  }

  return <FileUploadStep1 {...props} onDrop={onDrop} />
}
