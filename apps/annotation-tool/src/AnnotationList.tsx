import * as F from "@maipl/format"
import * as MR from "@maipl/react"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import type * as Specviz from "specviz-react"
import * as S from "./SchemaContext"
import * as W from "./WorkspaceContext"

export default function AnnotationList(props: {
  setShowFilters: (state: boolean) => void
  sx?: M.SxProps
}) {
  function order(a: Specviz.Region, b: Specviz.Region) {
    return a.x == b.x ? a.y - b.y : a.x - b.x
  }
  const labels = S.useLabels()
  const workspace = W.useWorkspace()
  return (
    <MR.Panel
      sx={props.sx}
      title={`Annotations (${workspace.filteredRegions.size} /
            ${workspace.state.regions.size})`}
      actions={
        Object.keys(workspace.state.filters).length > 0
          ? [
              <MR.ActionButton
                key="0"
                children={<I.FilterList color="primary" />}
                onClick={() => props.setShowFilters(true)}
                title="Edit Filters"
              />,
              <MR.ActionButton
                key="1"
                children={<I.FilterListOff color="warning" />}
                onClick={() => workspace.dispatch(W.actions.resetFilters())}
                title="Reset Filters"
              />,
            ]
          : [
              <MR.ActionButton
                key="0"
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
                  selected={workspace.state.selection.has(region.id)}
                  onClick={() =>
                    workspace.dispatch(
                      W.actions.setSelection(new Set([region.id])),
                    )
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
