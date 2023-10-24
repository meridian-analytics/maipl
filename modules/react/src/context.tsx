import { Auth, Client, Profile, User } from "@maipl/api"
import * as Async from "@maipl/async"
import * as K from "@maipl/constants"
import * as PKCE from "@maipl/pkce"
import * as M from "@mui/material"
import * as RQ from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import * as A from "axios"
import * as R from "react"
import * as RR from "react-router-dom"
import * as Ui from "./ui.tsx"

type t_context = {
  client: Client.t
  enqueue: typeof Async.Pool.prototype.add
  user: null | User.t
  logout: () => void
}

const MaiplContext = R.createContext<t_context>({
  client: Client.guest,
  enqueue: () => {
    throw Error("enqueue called outside of MaiplContext")
  },
  user: null,
  logout: () => {
    throw Error("logout called outside of MaiplContext")
  },
})

function MaiplProvider(props: { children: R.ReactNode; poolSize?: number }) {
  // react-query
  const queryClient = R.useMemo(
    () =>
      new RQ.QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
          },
        },
      }),
    [],
  )
  return (
    <RQ.QueryClientProvider client={queryClient}>
      <RR.BrowserRouter>
        <M.ThemeProvider theme={Ui.theme}>
          <M.CssBaseline />
          <MaiplContextProvider
            children={props.children}
            poolSize={props.poolSize}
          />
        </M.ThemeProvider>
      </RR.BrowserRouter>
    </RQ.QueryClientProvider>
  )
}

function MaiplContextProvider(props: {
  children: R.ReactNode
  poolSize?: number
}) {
  // tokens
  const [access, setAccess] = R.useState(() => localStorage.getItem("access"))
  const [refresh, setRefresh] = R.useState(() =>
    localStorage.getItem("refresh"),
  )

  // client refresh and retry
  const refreshAndRetry = R.useCallback(
    async <T, R = A.AxiosResponse<T>>(err: A.AxiosError): Promise<R> => {
      if (err.request == null || err.response == null) throw err
      if (err.response.status != 401 || refresh == null) throw err
      if (err.config == null) throw err
      try {
        const { access: freshAccess } = await Auth.refresh(refresh)
        return Client.guest
          .request<T, R>({
            ...err.config,
            headers: {
              ...err.config.headers,
              Authorization: `JWT ${freshAccess}`,
            },
          })
          .finally(() => {
            if (freshAccess) {
              localStorage.setItem("access", freshAccess)
              setAccess(freshAccess)
            }
          })
      } catch (err) {
        if ((err as A.AxiosError)?.response?.status == 400) {
          // todo: bug? should server be responding 401 instead?
          localStorage.removeItem("access")
          localStorage.removeItem("refresh")
          setAccess(null)
          setRefresh(null)
        }
        return undefined as R
      }
    },
    [refresh],
  )

  // client
  const client: Client.t = R.useMemo(
    () =>
      access == null
        ? Client.guest
        : Client.create({
            headers: {
              Authorization: `JWT ${access}`,
            },
            onError: refreshAndRetry,
          }),
    [access, refreshAndRetry],
  )

  // user
  const { data: user } = RQ.useQuery({
    enabled: client.isGuest == false,
    initialData: null,
    queryKey: ["user", "profile"],
    queryFn: () => Profile.get(client),
  })

  // pool
  const pool = R.useRef(new Async.Pool(props.poolSize ?? 5)).current

  // context
  const context: t_context = {
    client,
    enqueue: pool.add,
    user,
    logout: () => {
      localStorage.removeItem("access")
      localStorage.removeItem("refresh")
      setAccess(null)
      setRefresh(null)
    },
  }

  // provider
  return (
    <MaiplContext.Provider value={context}>
      {client.isGuest ? (
        <MaiplContext.Provider value={context}>
          <RR.Routes>
            <RR.Route path="/auth" element={<CompleteAuthFlow />} />
            <RR.Route path="*" element={<BeginAuthFlow />} />
          </RR.Routes>
        </MaiplContext.Provider>
      ) : (
        <RR.Routes>
          <RR.Route path="/dashboard" element={<Ui.Dashboard />} />
          <RR.Route path="/profile" element={<Ui.Profile />} />
          <RR.Route path="*" element={props.children} />
        </RR.Routes>
      )}
      {K.MAIPL_REACT_QUERY_DEVTOOLS && <ReactQueryDevtools />}
    </MaiplContext.Provider>
  )
}

/**
 * Context.BeginAuthFlow
 * Initialize a PKCE Authorization Code Flow
 * 1. the url is MAIPL_MYAPP_FRONTEND/path/to/anything
 * 2. generate PKCE {verifier} and {challenge}
 * 3. persist {verifier} to localStorage
 * 4. {next} is the current url
 * 5. redirect to MAIPL_AUTH_FRONTEND/signin/?next={next}&challenge={challenge}
 */
function BeginAuthFlow() {
  R.useEffect(() => {
    async function redirect() {
      // create verifier and challenge
      const verifier = PKCE.createVerifier()
      localStorage.setItem("code_verifier", verifier)
      // redirect
      const query = new URLSearchParams({
        next: window.location.href,
        challenge: await PKCE.createChallenge(verifier),
      })
      window.location.replace(`${K.MAIPL_AUTH_FRONTEND}/signin?${query}`)
    }
    redirect().catch(err => {
      console.error("failed to redirect to login", err)
    })
  }, [])
  return <></>
}

/**
 * Context.CompleteAuthFlow
 * Complete exchange of Authorization Code for tokens
 * 1. the url is MAIPL_MYAPP_FRONTEND/auth/?next={next}&code={code}
 * 1. exchange {code} and {verifier} for {access} and {refresh}
 * 2. persist {access} and {refresh}
 * 3. remove {verifier} from localStorage
 * 3. redirect to {next}
 */
function CompleteAuthFlow() {
  const [searchParams, _setSearchParams] = RR.useSearchParams()
  const next = searchParams.get("next")
  const code = searchParams.get("code")
  const verifier = localStorage.getItem("code_verifier")
  R.useEffect(() => {
    async function redirect() {
      // null checks
      if (verifier == null) throw Error("code verifier not found")
      if (code == null) throw Error("authorization code not found")
      if (next == null) throw Error("redirect url not found")
      // get tokens
      const { access, refresh } = await Auth.tokens({ code, verifier })
      localStorage.removeItem("code_verifier")
      localStorage.setItem("access", access)
      localStorage.setItem("refresh", refresh)
      // redirect
      window.location.replace(next)
    }
    redirect().catch(err => {
      console.error("failed to redirect after login", err)
    })
  }, [next, code])
  return <></>
}

const useMaipl = () => R.useContext(MaiplContext)

export { type t_context, MaiplProvider, useMaipl }
