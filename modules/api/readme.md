# <a name="top"></a> @maipl/api

- [Client](#client)
- [Auth](#auth)
- [Batch](#batch)
- [File](#file)
- [Profile](#profile)
- [Segment](#segment)
- [Task](#task)
- [User](#user)

## <a name="client"></a> Client

```ts
type t
const guest: t
function create(config?: t_config): t
```

<small>[back to top](#top)</small>

## <a name="auth"></a> Auth

```ts
type t_access
type t_refresh
type t_pair

function login
function refresh
function tokens
```

<small>[back to top](#top)</small>

## <a name="batch"></a> Batch

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

<small>[back to top](#top)</small>

## <a name="file"></a> File

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

<small>[back to top](#top)</small>

## <a name="profile"></a> Profile

```ts
function get
function update
```

<small>[back to top](#top)</small>

## <a name="segment"></a> Segment

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

<small>[back to top](#top)</small>

## <a name="task"></a> Task

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

<small>[back to top](#top)</small>

## <a name="user"></a> User

```ts
type t

function get
function list
```

<small>[back to top](#top)</small>
