import { Auth } from "@maipl/api"
import * as JS from "@maipl/js"
import * as MR from "@maipl/react"
import * as I from "@mui/icons-material"
import * as M from "@mui/material"
import * as RQ from "@tanstack/react-query"
import * as R from "react"
import * as RR from "react-router-dom"

export default function Signin() {
  const notify = MR.useNotify()
  const [email, setEmail] = R.useState("")
  const [password, setPassword] = R.useState("")
  const [searchParams, _setSearchParams] = RR.useSearchParams()
  const next = searchParams.get("next")
  const challenge = searchParams.get("challenge")

  const login = (event: R.FormEvent) => {
    event.preventDefault()
    if (loginMutation.isIdle) {
      return loginMutation.mutateAsync([
        {
          email,
          password,
          next: next!, // validated by invariant
          challenge: challenge!, // validated by invariant
        },
      ])
    }
  }

  const loginMutation = RQ.useMutation({
    mutationFn: (vars: Parameters<typeof Auth.login>) => {
      JS.invariant(next, "redirect url not found")
      JS.invariant(challenge, "pkce challenge not found")
      return Auth.login(...vars).then(auth => {
        try {
          const redirect = new URL(next)
          redirect.searchParams.set("code", auth.code)
          return String(redirect)
        } catch (err) {
          throw Error(`invalid redirect url: ${next}`)
        }
      })
    },
    onError: (err, vars) => {
      notify(onClose => (
        <M.Alert onClose={onClose} severity="error">
          Error: Could not login
        </M.Alert>
      ))
      if (import.meta.env["DEV"]) {
        console.error("Signin loginMutation error", err, vars)
      }
    },
    onSettled: () => {
      loginMutation.reset()
    },
    onSuccess: redirect => {
      window.location.replace(redirect)
    },
  })

  return (
    <M.Grid container component="main" sx={{ height: "100vh" }}>
      <M.Grid
        item
        xs={false}
        sm={4}
        md={6}
        sx={{
          backgroundRepeat: "no-repeat",
          backgroundColor: t =>
            t.palette.mode === "light"
              ? t.palette.grey[50]
              : t.palette.grey[900],
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <M.Grid
        item
        xs={12}
        sm={8}
        md={6}
        component={M.Paper}
        elevation={6}
        square
        sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}
      >
        <M.Box
          sx={{
            mx: 10,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <M.Avatar sx={{ m: 1, bgcolor: "primary.main" }}>
            <I.LockOutlined />
          </M.Avatar>
          <M.Typography component="h1" variant="h5" children="Sign in" />
          <M.Box component="form" noValidate onSubmit={login} sx={{ mt: 1 }}>
            <M.TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              onChange={e => setEmail(e.currentTarget.value)}
            />
            <M.TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              onChange={e => setPassword(e.currentTarget.value)}
            />
            <M.FormControlLabel
              control={<M.Checkbox value="remember" color="primary" />}
              label="Remember me"
            />
            <M.Button
              disabled={
                loginMutation.isPending || email == "" || password == ""
              }
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              children="Sign in"
            />
            <M.Grid container>
              <M.Grid item xs>
                <M.Link href="#" variant="body2" children="Forgot password?" />
              </M.Grid>
              <M.Grid item>
                <M.Link
                  href="#"
                  variant="body2"
                  children="Don't have an account? Sign Up"
                />
              </M.Grid>
            </M.Grid>
          </M.Box>
        </M.Box>
      </M.Grid>
    </M.Grid>
  )
}
