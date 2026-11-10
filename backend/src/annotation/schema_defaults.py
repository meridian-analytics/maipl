import json
from pathlib import Path


DEFAULT_ANNOTATION_SCHEMA_PATH = (
    Path(__file__).resolve().parent / "defaults" / "default_annotation_schema.json"
)
DEFAULT_ANNOTATION_SCHEMA_NAME = "Default marine mammal annotation schema"
DEFAULT_ANNOTATION_SCHEMA_DESCRIPTION = (
    "Classifies audio as Killer whale (KW), Humpback whale (HB), "
    "both species (KW+HB), or Background."
)


def load_default_annotation_schema():
    with DEFAULT_ANNOTATION_SCHEMA_PATH.open(encoding="utf-8") as schema_file:
        config = json.load(schema_file)

    if not isinstance(config.get("schema"), dict) or not isinstance(
        config.get("uiSchema"), dict
    ):
        raise ValueError("Default annotation schema must contain schema and uiSchema")
    return config


def get_default_annotation_schema_details():
    return {
        "name": DEFAULT_ANNOTATION_SCHEMA_NAME,
        "description": DEFAULT_ANNOTATION_SCHEMA_DESCRIPTION,
        "config": load_default_annotation_schema(),
    }
