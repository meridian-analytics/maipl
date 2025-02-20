import { File, Profile } from "@maipl/api"
import * as F from "@maipl/format"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import * as RQ from "@tanstack/react-query"
import * as RR from "react-router-dom"
import { useMaipl } from "../context"
import Modal from "./Modal"
import { useState } from "react"

type ProfileFormData = {
  first_name: string
  last_name: string
}

type PasswordFormData = {
  current_password: string
  new_password: string
  confirm_password: string
}

type BackendError = {
  [key: string]: string[]
}

function TabPanel(props: {
  children?: React.ReactNode
  index: number
  value: number
}) {
  const { children, value, index } = props
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
    >
      {value === index && <M.Box sx={{ p: 3 }}>{children}</M.Box>}
    </div>
  )
}

function ProfileForm() {
  const { user, client } = useMaipl()
  const queryClient = RQ.useQueryClient()
  const [message, setMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  const [formData, setFormData] = useState<ProfileFormData>({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
  })

  const updateMutation = RQ.useMutation({
    mutationFn: (data: ProfileFormData) => Profile.update(client, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] })
      setMessage({ type: "success", text: "Profile updated successfully!" })
    },
    onError: (error: any) => {
      if (error.response?.data) {
        const backendError = error.response.data as BackendError
        const errorMessage = Object.entries(backendError)
          .map(([field, messages]) => `${messages.join(", ")}`)
          .join(". ")
        setMessage({
          type: "error",
          text: errorMessage,
        })
      } else {
        setMessage({
          type: "error",
          text: "Failed to update profile",
        })
      }
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate(formData)
  }

  return (
    <M.Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <M.TextField
        fullWidth
        margin="normal"
        label="First Name"
        value={formData.first_name}
        onChange={(e) =>
          setFormData({ ...formData, first_name: e.target.value })
        }
      />
      <M.TextField
        fullWidth
        margin="normal"
        label="Last Name"
        value={formData.last_name}
        onChange={(e) =>
          setFormData({ ...formData, last_name: e.target.value })
        }
      />
      {message && (
        <M.Alert severity={message.type} sx={{ mt: 2 }}>
          {message.text}
        </M.Alert>
      )}
      <M.Button
        type="submit"
        variant="contained"
        fullWidth
        sx={{ mt: 2 }}
        disabled={updateMutation.isPending}
      >
        Update Profile
      </M.Button>
    </M.Box>
  )
}

function PasswordForm() {
  const { client } = useMaipl()
  const [message, setMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)
  const [formData, setFormData] = useState<PasswordFormData>({
    current_password: "",
    new_password: "",
    confirm_password: "",
  })

  const updateMutation = RQ.useMutation({
    mutationFn: (data: { current_password: string; password: string }) =>
      Profile.update(client, data),
    onSuccess: () => {
      setMessage({ type: "success", text: "Password updated successfully!" })
      setFormData({
        current_password: "",
        new_password: "",
        confirm_password: "",
      })
    },
    onError: (error: any) => {
      if (error.response?.data) {
        const backendError = error.response.data as BackendError
        const errorMessage = Object.entries(backendError)
          .map(([field, messages]) => `${messages.join(", ")}`)
          .join(". ")
        setMessage({
          type: "error",
          text: errorMessage,
        })
      } else {
        setMessage({
          type: "error",
          text: "Failed to update password",
        })
      }
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.new_password !== formData.confirm_password) {
      setMessage({ type: "error", text: "New passwords don't match" })
      return
    }
    updateMutation.mutate({
      current_password: formData.current_password,
      password: formData.new_password,
    })
  }

  return (
    <M.Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
      <M.Typography variant="h6" gutterBottom>
        Change Password
      </M.Typography>
      <M.TextField
        fullWidth
        margin="normal"
        label="Current Password"
        type="password"
        value={formData.current_password}
        onChange={(e) =>
          setFormData({ ...formData, current_password: e.target.value })
        }
      />
      <M.TextField
        fullWidth
        margin="normal"
        label="New Password"
        type="password"
        value={formData.new_password}
        onChange={(e) =>
          setFormData({ ...formData, new_password: e.target.value })
        }
      />
      <M.TextField
        fullWidth
        margin="normal"
        label="Confirm New Password"
        type="password"
        value={formData.confirm_password}
        onChange={(e) =>
          setFormData({ ...formData, confirm_password: e.target.value })
        }
      />
      {message && (
        <M.Alert severity={message.type} sx={{ mt: 2 }}>
          {message.text}
        </M.Alert>
      )}
      <M.Button
        type="submit"
        variant="contained"
        fullWidth
        sx={{ mt: 2 }}
        disabled={updateMutation.isPending}
      >
        Update Password
      </M.Button>
    </M.Box>
  )
}

function Usages() {
  const { client } = useMaipl()
  const { data } = RQ.useQuery({
    queryKey: ["files", "usage"],
    queryFn: () => File.usage(client),
    initialData: {
      public: 0,
      private: 0,
      raw: 0,
      dataset: 0,
      annotation: 0,
      model: 0,
      config: 0,
    },
  })
  return (
    <M.Stack spacing={2}>
      <M.Typography>Public Total {F.filesize(data.public)}</M.Typography>
      <M.Typography>Private Total {F.filesize(data.private)}</M.Typography>
      <M.Typography>Raw Data {F.filesize(data.raw)}</M.Typography>
      <M.Typography>Dataset {F.filesize(data.dataset)}</M.Typography>
      <M.Typography>Annotation {F.filesize(data.annotation)}</M.Typography>
      <M.Typography>Model {F.filesize(data.model)}</M.Typography>
      <M.Typography>Config {F.filesize(data.config)}</M.Typography>
    </M.Stack>
  )
}

export default function ProfilePage() {
  const navigate = RR.useNavigate()
  const [activeTab, setActiveTab] = useState(0)
  const { user } = useMaipl()

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
  }

  return (
    <Modal onClose={() => navigate(-1)}>
      <M.Box sx={{ position: "relative", minWidth: 600 }}>
        <M.IconButton
          onClick={() => navigate(-1)}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
          }}
        >
          <I.Close />
        </M.IconButton>

        <M.Stack alignItems="center" spacing={2} sx={{ pt: 2 }}>
          {user && (
            <>
              <M.Avatar
                sx={{ m: 1, bgcolor: "primary.main", width: 56, height: 56 }}
              >
                <I.AccountCircle />
              </M.Avatar>
              <M.Typography variant="h5">{`${user.first_name} ${user.last_name}`}</M.Typography>
              <M.Typography color="text.secondary">{user.email}</M.Typography>
            </>
          )}

          <M.Box sx={{ width: "100%" }}>
            <M.Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <M.Tabs
                value={activeTab}
                onChange={handleTabChange}
                aria-label="profile tabs"
                centered
              >
                <M.Tab label="Profile" />
                <M.Tab label="Password" />
                <M.Tab label="Storage" />
              </M.Tabs>
            </M.Box>

            <TabPanel value={activeTab} index={0}>
              <ProfileForm />
            </TabPanel>

            <TabPanel value={activeTab} index={1}>
              <PasswordForm />
            </TabPanel>

            <TabPanel value={activeTab} index={2}>
              <Usages />
            </TabPanel>
          </M.Box>
        </M.Stack>
      </M.Box>
    </Modal>
  )
}
