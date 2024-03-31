import type { Annotation } from "@maipl/api"
import * as F from "@maipl/format"
import * as MR from "@maipl/react"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import { useSpecviz } from "specviz-react/hooks"
import * as S from "./SchemaContext"
import * as W from "./WorkspaceContext"

export default function AnnotationList(props: {
  setShowFilters: (state: boolean) => void
  sx?: M.SxProps
}) {
  function order(a: Annotation.t_region, b: Annotation.t_region) {
    return a.x == b.x ? a.y - b.y : a.x - b.x
  }
  const labels = S.useLabels()
  const workspace = W.useWorkspace()
  const specviz = useSpecviz()
  return (
    <MR.Panel
      sx={props.sx}
      title={`Annotations (${workspace.filteredRegions.size} /
            ${workspace.state.regions.size})`}
      actions={
        Object.keys(workspace.state.filters).length > 0
          ? [
              <MR.ActionButton
                children={<I.FilterList color="primary" />}
                onClick={() => props.setShowFilters(true)}
                title="Edit Filters"
              />,
              <MR.ActionButton
                children={<I.FilterListOff color="warning" />}
                onClick={() => workspace.dispatch(W.actions.resetFilters())}
                title="Reset Filters"
              />,
            ]
          : [
              <MR.ActionButton
                children={<I.FilterList color="primary" />}
                onClick={() => props.setShowFilters(true)}
                title="Open Filters"
              />,
            ]
      }
      contents={
        <M.List disablePadding>
          {Array.from(workspace.filteredRegions.values())
            .sort(order)
            .map(region => (
              <M.ListItem disablePadding key={region.id}>
                <M.ListItemButton
                  selected={specviz.selection.has(region.id)}
                  onClick={() =>
                    specviz.setSelection(() => new Set([region.id]))
                  }
                >
                  <M.ListItemText
                    primary={labels.lookup(
                      W.rjsfCheckboxesBugfix(region["label"]),
                    )}
                    secondary={F.duration(region.x, region.x + region.width)}
                  />
                </M.ListItemButton>
              </M.ListItem>
            ))}
        </M.List>
      }
    />
  )
}
