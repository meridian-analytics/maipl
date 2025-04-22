import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import * as MR from "@maipl/react"
import * as RQ from "@tanstack/react-query"
import * as RR from "react-router-dom"
import * as Specviz from "@meridian-analytics/specviz"
import { Annotation } from "@maipl/api"
import type { LoaderData } from "../types"
import { useSaveContext } from "../../../SaveContext"
import * as R from "react"

export function SaveButton() {
  const loaderData = RR.useLoaderData() as LoaderData
  const maipl = MR.useMaipl()
  const notify = MR.useNotify()
  const note = Specviz.Note.useContext()
  const queryClient = RQ.useQueryClient()
  const { setHasUnsavedChanges } = useSaveContext()
  const [showProgress, setShowProgress] = R.useState(false)
  const saveMutation = RQ.useMutation({
    mutationFn: (vars: Parameters<typeof Annotation.updateSegment>) =>
      Annotation.updateSegment(...vars),
    onError: (err, vars) => {
      notify((onClose) => (
        <M.Alert onClose={onClose} severity="error">
          Error: Could not save annotations
        </M.Alert>
      ))
      if (import.meta.env["DEV"]) {
        console.error("AnnotationTool saveMutation error", err, vars)
      }
      setShowProgress(false)
    },
    onSettled: () => {
      saveMutation.reset()
      setShowProgress(false)
    },
    onSuccess: (segments) => {
      notify((onClose) => (
        <M.Alert onClose={onClose} severity="success">
          Success: Saved {segments.length} annotations
        </M.Alert>
      ))
      queryClient.refetchQueries({
        queryKey: [
          "annotate-batch-segment",
          loaderData.batch.id,
          loaderData.active.segment.id,
        ],
      })
      note.reset(note.regions)
      setHasUnsavedChanges(false)
      setShowProgress(false)
    },
  })

  // Update save status based on the same conditions that control the disabled state
  const isDisabled =
    note.undo == null || saveMutation.isPending || !note.canCreate
  R.useEffect(() => {
    setHasUnsavedChanges(!isDisabled)
  }, [isDisabled, setHasUnsavedChanges])

  const onSave = () => {
    if (loaderData.active.segment == null) return
    if (!note.canCreate) return
    if (saveMutation.isPending) return
    setShowProgress(true)
    // acl: todo: batch patch action to save only own annotations
    return saveMutation.mutateAsync([
      maipl.client,
      loaderData.batch.id,
      loaderData.active.segment.id,
      Array.from(note.regions.values(), (r) => ({
        id: r.id,
        created_at: new Date(),
        region: r,
      })),
    ])
  }

  // Handle keyboard shortcut
  R.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "w") {
        if (!isDisabled) {
          e.preventDefault()
          onSave()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onSave])

  return (
    <>
      <MR.ActionButton
        children={<I.Save />}
        disabled={isDisabled}
        onClick={() => onSave()}
        title="Save Batch (Ctrl + W)"
      />
      <M.Dialog
        open={showProgress}
        PaperProps={{
          sx: {
            minWidth: 300,
            p: 2,
          },
        }}
      >
        <M.DialogTitle>Saving Annotations</M.DialogTitle>
        <M.DialogContent>
          <M.Stack spacing={2} alignItems="center">
            <M.CircularProgress />
            <M.Typography>
              Please wait while we save your annotations...
            </M.Typography>
          </M.Stack>
        </M.DialogContent>
      </M.Dialog>
    </>
  )
}
