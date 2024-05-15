import { File, User } from "@maipl/api"
import * as F from "@maipl/format"
import * as MR from "@maipl/react"
import * as M from "@mui/material"
import * as RQ from "@tanstack/react-query"
import * as R from "react"
import * as RR from "react-router-dom"
import * as RRT from "react-router-typesafe"
import { P, match } from "ts-pattern"
import * as Files from "./Files"

type ShareState = "none" | "some" | "all"

export const element = <Element />

export const loader = (maipl: MR.t_context) =>
  (async ({ request, params }) => {
    const users = await User.list(maipl.client)
    return { users }
  }) satisfies RR.LoaderFunction

function groupBy<K, V>(arr: Iterable<V>, key: (v: V) => K[]): Map<K, Array<V>> {
  const m = new Map()
  for (const v of arr) {
    for (const k of key(v)) {
      const a = m.get(k)
      if (a) a.push(v)
      else m.set(k, [v])
    }
  }
  return m
}

function Element() {
  const { users } = RRT.useLoaderData<ReturnType<typeof loader>>()
  const navigate = RR.useNavigate()
  const onClose = () => {
    navigate(-1)
  }
  return <FileShare users={users} onClose={onClose} />
}

export default function FileShare(props: {
  users: Array<User.t>
  onClose: () => void
}) {
  const fileContext = Files.useContext()
  const maipl = MR.useMaipl()
  const notify = MR.useNotify()
  const queryClient = RQ.useQueryClient()

  const [emailFilter, setEmailFilter] = R.useState("")

  const currShareState = R.useMemo<Map<number, ShareState>>(
    function initialShareState() {
      return new Map(
        Array.from(
          groupBy(fileContext.selection.values(), f =>
            f.shared_to.map(u => u.id),
          ),
          ([k, v]) => [
            k,
            v.length == fileContext.selection.size ? "all" : "some",
          ],
        ),
      )
    },
    [fileContext.selection],
  )

  const [shares, setShares] = R.useState(() => new Map(currShareState))

  const hasChanges = R.useMemo(() => {
    for (const [uid, next] of shares) {
      const prev = currShareState.get(uid) ?? "none"
      if (next != prev) return true
    }
    return false
  }, [currShareState, shares])

  function checkboxState(uid: number): {
    indeterminate?: boolean
    checked?: boolean
  } {
    return match(shares.get(uid) ?? "none")
      .with("none", () => ({ indeterminate: false, checked: false }))
      .with("all", () => ({ indeterminate: false, checked: true }))
      .with("some", () => ({ indeterminate: true, checked: false }))
      .exhaustive()
  }

  function onSelect(uid: number) {
    return () => {
      match([currShareState.get(uid) ?? "none", shares.get(uid) ?? "none"])
        .with(["some", "none"], () => {
          setShares(prev => new Map(prev).set(uid, "some"))
        })
        .with(["some", "some"], () => {
          setShares(prev => new Map(prev).set(uid, "all"))
        })
        .with(["some", "all"], () => {
          setShares(prev => new Map(prev).set(uid, "none"))
        })
        .with([P.any, "none"], () => {
          setShares(prev => new Map(prev).set(uid, "all"))
        })
        .with([P.any, "all"], () => {
          setShares(prev => new Map(prev).set(uid, "none"))
        })
    }
  }

  const updateMutation = RQ.useMutation({
    mutationFn: (vars: Parameters<typeof File.share>) => File.share(...vars),
    onError: (err, vars) => {
      notify(onClose => (
        <M.Alert onClose={onClose} severity="error">
          Error: Could not update file shares
        </M.Alert>
      ))
      if (import.meta.env["DEV"]) {
        console.error("FileShare updateMutation error", err, vars)
      }
    },
    onSettled: () => {
      updateMutation.reset()
    },
    onSuccess: () => {
      notify(onClose => (
        <M.Alert onClose={onClose} severity="success">
          Success: Updated file shares
        </M.Alert>
      ))
      fileContext
      queryClient.refetchQueries({ queryKey: ["files"] })
      props.onClose()
    },
  })

  const onUpdate = () => {
    if (updateMutation.isPending) return

    const changes: Map<number, File.t_file_share_change[]> = new Map()

    function change(fid: number, c: File.t_file_share_change) {
      const a = changes.get(fid)
      if (a) a.push(c)
      else changes.set(fid, [c])
    }

    const currState = new Map(
      Array.from(fileContext.selection, ([fid, file]) => [
        fid,
        new Set(file.shared_to.map(u => u.id)),
      ]),
    )

    for (const [uid, nextState] of shares)
      for (const [fid, uids] of currState)
        match([uids.has(uid), nextState])
          // files are currently shared and being removed
          .with([true, "none"], () => change(fid, [uid, false]))
          // files are currently unshared and being added
          .with([false, "all"], () => change(fid, [uid, true]))

    return updateMutation.mutateAsync([
      maipl.client,
      Array.from(changes, ([file, changes]) => ({ file, changes })),
    ])
  }

  if (fileContext.selection.size == 0) {
    return <RR.Navigate to={".."} replace />
  }

  return (
    <MR.Modal onClose={props.onClose} sx={{ width: "50%" }}>
      <M.Stack>
        <M.Typography variant="h5">
          Share {F.unit(fileContext.selection.size, "file")} &hellip;
        </M.Typography>
        <M.List
          dense
          sx={{ minHeight: 300, maxHeight: "50vh", overflow: "auto" }}
        >
          {props.users
            .filter(user => {
              if (user.id == maipl.user?.id) return false
              if (
                match(shares.get(user.id) ?? "none")
                  .with("some", "all", () => true)
                  .otherwise(() => false)
              )
                return true
              // if (userSelection.has(user.id)) return true
              return user.email.includes(emailFilter.toLocaleLowerCase())
            })
            .map((user, key) => {
              const labelId = `checkbox-list-secondary-label-${user.id}`
              return (
                <M.ListItem
                  key={user.id}
                  disablePadding
                  secondaryAction={
                    <M.Checkbox
                      {...checkboxState(user.id)}
                      edge="end"
                      onChange={onSelect(user.id)}
                      inputProps={{ "aria-labelledby": labelId }}
                    />
                  }
                >
                  <M.ListItemButton>
                    <M.ListItemAvatar>
                      <MR.UserAvatar user={user} />
                    </M.ListItemAvatar>
                    <M.ListItemText id={labelId} primary={user.email} />
                  </M.ListItemButton>
                </M.ListItem>
              )
            })}
        </M.List>
        <M.Stack direction="row">
          <M.TextField
            label="Search"
            onChange={e => setEmailFilter(e.currentTarget.value)}
            placeholder="user@mail.service"
            value={emailFilter}
          />
          <M.Stack flexGrow={1} />
          <M.Button onClick={() => props.onClose()} children="Cancel" />
          <M.Button
            color="success"
            children="Share"
            disabled={!hasChanges}
            onClick={onUpdate}
            variant="contained"
          />
        </M.Stack>
      </M.Stack>
    </MR.Modal>
  )
}
