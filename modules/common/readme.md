# <a name="maipl"></a> @meridian/maipl-common

- [@meridian/maipl-common](#maipl)
- [Install](#install)
- [Client](#client)
- [Context](#context)
- [API](#api)
  - [Auth](#api-auth)
  - [Batch](#api-batch)
  - [File](#api-file)
  - [Profile](#api-profile)
  - [Segment](#api-segment)
  - [Task](#api-task)
  - [User](#api-user)
- [Modules](#modules)
  - [Async](#async)
  - [Format](#format)
  - [Hooks](#hooks)
  - [Table](#table)
  - [Ui](#ui)
- [Development](#development)
    - [Release a version](#development-release)
    - [Build](#development-build)

# <a name="install"></a> Install

Install the base package:

```sh
$ pnpm i @meridian/maipl-common
```

Install peer dependencies:

```sh
$ pnpm i                \
  @emotion/react        \
  @emotion/styled       \
  @mui/icons-material   \
  @mui/material         \
  @tanstack/react-query \
  @tanstack/react-table \
  axios                 \
  react-router-dom

$ pnpm i -D @tanstack/react-query-devtools
```

<small>[back to top](#maipl)</small>

# <a name="client"></a> Client

> todo: client docs

<small>[back to top](#maipl)</small>

# <a name="context"></a> Context

The context module provides:

* Access to `BrowserRouter` context for routing
* Access to `queryClient` context for react-query
* Access to MAIPL API and shared state
* Authorization flow for guests
* Matcher for `/auth` to complete authorization flow
* Matcher for `/dashboard`
* `ThemeProvider` and common theme and `CssBassline`
* App wrapper including `Navbar` and `Notifications`

```tsx
import { MaiplProvider } from "@maipl/common/context"

<MaiplProvider>
  {/* children only rendered if user has a valid access token */}
  <Switch>
    <Route path="/" element={<Navigate to="/files" replace >} />
    <Route path="/files" element {<Files />} />
    …
  </Switch>
</MaiplProvider>
```

Whenever tokens are updated, a new `client` is automatically configured to use new tokens.

```ts
type t_context = {
  client: Client.t // used for all API requests
}
```

<small>[back to top](#maipl)</small>

# <a name="api"></a> API

## <a name="api-auth"></a> Auth

```ts
type t_access
type t_refresh
type t_pair

function login
function refresh
function tokens
```

<small>[back to top](#maipl)</small>

## <a name="api-batch"></a> Batch

```ts
type t
type t_list_item
type t_parameters
type t_create_request
type t_create_response
type t_get_response
type t_filter_params
type t_list_request
type t_list_response
type t_update_request

function audios
function create
function delete
function export
function get
function images
function list
function patch
function process
function update
```

<small>[back to top](#maipl)</small>

## <a name="api-file"></a> File

```ts
type t
type t_create_request
type t_create_response
type t_delete_request
type t_delete_response
type t_get_request
type t_get_response
type t_list_request
type t_list_response
type t_maipl_folder
type t_meta
type t_update_request
type t_update_response
type t_usage

function create
function delete
function get
function list
function meta
function update
function usage
```

<small>[back to top](#maipl)</small>

## <a name="api-profile"></a> Profile

```ts
function get
function update
```

<small>[back to top](#maipl)</small>

## <a name="api-segment"></a> Segment

```ts
type t
type t_audio
type t_image
type t_create_request
type t_create_response
type t_get_response
type t_filter_params
type t_list_request
type t_list_response

function create
function delete
function get
function list
```

<small>[back to top](#maipl)</small>

## <a name="api-task"></a> Task

```ts
type t
type t_create_request
type t_create_response
type t_filter_params
type t_get_response
type t_list_request
type t_list_response

function create
function get
function list
```

<small>[back to top](#maipl)</small>

## <a name="api-user"></a> User

```ts
type t

function get
function list
```

<small>[back to top](#maipl)</small>

# <a name="modules"></a> Modules

## <a name="async"></a> Async

```ts
function retry<T
function sleep(ms: number): Promise<void>
function timeout<T>(task: () => Promise<T>, ms: number): Promise<T>

class Pool
```

## <a name="format"></a> Format

```ts
function filesize(bytes: number): string
function fuzzyTime(date: Date): string
function iso8601(date: Date): string
function safeParseBool(value: unknown, orElse = false): boolean
function safeParseNumber<T>(value: unknown, orElse: T): number | T
function safeParseInteger<T>(value: unknown, orElse: T): number | T
function safeParseString(value: unknown, orElse: string): string
```

## <a name="hooks"></a> Hooks

```ts
function useDebounce
function useFilter
function useMaipl
```

## <a name="table"></a> Table

```ts
type ColumnDef<T, TID=number>
type PaginationState
type SelectionState<T, TID=number>
type VisibilityState

function usePagination
function useSelection
function useTable
function Table

function Batches
function Files
function Segments
function Tasks
```


## <a name="ui"></a> Ui

```ts
const theme

function Dashboard
function Filter
function Modal
function Navbar
function Notifications
```

<small>[back to top](#maipl)</small>

# <a name="development"></a> Development

### <a name="development-release"></a> Release a version

Starting with a clean repo on the `main` branch, update `package.json` with the new `version`.

```js
{
  "type": "module",
  "name": "@meridian/maipl-common",
  "version": "1.2.3" // <- new version
  …
}
```

Commit the changes, tag the commit, and push with the `--tags` option.

```sh
$ git commit -m "version 1.2.3"
$ git tag v1.2.3
$ git push && git push --tags
```

### <a name="development-build"></a> Build

To build this project run the `build` script provided by `package.json`.


```sh
$ npm run build
```

After the `build` script completes, a `dist` folder is output in the project's working directory.

The `dist` folder is designated as `files` in `package.json` which is used to build the distributable package.

The package is now ready to be published.

```sh
$ npm publish # todo: publish config
```
