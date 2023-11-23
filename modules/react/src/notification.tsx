import * as M from "@mui/material"
import * as RQ from "@tanstack/react-query"
import * as R from "react"
import * as MR from "./index.ts"

type t_notification_context = {
  notifications: Array<t_notification>
  notify: t_notify
}

type t_notification = JSX.Element

type t_notify = (messageFn: (onClose: t_onclose) => t_notification) => void

type t_onclose = (event: R.SyntheticEvent) => void

const NotificationContext = R.createContext<t_notification_context>({
  notifications: [],
  notify: () => {
    throw Error("notify called outside of NotificationsContext")
  },
})

function NotificationProvider(props: { children: R.ReactNode }) {
  // const isMounted = MR.useIsMounted()
  const [notifications, setNotifications] = R.useState<Array<t_notification>>(
    [],
  )
  const notify: t_notification_context["notify"] = messageFn => {
    setNotifications(prev => [
      messageFn(_event => {
        setNotifications(prev)
      }),
      ...prev,
    ])
  }
  return (
    <NotificationContext.Provider
      children={props.children}
      value={{ notifications, notify }}
    />
  )
}

function Notifications() {
  const context = R.useContext(NotificationContext)
  const isNotifying = context.notifications.length > 0
  const isFetching = RQ.useIsFetching() > 0
  const isMutating = RQ.useIsMutating() > 0
  const isSynchronizing = MR.useDebounce(isFetching || isMutating, 1000) // debounce to prevent flickering
  const isOpen = isNotifying || isSynchronizing
  return (
    <M.Snackbar
      open={isOpen}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <M.Box>
        {isNotifying && context.notifications[0]}
        {isSynchronizing && (
          <M.Alert severity="info" children="Synchronizing with server..." />
        )}
      </M.Box>
    </M.Snackbar>
  )
}

const useNotify = () => R.useContext(NotificationContext).notify

export {
  type t_notification_context,
  type t_notification,
  type t_notify,
  NotificationProvider,
  Notifications,
  useNotify,
}
