from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema


def annotation_batch_segment_view_schema(request_type):
    """
    A decorator to add swagger documentation to the process_batch function
    """
    if request_type == "put":
        return swagger_auto_schema(
            operation_description="A PUT API to create or update a list of annotations for a specific batch and segment",
            request_body=openapi.Schema(
                type=openapi.TYPE_ARRAY,
                items=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        "id": openapi.Schema(
                            type=openapi.TYPE_STRING, description="ID of the annotation"
                        ),
                        "region": openapi.Schema(
                            type=openapi.TYPE_OBJECT,
                            description="Region of the annotation",
                        ),
                        "created_at": openapi.Schema(
                            type=openapi.TYPE_STRING,
                            description="Created at timestamp of the annotation",
                        ),
                    },
                    required=["id", "region", "created_at"],
                ),
            ),
            responses={
                200: openapi.Response(
                    description="OK: Success!",
                    schema=openapi.Schema(
                        type=openapi.TYPE_ARRAY,
                        items=openapi.Schema(
                            type=openapi.TYPE_OBJECT,
                            properties={
                                "id": openapi.Schema(
                                    type=openapi.TYPE_STRING,
                                    description="ID of the annotation",
                                ),
                                "segment": openapi.Schema(
                                    type=openapi.TYPE_STRING,
                                    description="ID of the segment",
                                ),
                                "batch": openapi.Schema(
                                    type=openapi.TYPE_STRING,
                                    description="ID of the batch",
                                ),
                                "file": openapi.Schema(
                                    type=openapi.TYPE_STRING,
                                    description="ID of the file",
                                ),
                                "region": openapi.Schema(
                                    type=openapi.TYPE_OBJECT,
                                    description="Region of the annotation",
                                ),
                                "created_at": openapi.Schema(
                                    type=openapi.TYPE_STRING,
                                    description="Created at timestamp of the annotation",
                                ),
                                "user_id": openapi.Schema(
                                    type=openapi.TYPE_STRING,
                                    description="ID of the user who created the annotation",
                                ),
                            },
                            required=[
                                "id",
                                "segment",
                                "batch",
                                "file",
                                "region",
                                "created_at",
                                "user_id",
                            ],
                        ),
                    ),
                ),
                400: "Bad Request: Invalid input!",
            },
            manual_parameters=[
                openapi.Parameter(
                    "batch_id",
                    openapi.IN_PATH,
                    description="ID of the batch to create or update annotations for",
                    type=openapi.TYPE_STRING,
                ),
                openapi.Parameter(
                    "segment_id",
                    openapi.IN_PATH,
                    description="ID of the segment to create or update annotations for",
                    type=openapi.TYPE_STRING,
                ),
            ],
        )

    if request_type == "get":
        return swagger_auto_schema(
            operation_description="A GET API to retrieve a list of annotations for a specific batch and segment",
            responses={
                200: openapi.Response(
                    description="OK: Annotations retrieved successfully!",
                    schema=openapi.Schema(
                        type=openapi.TYPE_ARRAY,
                        items=openapi.Schema(
                            type=openapi.TYPE_OBJECT,
                            properties={
                                "id": openapi.Schema(
                                    type=openapi.TYPE_STRING,
                                    description="ID of the annotation",
                                ),
                                "segment": openapi.Schema(
                                    type=openapi.TYPE_STRING,
                                    description="ID of the segment",
                                ),
                                "batch": openapi.Schema(
                                    type=openapi.TYPE_STRING,
                                    description="ID of the batch",
                                ),
                                "file": openapi.Schema(
                                    type=openapi.TYPE_STRING,
                                    description="ID of the file",
                                ),
                                "region": openapi.Schema(
                                    type=openapi.TYPE_OBJECT,
                                    description="Region of the annotation",
                                ),
                                "created_at": openapi.Schema(
                                    type=openapi.TYPE_STRING,
                                    description="Created at timestamp of the annotation",
                                ),
                                "user_id": openapi.Schema(
                                    type=openapi.TYPE_STRING,
                                    description="ID of the user who created the annotation",
                                ),
                            },
                            required=[
                                "id",
                                "segment",
                                "batch",
                                "file",
                                "region",
                                "created_at",
                                "user_id",
                            ],
                        ),
                    ),
                ),
                404: "Not Found: Annotations for the given batch and segment were not found!",
            },
            manual_parameters=[
                openapi.Parameter(
                    "batch_id",
                    openapi.IN_PATH,
                    description="ID of the batch to retrieve annotations for",
                    type=openapi.TYPE_STRING,
                ),
                openapi.Parameter(
                    "segment_id",
                    openapi.IN_PATH,
                    description="ID of the segment to retrieve annotations for",
                    type=openapi.TYPE_STRING,
                ),
            ],
        )


def process_batch_view_schema(request_type):
    """
    A decorator to add swagger documentation to the process_batch function
    """
    if request_type == "post":
        return swagger_auto_schema(
            operation_description="A POST API to start processing a batch and return a task id for checking the status",
            request_body=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    "batch_id": openapi.Schema(
                        type=openapi.TYPE_STRING,
                        description="ID of the batch to be processed",
                    ),
                },
                required=["batch_id"],
            ),
            responses={
                202: openapi.Response(
                    description="Accepted: Task has been created successfully",
                    schema=openapi.Schema(
                        type=openapi.TYPE_OBJECT,
                        properties={
                            "task_id": openapi.Schema(
                                type=openapi.TYPE_STRING,
                                description="ID of the created task",
                            ),
                            "message": openapi.Schema(
                                type=openapi.TYPE_STRING,
                                description="Acknowledgement message",
                            ),
                        },
                    ),
                ),
                400: "Bad Request: Invalid input!",
            },
        )

    if request_type == "get":
        return swagger_auto_schema(
            operation_description="A GET API to retrieve the status of a batch",
            responses={
                200: openapi.Response(
                    description="OK: Status retrieved successfully!",
                    schema=openapi.Schema(
                        type=openapi.TYPE_OBJECT,
                        properties={
                            "status": openapi.Schema(
                                type=openapi.TYPE_STRING,
                                description="Status of the batch",
                            ),
                        },
                    ),
                ),
                404: "Not Found: Batch with the given ID was not found!",
            },
            manual_parameters=[
                openapi.Parameter(
                    "batch_id",
                    openapi.IN_PATH,
                    description="ID of the batch to retrieve status for",
                    type=openapi.TYPE_STRING,
                ),
            ],
        )


def task_status_view_schema(request_type):
    """
    A decorator to add swagger documentation to the task_status function
    """
    if request_type == "get":
        return swagger_auto_schema(
            operation_description="A GET API to fetch the status of a task",
            responses={
                200: openapi.Response(
                    description="OK: Success!",
                    schema=openapi.Schema(
                        type=openapi.TYPE_OBJECT,
                        properties={
                            "task_id": openapi.Schema(
                                type=openapi.TYPE_STRING, description="ID of the task"
                            ),
                            "status": openapi.Schema(
                                type=openapi.TYPE_STRING,
                                description="Status of the task",
                            ),
                        },
                    ),
                ),
                400: "Bad Request: Invalid input!",
                404: "Not Found: Task not found!",
            },
            manual_parameters=[
                openapi.Parameter(
                    "task_id",
                    openapi.IN_PATH,
                    description="ID of the task to fetch the status for",
                    type=openapi.TYPE_STRING,
                ),
            ],
        )
