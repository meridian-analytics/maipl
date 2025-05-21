import * as F from "@maipl/format"
import * as MR from "@maipl/react"
import * as Specviz from "@meridian-analytics/specviz"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import * as React from "react"
import type * as AppContext from "./AppContext"
import * as FilterContext from "./FilterContext"
import * as SchemaContext from "./SchemaContext"

const COLUMN_STYLES = {
  container: {
    display: "grid",
    gridTemplateColumns: "1fr 140px 140px 80px",
    gap: 0,
    width: "100%",
    minHeight: "40px",
  },
  cell: {
    px: 2,
    display: "flex",
    alignItems: "center",
    height: "100%",
  },
  divider: {
    borderLeft: 1,
    borderColor: "divider",
  },
}

export default function AnnotationList(props: {
  setShowFilters: (state: boolean) => void
  sx?: M.SxProps
}) {
  function order(a: Specviz.Note.Region, b: Specviz.Note.Region) {
    return a.x == b.x ? a.y - b.y : a.x - b.x
  }
  const filter = FilterContext.useContext()
  const note = Specviz.Note.useContext()
  return (
    <MR.Panel
      sx={{
        ...props.sx,
        "& .MuiPanel-title": {
          fontWeight: 700,
          color: "text.primary",
        },
      }}
      title={`Annotations (${note.regions.size} / ${note.count})`}
      actions={
        Object.keys(filter.filters).length > 0
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
                onClick={() => filter.resetFilters()}
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
        <>
          <M.Box
            sx={{
              ...COLUMN_STYLES.container,
              borderBottom: 1,
              borderColor: "divider",
            }}
          >
            <M.Typography variant="subtitle2" sx={COLUMN_STYLES.cell}>
              Label
            </M.Typography>
            <M.Typography
              variant="subtitle2"
              sx={{ ...COLUMN_STYLES.cell, ...COLUMN_STYLES.divider }}
            >
              Duration
            </M.Typography>
            <M.Typography
              variant="subtitle2"
              sx={{ ...COLUMN_STYLES.cell, ...COLUMN_STYLES.divider }}
            >
              Frequency
            </M.Typography>
            <M.Typography
              variant="subtitle2"
              sx={{ ...COLUMN_STYLES.cell, ...COLUMN_STYLES.divider }}
            >
              Author
            </M.Typography>
          </M.Box>
          <M.List disablePadding>
            {Array.from(note.regions.values())
              .sort(order)
              .map((r) => (
                <AnnotationListItem key={r.id} {...r} />
              ))}
          </M.List>
        </>
      }
    />
  )
}

export function AnnotationListItem(
  props: Specviz.Note.Region<AppContext.UserData>
) {
  const schema = SchemaContext.useContext()
  const note = Specviz.Note.useContext()
  const primary = React.useMemo(
    () =>
      [
        schema.getLabel(props.properties?.label),
        props.properties?.comments,
      ].join(" - "),
    [props.properties?.comments, props.properties?.label, schema.getLabel]
  )
  const secondary = F.duration(props.x, props.x + props.width)
  const frequencyRange = `${props.y.toFixed(0)} - ${(props.y + props.height).toFixed(0)} Hz`
  const author = `${props.properties?.author?.user_first_name} ${props.properties?.author?.user_last_name}`
  const initials = React.useMemo(() => {
    const first = props.properties?.author?.user_first_name?.[0] || ''
    const last = props.properties?.author?.user_last_name?.[0] || ''
    return `${first}${last}`.toUpperCase()
  }, [props.properties?.author])
  
  return (
    <M.ListItem disablePadding key={props.id}>
      <M.ListItemButton
        selected={note.selection.has(props.id)}
        onClick={(e) => {
          note.select(new Set([props.id]), Specviz.Note.selectionMode(e))
        }}
        sx={{
          ...COLUMN_STYLES.container,
          "&:hover": {
            bgcolor: "action.hover",
          },
          "&.Mui-selected": {
            bgcolor: "action.selected",
          },
          padding: 0,
          borderRadius: 0,
        }}
      >
        <M.Tooltip title={primary} placement="top">
          <M.Typography
            variant="body2"
            sx={{
              ...COLUMN_STYLES.cell,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {primary}
          </M.Typography>
        </M.Tooltip>
        <M.Tooltip title={secondary} placement="top">
          <M.Typography
            variant="body2"
            color="text.secondary"
            sx={{ ...COLUMN_STYLES.cell, ...COLUMN_STYLES.divider }}
          >
            {secondary}
          </M.Typography>
        </M.Tooltip>
        <M.Tooltip title={frequencyRange} placement="top">
          <M.Typography
            variant="body2"
            color="text.secondary"
            sx={{ ...COLUMN_STYLES.cell, ...COLUMN_STYLES.divider }}
          >
            {frequencyRange}
          </M.Typography>
        </M.Tooltip>
        <M.Tooltip title={author} placement="top">
          <M.Box
            sx={{
              ...COLUMN_STYLES.cell,
              ...COLUMN_STYLES.divider,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <M.Avatar
              sx={{
                width: 24,
                height: 24,
                fontSize: '0.75rem',
                bgcolor: 'primary.main'
              }}
            >
              {initials}
            </M.Avatar>
          </M.Box>
        </M.Tooltip>
      </M.ListItemButton>
    </M.ListItem>
  )
}
