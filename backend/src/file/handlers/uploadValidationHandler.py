from rest_framework.exceptions import ValidationError
from constance import config


class UploadValidationHandler:
    """
    UploadValidationHandler class
    """

    folder_contentType = {
        "annotations": config.ANNOTATION_CONTENT_TYPE.split(","),
        "annotation schemas": config.CONFIG_CONTENT_TYPE.split(","),
        "audio files": config.RAW_CONTENT_TYPE.split(","),
        "models": config.MODEL_CONTENT_TYPE.split(","),
        "metrics": config.METRICS_CONTENT_TYPE.split(","),
        ".h5 database": config.DATASET_CONTENT_TYPE.split(","),
        "model recipes": config.RECIPE_CONTENT_TYPE.split(","),
        "audio configs": config.RECIPE_CONTENT_TYPE.split(","),
    }

    def __init__(self, request):
        self.files = request.data.getlist("file")
        self.folder = request.data.get("maipl_folder", None)

    def validate(self):
        """
        Validate the files and folder
        """
        for file in self.files:
            self.__validate_file(file)

    def __validate_file(self, file):
        """
        Validate the file
        """
        content_type = file.content_type

        # check with the given folder, the content type of the file is valid or not:
        if content_type not in self.folder_contentType.get(self.folder, []):
            raise ValidationError(
                {
                    "error": f"Invalid content type:\"{content_type}\" for {self.folder} folder"
                }
            )
