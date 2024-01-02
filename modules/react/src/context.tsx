import { Auth, Client, Profile, User } from "@maipl/api"
import * as Async from "@maipl/async"
import * as K from "@maipl/constants"
import * as JS from "@maipl/js"
import * as PKCE from "@maipl/pkce"
import * as M from "@mui/material"
import * as RQ from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import * as A from "axios"
import * as R from "react"
import * as RR from "react-router-dom"
import * as MR from "./index.ts"

type t_client = Client.t

type t_context = {
  client: t_client
  enqueue: typeof Async.Pool.prototype.add
  user: null | User.t
  logout: () => void
}

type t_router = (context: t_context) => Array<RR.RouteObject>

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

function MaiplProvider(props: {
  basename?: string
  poolSize?: number
  router: t_router
}) {
  return (
    <MaiplRootProvider>
      <MaiplContextProvider
        basename={props.basename}
        poolSize={props.poolSize}
        router={props.router}
      />
    </MaiplRootProvider>
  )
}

function MaiplRootProvider(props: { children: R.ReactNode }) {
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
      <M.ThemeProvider theme={MR.theme}>
        <M.CssBaseline />
        <MR.NotificationProvider>{props.children}</MR.NotificationProvider>
      </M.ThemeProvider>
    </RQ.QueryClientProvider>
  )
}

function MaiplContextProvider(props: {
  basename?: string
  poolSize?: number
  router: t_router
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
    [refresh, setAccess, setRefresh],
  )

  // client
  const client: t_client = R.useMemo(
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

  const router = RR.createBrowserRouter(
    client.isGuest
      ? [
          {
            path: "/auth",
            element: <CompleteAuthFlow />,
          },
          {
            path: "*",
            element: <BeginAuthFlow />,
          },
        ]
      : [
          {
            path: "/dashboard",
            element: <MR.Dashboard />,
          },
          {
            path: "/profile",
            element: <MR.Profile />,
          },
          ...props.router(context),
        ],
    {
      basename: props.basename || import.meta.env.BASE_URL || "/",
    },
  )

  // provider
  return (
    <MaiplContext.Provider value={context}>
      <RR.RouterProvider router={router} />
      {K.MAIPL_REACT_QUERY_DEVTOOLS && (
        <ReactQueryDevtools buttonPosition="bottom-left" />
      )}
    </MaiplContext.Provider>
  )
}

/**
 * Context.BeginAuthFlow
 * Initialize a PKCE Authorization Code Flow
 * useHref is used to ensure proper BASE_URL is used
 * 1. the url is MAIPL_MYAPP_FRONTEND/path/to/anything
 * 2. generate PKCE {verifier} and {challenge}
 * 3. persist {verifier} to localStorage
 * 4. {next} is the current url
 * 5. redirect to MAIPL_AUTH_FRONTEND/signin/?next={next}&challenge={challenge}
 */
function BeginAuthFlow() {
  const next = String(
    new URL(
      RR.useHref({
        pathname: "/auth",
        search: `?${new URLSearchParams({
          next: RR.useHref(RR.useLocation()),
        })}`,
      }),
      window.location.href,
    ),
  )
  R.useEffect(() => {
    async function redirect() {
      // todo next invariant
      // create verifier and challenge
      const verifier = PKCE.createVerifier()
      localStorage.setItem("code_verifier", verifier)
      // redirect
      const query = new URLSearchParams({
        next,
        challenge: await PKCE.createChallenge(verifier),
      })
      window.location.replace(`${K.MAIPL_AUTH_FRONTEND}/signin?${query}`)
    }
    redirect().catch(err => {
      console.error("failed to redirect to login", err)
    })
  }, [next])
  return <></>
}

/**
 * Context.CompleteAuthFlow
 * Complete exchange of Authorization Code for tokens
 * 1. the url is MAIPL_MYAPP_FRONTEND/auth/?next={next}&code={code}
 * 2. exchange {code} and {verifier} for {access} and {refresh}
 * 3. persist {access} and {refresh}
 * 4. remove {verifier} from localStorage
 * 5. redirect to {next}
 */
function CompleteAuthFlow() {
  const [searchParams, _setSearchParams] = RR.useSearchParams()
  const next = searchParams.get("next")
  const code = searchParams.get("code")
  const verifier = localStorage.getItem("code_verifier")
  R.useEffect(() => {
    async function redirect() {
      // invariants
      JS.invariant(verifier, "code verifier not found")
      JS.invariant(code, "authorization code not found")
      JS.invariant(next, "redirect url not found")
      // get tokens
      const { access, refresh } = await Auth.tokens({ code, verifier })
      // persist
      JS.invariant(access, "access token not found")
      JS.invariant(refresh, "refresh token not found")
      localStorage.removeItem("code_verifier")
      localStorage.setItem("access", access)
      localStorage.setItem("refresh", refresh)
      // redirect
      window.location.replace(next)
    }
    redirect().catch(err => {
      console.error("failed to redirect after login", err)
    })
  }, [next, code, verifier])
  return <></>
}

const useMaipl = () => R.useContext(MaiplContext)

export {
  type t_client,
  type t_context,
  type t_router,
  MaiplProvider,
  MaiplRootProvider,
  useMaipl,
}
