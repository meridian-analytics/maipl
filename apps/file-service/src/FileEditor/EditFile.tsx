import { File } from "@maipl/api"
import * as F from "@maipl/format"
import * as JS from "@maipl/js"
import * as MR from "@maipl/react"
import { Editor } from "@monaco-editor/react"
import * as M from "@mui/material"
import * as RQ from "@tanstack/react-query"
import * as Monaco from "monaco-editor"
import * as R from "react"
import * as RR from "react-router-dom"
import * as RRT from "react-router-typesafe"

export const element = <Element />

export const loader = (maipl: MR.t_context) =>
  (async ({ request, params }) => {
    // file id
    const fileId = F.safeParseInteger(params.fileId, null)
    JS.invariant(fileId != null, `EditFile fileId: ${fileId}`)
    // folder query param
    const url = new URL(request.url)
    const search = url.searchParams
    const folder = search.get("folder") ?? "public"
    File.invariantMaiplFolder(folder)
    // file resource
    const file = await File.get(maipl.client, fileId)
    // file contents
    const fileContents = await fetch(file.file)
      .then(r => r.arrayBuffer())
      .then(buffer => new TextDecoder("utf-8").decode(buffer))
    // payload
    return { fileId, folder, file, fileContents }
  }) satisfies RR.LoaderFunction

function Element() {
  const { fileId, folder, file, fileContents } =
    RRT.useLoaderData<ReturnType<typeof loader>>()
  const navigate = RR.useNavigate()
  const onClose = (hasUnsavedChanges?: boolean) => {
    hasUnsavedChanges == false && navigate(-1)
  }
  return (
    <EditFile
      key={fileId}
      file={file}
      fileContents={fileContents}
      folder={folder}
      onClose={onClose}
    />
  )
}

export default function EditFile(props: {
  file: File.t
  fileContents: string
  folder: File.t_maipl_folder
  onClose: (hasUnsavedChanges?: boolean) => void
}) {
  const maipl = MR.useMaipl()
  const notify = MR.useNotify()
  const queryClient = RQ.useQueryClient()

  const [path, setPath] = R.useState(props.file.path)
  const [folder, setFolder] = R.useState(props.file.maipl_folder)
  const [tag, setTag] = R.useState(props.file.tag)
  const [value, setValue] = R.useState<undefined | string>(props.fileContents)

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
    return tag != props.file.tag || value != props.fileContents
  }, [props.file, props.fileContents, tag, value])

  return (
    <MR.Modal
      onClose={() => props.onClose(hasUnsavedChanges)}
      sx={{ width: "100%" }}
    >
      <M.Stack spacing={2}>
        <M.Typography variant="h5">{props.file.basename}</M.Typography>
        <M.Stack direction="row" spacing={2}>
          <MR.Picker
            disabled={true}
            label="Folder"
            setValue={setFolder}
            value={folder}
            values={[
              File.t_maipl_folder.public,
              File.t_maipl_folder.annotation,
              File.t_maipl_folder.config,
              File.t_maipl_folder.dataset,
              File.t_maipl_folder.model,
              File.t_maipl_folder.raw,
            ]}
          />
          <M.TextField
            fullWidth
            size="small"
            label="path"
            value={path}
            variant="outlined"
            onChange={e => setPath(e.currentTarget.value)}
            disabled={true}
          />
          <M.TextField
            size="small"
            label="tag"
            value={tag}
            variant="outlined"
            onChange={e => setTag(e.currentTarget.value)}
          />
        </M.Stack>
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
        <M.Stack direction="row" spacing={2}>
          <M.Typography>{F.filesize(value?.length ?? 0)}</M.Typography>
          <M.Typography>{F.iso8601(props.file.created_at)}</M.Typography>
          <M.Typography>{language?.aliases?.[0] ?? "Plain Text"}</M.Typography>
          <M.Stack flexGrow={1} />
          <M.Button
            variant="outlined"
            color={hasUnsavedChanges ? "error" : "primary"}
            onClick={() => props.onClose(hasUnsavedChanges)}
            children={hasUnsavedChanges ? "Close Without Saving" : "Close"}
          />
          <M.Button
            color="success"
            children="Save"
            disabled={hasUnsavedChanges == false || updateMutation.isPending}
            onClick={onUpdate}
            variant="contained"
          />
        </M.Stack>
      </M.Stack>
    </MR.Modal>
  )
}
