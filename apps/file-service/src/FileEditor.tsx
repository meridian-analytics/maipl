import { File } from "@maipl/api"
import * as F from "@maipl/format"
import * as MR from "@maipl/react"
import { Editor } from "@monaco-editor/react"
import * as M from "@mui/material"
import * as RQ from "@tanstack/react-query"
import * as Monaco from "monaco-editor"
import * as R from "react"
import * as RR from "react-router-dom"

export default function FileEditor(props: {
  folder: File.t_maipl_folder
  onClose: () => void
}) {
  const params = RR.useParams()
  const fileId = F.safeParseInteger(params.fileId, null)

  const { client } = MR.useMaipl()
  const { data: file, error } = RQ.useQuery({
    enabled: fileId != null,
    queryKey: ["files", fileId],
    queryFn: () => File.get(client, fileId!),
  })

  return (
    <MR.Modal onClose={props.onClose}>
      {error != null ? (
        <M.Typography>{(error as Error).message}</M.Typography>
      ) : (
        <FileEditor_
          file={file}
          folder={props.folder}
          onClose={props.onClose}
        />
      )}
    </MR.Modal>
  )
}

function FileEditor_(props: {
  file?: File.t
  folder: File.t_maipl_folder
  onClose: () => void
}) {
  const { client } = MR.useMaipl()
  const { file } = props
  const [path, setPath] = R.useState(() => file?.path ?? "/path/to/myfile.txt")
  const [folder, setFolder] = R.useState(
    () => file?.maipl_folder ?? props.folder,
  )
  const [tag, setTag] = R.useState(() => file?.tag ?? "")
  const [value, setValue] = R.useState<string | undefined>(() =>
    file == null ? "" : undefined,
  ) // monaco-editor uses undefined
  const lastSavedValue = R.useRef<string | null>(null)
  const queryClient = RQ.useQueryClient()

  const language: Monaco.languages.ILanguageExtensionPoint | null =
    R.useMemo(() => {
      const lookup = file?.extname ?? path.match(/(\.[^.]+)$/)?.[1]
      if (lookup == null) return null
      return (
        Monaco.languages
          .getLanguages()
          .find(lang => lang?.extensions?.includes?.(lookup)) ?? null
      )
    }, [file, path])

  RQ.useQuery({
    initialData: "",
    enabled: file != null,
    queryKey: ["files", file?.file],
    queryFn: () => {
      lastSavedValue.current = null
      return fetch(file!.file)
        .then(r => r.arrayBuffer())
        .then(buffer => new TextDecoder("utf-8").decode(buffer))
    },
    onSuccess: value => {
      lastSavedValue.current = value
      setValue(value)
    },
    onError: err => {
      console.error("FileEditor could not load file", err)
      setValue("// There was an error loading this file.")
    },
  })

  const createMutation = RQ.useMutation({
    mutationFn: (vars: Parameters<typeof File.create>) => File.create(...vars),
    onSuccess: () => {
      queryClient.refetchQueries(["files"])
      props.onClose()
    },
    onError: err => {
      console.error("FileEditor create err", err)
    },
  })

  const updateMutation = RQ.useMutation({
    mutationFn: (vars: Parameters<typeof File.update>) => File.update(...vars),
    onSuccess: () => {
      queryClient.refetchQueries(["files"])
      props.onClose()
    },
    onError: err => {
      console.error("FileEditor update err", err)
    },
  })

  const onCreate = () => {
    createMutation.mutate([
      client,
      {
        file: new window.File([value ?? ""], path),
        maipl_folder: folder,
        // todo: meta: { maipl: "file", ... }
        path,
        tag,
      },
    ])
  }

  const onUpdate = () => {
    if (file == null) {
      throw Error("FileEditor onUpdate called with no file")
    }
    updateMutation.mutate([
      client,
      file.id,
      {
        file: new window.File([value ?? ""], path),
        maipl_folder: folder,
        meta: file.meta,
        path,
        tag,
      },
    ])
  }

  const hasUnsavedChanges = R.useMemo(() => {
    if (file == null) {
      return tag != "" || value != ""
    } else {
      return tag != file.tag || value != lastSavedValue.current
    }
  }, [file?.tag, tag, value])

  return (
    <MR.Modal
      onClose={() => hasUnsavedChanges == false && props.onClose()}
      sx={{ width: "100%" }}
    >
      <M.Stack spacing={2}>
        <M.Typography variant="h5">
          {file == null ? "Create new file ..." : file.basename}
        </M.Typography>
        <M.Stack direction="row" spacing={2}>
          <MR.MaiplFolderPicker
            folder={folder}
            folders={[
              "public",
              "annotation",
              "config",
              "dataset",
              "model",
              "raw",
            ]}
            setFolder={setFolder}
            disabled={true}
          />
          <M.TextField
            fullWidth
            size="small"
            label="path"
            value={path}
            variant="outlined"
            onChange={e => setPath(e.currentTarget.value)}
            disabled={file != null}
          />
          <M.TextField
            size="small"
            label="tag"
            value={tag}
            variant="outlined"
            onChange={e => setTag(e.currentTarget.value)}
          />
        </M.Stack>
        {file && value == null ? (
          <M.Typography>Loading...</M.Typography>
        ) : (
          <Editor
            defaultValue="// Write some code..."
            height="600px"
            language={language?.id ?? "plaintext"}
            onChange={setValue}
            options={{
              minimap: { enabled: false },
            }}
            value={value}
          />
        )}
        <M.Stack direction="row" spacing={2}>
          <M.Typography>{F.filesize(value?.length ?? 0)}</M.Typography>
          <M.Typography>
            {file == null ? F.iso8601(new Date()) : F.iso8601(file.created_at)}
          </M.Typography>
          <M.Typography>{language?.aliases?.[0] ?? "Plain Text"}</M.Typography>
          <M.Stack flexGrow={1} />
          <M.Button
            variant="outlined"
            color={hasUnsavedChanges ? "error" : "primary"}
            onClick={props.onClose}
            children={hasUnsavedChanges ? "Close Without Saving" : "Close"}
          />
          {file == null ? (
            <M.Button
              color="success"
              children="Create"
              disabled={hasUnsavedChanges == false}
              onClick={onCreate}
              variant="contained"
            />
          ) : (
            <M.Button
              color="success"
              children="Save"
              disabled={hasUnsavedChanges == false}
              onClick={onUpdate}
              variant="contained"
            />
          )}
        </M.Stack>
      </M.Stack>
    </MR.Modal>
  )
}
