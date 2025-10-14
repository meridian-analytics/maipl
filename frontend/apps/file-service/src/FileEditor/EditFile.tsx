import { File } from "@maipl/api"
import * as F from "@maipl/format"
import * as JS from "@maipl/js"
import * as MR from "@maipl/react"
import { Editor } from "@monaco-editor/react"
import * as M from "@mui/material"
import * as MIcon from "@mui/icons-material"
import * as RQ from "@tanstack/react-query"
import * as Monaco from "monaco-editor"
import * as R from "react"
import * as RR from "react-router-dom"
import * as RRT from "react-router-typesafe"

export const element = <Element />

export const loader = (maipl: MR.t_context) =>
  (async ({ request, params }) => {
    // file id
    const fileId = F.safeParseInteger(params["fileId"], null)
    JS.invariant(fileId != null, `EditFile fileId: ${fileId}`)
    // folder query param
    const url = new URL(request.url)
    const search = url.searchParams
    const folder = search.get("folder") ?? "audio files"
    JS.invariantEnum(folder, File.t_maipl_folder, "File.t_maipl_folder")
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
  const onClose = () => {
    navigate(-1)
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

function HelpDialog(props: { open: boolean; onClose: () => void }) {
  // Detect OS for correct modifier key display
  const isMac = R.useMemo(() => {
    return navigator.platform.toUpperCase().indexOf("MAC") >= 0
  }, [])
  const mod = isMac ? "Cmd" : "Ctrl"

  const shortcuts = [
    {
      category: "General",
      items: [
        { keys: "F1", description: "Open command palette (all commands)" },
        { keys: `${mod}+F`, description: "Find" },
        { keys: `${mod}+H`, description: "Find and replace" },
        { keys: `${mod}+Z`, description: "Undo" },
        { keys: `${mod}+Shift+Z`, description: "Redo" },
        { keys: `${mod}+/`, description: "Toggle line comment" },
      ],
    },
    {
      category: "Multi-Cursor Editing",
      items: [
        { keys: "Alt+Click", description: "Add cursor at click position" },
        { keys: `${mod}+Alt+Up/Down`, description: "Add cursor above/below" },
        { keys: `${mod}+D`, description: "Select next occurrence of selection" },
        { keys: `${mod}+Shift+L`, description: "Select all occurrences" },
        { keys: "Alt+Shift+Drag", description: "Column (box) selection" },
      ],
    },
    {
      category: "CSV Editing",
      items: [
        { keys: "Alt+Shift+Drag", description: "Select entire column" },
        { keys: `${mod}+H`, description: "Replace values in column/selection" },
        { keys: `${mod}+F`, description: "Find specific cell values" },
      ],
    },
    {
      category: "JSON Editing",
      items: [
        { keys: "Shift+Alt+F", description: "Format document (prettify)" },
        { keys: `${mod}+]`, description: "Indent line/selection" },
        { keys: `${mod}+[`, description: "Outdent line/selection" },
        { keys: `${mod}+Shift+\\`, description: "Jump to matching bracket" },
      ],
    },
  ]

  return (
    <M.Dialog open={props.open} onClose={props.onClose} maxWidth="md" fullWidth>
      <M.DialogTitle>
        <M.Stack direction="row" alignItems="center" justifyContent="space-between">
          <M.Typography variant="h6">Editor Keyboard Shortcuts</M.Typography>
          <M.IconButton onClick={props.onClose} size="small">
            <MIcon.Close />
          </M.IconButton>
        </M.Stack>
      </M.DialogTitle>
      <M.DialogContent>
        <M.Stack spacing={3}>
          {shortcuts.map(section => (
            <M.Box key={section.category}>
              <M.Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                {section.category}
              </M.Typography>
              <M.Stack spacing={1}>
                {section.items.map(item => (
                  <M.Stack
                    key={item.keys}
                    direction="row"
                    spacing={2}
                    alignItems="center"
                  >
                    <M.Chip
                      label={item.keys}
                      size="small"
                      sx={{ minWidth: 160, fontFamily: "monospace" }}
                    />
                    <M.Typography variant="body2" color="text.secondary">
                      {item.description}
                    </M.Typography>
                  </M.Stack>
                ))}
              </M.Stack>
            </M.Box>
          ))}
        </M.Stack>
      </M.DialogContent>
    </M.Dialog>
  )
}

export default function EditFile(props: {
  file: File.t
  fileContents: string
  folder: File.t_maipl_folder
  onClose: () => void
}) {
  const maipl = MR.useMaipl()
  const notify = MR.useNotify()
  const queryClient = RQ.useQueryClient()

  const [path, setPath] = R.useState(props.file.path)
  const [tag, setTag] = R.useState(props.file.tag)
  const [value, setValue] = R.useState<undefined | string>(props.fileContents)
  const [helpOpen, setHelpOpen] = R.useState(false)

  // Detect OS for status bar hints
  const isMac = R.useMemo(() => {
    return navigator.platform.toUpperCase().indexOf("MAC") >= 0
  }, [])
  const mod = isMac ? "Cmd" : "Ctrl"

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
    onError: (err, vars) => {
      notify(onClose => (
        <M.Alert onClose={onClose} severity="error">
          Error: Could not update file "{vars[2].path}"
        </M.Alert>
      ))
      if (import.meta.env["DEV"]) {
        console.error("FileEditor updateMutation error", err, vars)
      }
    },
    onSettled: () => {
      updateMutation.reset()
    },
    onSuccess: file => {
      notify(onClose => (
        <M.Alert onClose={onClose} severity="success">
          Success: Updated file "{file.path}""
        </M.Alert>
      ))
      queryClient.refetchQueries({ queryKey: ["files"] })
      props.onClose()
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
          maipl_folder: props.file.maipl_folder,
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
      onClose={() => hasUnsavedChanges == false && props.onClose()}
      sx={{ width: "100%" }}
    >
      <M.Stack>
        <M.Typography variant="h5">{props.file.basename}</M.Typography>
        <M.Stack direction="row">
          <M.TextField
            fullWidth
            label="path"
            value={path}
            onChange={e => setPath(e.currentTarget.value)}
            disabled={true}
          />
          <M.TextField
            label="tag"
            value={tag}
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
        <M.Stack direction="row" alignItems="center" spacing={1}>
          <M.Typography variant="body2">{F.filesize(value?.length ?? 0)}</M.Typography>
          <M.Typography variant="body2">{F.iso8601(props.file.created_at)}</M.Typography>
          <M.Typography variant="body2">{language?.aliases?.[0] ?? "Plain Text"}</M.Typography>
          <M.Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
          <M.Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
            F1: Commands • {mod}+F: Find • {mod}+H: Replace
          </M.Typography>
          <M.IconButton
            size="small"
            onClick={() => setHelpOpen(true)}
            title="Show keyboard shortcuts"
          >
            <MIcon.HelpOutline fontSize="small" />
          </M.IconButton>
          <M.Stack flexGrow={1} />
          <M.Button
            color={hasUnsavedChanges ? "error" : "primary"}
            onClick={() => props.onClose()}
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
      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </MR.Modal>
  )
}
