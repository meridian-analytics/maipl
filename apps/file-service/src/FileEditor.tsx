import { File } from "@maipl/api"
import * as F from "@maipl/format"
import * as MR from "@maipl/react"
import { Editor } from "@monaco-editor/react"
import * as M from "@mui/material"
import * as RQ from "@tanstack/react-query"
import * as Monaco from "monaco-editor"
import * as R from "react"
import * as RR from "react-router-dom"

export default function FileEditor() {
  const navigate = RR.useNavigate()
  const params = RR.useParams()
  const [search, _setSearch] = RR.useSearchParams()

  const fileId = F.safeParseInteger(params.fileId, null)
  const folder = (search.get("folder") ?? "public") as File.t_maipl_folder

  const maipl = MR.useMaipl()
  const { data: file, error } = RQ.useQuery({
    enabled: fileId != null,
    queryKey: ["files", fileId],
    queryFn: () => File.get(maipl.client, fileId!),
  })

  const onClose = () => {
    navigate(-1)
  }

  return (
    <MR.Modal onClose={onClose}>
      {error != null ? (
        <M.Typography>{(error as Error).message}</M.Typography>
      ) : (
        <FileEditor_
          key={fileId}
          file={file}
          folder={folder}
          onClose={onClose}
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
  const maipl = MR.useMaipl()
  const notify = MR.useNotify()
  const [path, setPath] = R.useState(
    () => props.file?.path ?? "path/to/myfile.txt",
  )
  const [folder, setFolder] = R.useState(
    () => props.file?.maipl_folder ?? props.folder,
  )
  const [tag, setTag] = R.useState(() => props.file?.tag ?? "")
  const [value, setValue] = R.useState<string | undefined>(() =>
    props.file == null ? "" : undefined,
  ) // monaco-editor uses undefined
  const lastSavedValue = R.useRef<string | null>(null)
  const queryClient = RQ.useQueryClient()

  const language: Monaco.languages.ILanguageExtensionPoint | null =
    R.useMemo(() => {
      const lookup = props.file?.extname ?? path.match(/(\.[^.]+)$/)?.[1]
      if (lookup == null) return null
      return (
        Monaco.languages
          .getLanguages()
          .find(lang => lang?.extensions?.includes?.(lookup)) ?? null
      )
    }, [props.file, path])

  const valueQuery = RQ.useQuery({
    enabled: props.file != null,
    queryKey: ["files", props.file?.file],
    queryFn: context => {
      lastSavedValue.current = null
      return fetch(props.file!.file, { signal: context.signal })
        .then(r => r.arrayBuffer())
        .then(buffer => new TextDecoder("utf-8").decode(buffer))
    },
  })

  R.useEffect(() => {
    if (valueQuery.error) {
      notify(onClose => (
        <M.Alert onClose={onClose} severity="error">
          Error: Could not load file "{props.file?.path}"
        </M.Alert>
      ))
      if (import.meta.env.DEV) {
        console.error("FileEditor could not load file", valueQuery.error)
      }
      setValue("")
    }
  }, [valueQuery.error, notify, props.file, setValue])

  R.useEffect(() => {
    if (valueQuery.data != null) {
      lastSavedValue.current = valueQuery.data
      setValue(valueQuery.data)
    }
  }, [valueQuery.data, lastSavedValue, setValue])

  const createMutation = RQ.useMutation({
    mutationFn: (vars: Parameters<typeof File.create>) => File.create(...vars),
    onError: (err, vars) => {
      notify(onClose => (
        <M.Alert onClose={onClose} severity="error">
          Error: Could not create file "{vars[1].path}"
        </M.Alert>
      ))
      if (import.meta.env.DEV) {
        console.error("FileEditor createMutation error", err, vars)
      }
    },
    onSuccess: file => {
      notify(onClose => (
        <M.Alert onClose={onClose} severity="success">
          Success: Created file "{file.path}"
        </M.Alert>
      ))
      queryClient.refetchQueries({ queryKey: ["files"] })
      props.onClose()
    },
  })

  const updateMutation = RQ.useMutation({
    mutationFn: (vars: Parameters<typeof File.update>) => File.update(...vars),
    onSuccess: file => {
      notify(onClose => (
        <M.Alert onClose={onClose} severity="success">
          Success: Updated file "{file.path}""
        </M.Alert>
      ))
      queryClient.refetchQueries({ queryKey: ["files"] })
      props.onClose()
    },
    onError: (err, vars) => {
      notify(onClose => (
        <M.Alert onClose={onClose} severity="error">
          Error: Could not update file "{vars[2].path}"
        </M.Alert>
      ))
      if (import.meta.env.DEV) {
        console.error("FileEditor updateMutation error", err, vars)
      }
    },
  })

  const onCreate = () => {
    if (createMutation.isIdle) {
      return createMutation.mutateAsync([
        maipl.client,
        {
          file: new window.File([value ?? ""], path),
          maipl_folder: folder,
          meta: { maipl: "file" },
          path,
          tag,
        },
      ])
    }
  }

  const onUpdate = () => {
    if (props.file == null) {
      throw Error("FileEditor onUpdate called with no file")
    }
    if (updateMutation.isIdle) {
      return updateMutation.mutateAsync([
        maipl.client,
        props.file.id,
        {
          file: new window.File([value ?? ""], path),
          maipl_folder: folder,
          meta: props.file.meta,
          path,
          tag,
        },
      ])
    }
  }

  const hasUnsavedChanges = R.useMemo(() => {
    if (props.file == null) {
      return tag != "" || value != ""
    } else {
      return tag != props.file.tag || value != lastSavedValue.current
    }
  }, [props.file, tag, value, lastSavedValue])

  return (
    <MR.Modal
      onClose={() => hasUnsavedChanges == false && props.onClose()}
      sx={{ width: "100%" }}
    >
      <M.Stack spacing={2}>
        <M.Typography variant="h5">
          {props.file == null ? "Create new file ..." : props.file.basename}
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
            disabled={props.file != null}
          />
          <M.TextField
            size="small"
            label="tag"
            value={tag}
            variant="outlined"
            onChange={e => setTag(e.currentTarget.value)}
          />
        </M.Stack>
        {props.file && value == null ? (
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
            {F.iso8601(props.file?.created_at ?? new Date())}
          </M.Typography>
          <M.Typography>{language?.aliases?.[0] ?? "Plain Text"}</M.Typography>
          <M.Stack flexGrow={1} />
          <M.Button
            variant="outlined"
            color={hasUnsavedChanges ? "error" : "primary"}
            onClick={props.onClose}
            children={hasUnsavedChanges ? "Close Without Saving" : "Close"}
          />
          {props.file == null ? (
            <M.Button
              color="success"
              children="Create"
              disabled={hasUnsavedChanges == false || createMutation.isPending}
              onClick={onCreate}
              variant="contained"
            />
          ) : (
            <M.Button
              color="success"
              children="Save"
              disabled={hasUnsavedChanges == false || updateMutation.isPending}
              onClick={onUpdate}
              variant="contained"
            />
          )}
        </M.Stack>
      </M.Stack>
    </MR.Modal>
  )
}
