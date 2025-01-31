from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema

from .serializers import ReadSerializer

def file_list_view_schema(method):
    if method == "GET":
        return swagger_auto_schema(
            operation_description="List all files.",
            # query parameters
            manual_parameters=[
                openapi.Parameter(
                    "maipl_folder",
                    openapi.IN_QUERY,
                    description="Folder name",
                    type=openapi.TYPE_STRING,
                ),
                openapi.Parameter(
                    "tag",
                    openapi.IN_QUERY,
                    description="Tag",
                    type=openapi.TYPE_STRING,
                ),
                openapi.Parameter(
                    "shared",
                    openapi.IN_QUERY,
                    description="True to show shared files, False to show unshared files, All to show all files",
                    type=openapi.TYPE_BOOLEAN,
                ),
                openapi.Parameter(
                    "path",
                    openapi.IN_QUERY,
                    description="File path",
                    type=openapi.TYPE_STRING,
                ),
                openapi.Parameter(
                    "size",
                    openapi.IN_QUERY,
                    description="Max number of files to return per page",
                    type=openapi.TYPE_INTEGER,
                ),
                openapi.Parameter(
                    "page",
                    openapi.IN_QUERY,
                    description="Page number",
                    type=openapi.TYPE_INTEGER,
                ),
            ],
            responses={
                200: ReadSerializer(many=True),
                400: "Bad Request",
            },
        )


def file_detail_view_schema(method):

    if method == "PUT":
        return swagger_auto_schema(
            operation_description="Update a file's metadata and content. file and sha256 must be provided if path is updated. If file is provided, sha256 must be provided as well.",
            request_body=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    "maipl_folder": openapi.Schema(
                        type=openapi.TYPE_STRING, description="Folder name"
                    ),
                    "meta": openapi.Schema(
                        type=openapi.TYPE_OBJECT, description="Metadata as JSON string"
                    ),
                    "path": openapi.Schema(
                        type=openapi.TYPE_STRING, description="File path"
                    ),
                    "tag": openapi.Schema(type=openapi.TYPE_STRING, description="Tag"),
                    "file": openapi.Schema(
                        type=openapi.TYPE_FILE, description="File content"
                    ),
                    "sha256": openapi.Schema(
                        type=openapi.TYPE_STRING, description="SHA256 hash of the file"
                    ),
                },
                required=[],  # no fields are strictly required for every request
            ),
            responses={
                200: ReadSerializer,
                400: "Bad Request",
            },
            consumes=("multipart/form-data",),
        )


def set_file_shared_view_schema(method):

    if method == "post":
        return swagger_auto_schema(
            operation_description="Handle files sharing",
            request_body=openapi.Schema(
                type=openapi.TYPE_ARRAY,
                items=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        "file": openapi.Schema(
                            type=openapi.TYPE_INTEGER, description="File id"
                        ),
                        "changes": openapi.Schema(
                            type=openapi.TYPE_ARRAY,
                            description="List of [user id (integer), change (boolean)]",
                            items=openapi.Schema(
                                type=openapi.TYPE_ARRAY,
                                minItems=2,
                                maxItems=2,
                                items=[
                                    openapi.Schema(
                                        type=openapi.TYPE_INTEGER,
                                        title="user_id",
                                        description="User id",
                                    ),
                                    openapi.Schema(
                                        type=openapi.TYPE_BOOLEAN,
                                        title="Shared",
                                        description="True to share, False to unshare",
                                    ),
                                ],
                            ),
                        ),
                    },
                ),
            ),
            responses={
                200: "OK",
                400: "Bad Request",
            },
        )
