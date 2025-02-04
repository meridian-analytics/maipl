import * as M from "@mui/material"
import * as R from "react"

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
  R.useEffect(() => {
    if (notifications.length > 0) {
      const timeout = window.setTimeout(() => {
        setNotifications(n => n.slice(1))
      }, 5000)
      return () => window.clearTimeout(timeout)
    }
  }, [notifications])
  return (
    <NotificationContext.Provider
      children={props.children}
      value={{ notifications, notify }}
    />
  )
}

function Notifications() {
  const context = R.useContext(NotificationContext)
  const notification = context.notifications[0]
  if (notification == null) return null

  return (
    <M.Snackbar
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      children={notification}
      open={true}
    />
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
