# <a name="maipl"></a> MAIPL

Welcome to the MAIPL workspace.

# <a name="dev"></a> Development

### <a name="dev-install"></a> Install and run

Install workspace dependencies:

```sh
$ pnpm -r i
```

Run apps in dev mode:

```sh
$ pnpm @start
```

### <a name="dev-format"></a> Format and delint

Automatically format all source code in the workspace:

```sh
$ pnpm @format
```

Check for lint in the workspace:

```sh
$ pnpm @check
```

### <a name="dev-build"></a> Build and preview

Build apps:

```sh
$ pnpm @build
```

Run the app build previews:

```sh
$ pnpm @preview
```

### <a name="dev-schema"></a> Annotation Schema Setup

When creating a batch, you need to provide a JSON schema that defines the structure of your annotations. Here's a guide on how to create a valid schema:

#### Basic Schema Structure

```json
{
  "schema": {
    "properties": {
      "field_name": {
        "type": "string|number|boolean",
        "title": "Field Display Name"
      }
    },
    "type": "object"
  },
  "uiSchema": {
    "field_name": {
      "ui:widget": "WidgetType"
    }
  }
}
```

#### Supported Field Types

1. **String with Enum (Dropdown)**

```json
{
  "properties": {
    "label": {
      "type": "string",
      "enum": ["option1", "option2", "option3"],
      "title": "Label"
    }
  }
}
```

2. **String with AnyOf (Multiple Choice)**

```json
{
  "properties": {
    "label": {
      "type": "string",
      "anyOf": [
        { "const": "option1", "title": "Option 1" },
        { "const": "option2", "title": "Option 2" }
      ],
      "title": "Label"
    }
  }
}
```

3. **String with OneOf (Single Choice)**

```json
{
  "properties": {
    "label": {
      "type": "string",
      "oneOf": [
        { "const": "option1", "title": "Option 1" },
        { "const": "option2", "title": "Option 2" }
      ],
      "title": "Label"
    }
  }
}
```

4. **Number Field**

```json
{
  "properties": {
    "score": {
      "type": "number",
      "minimum": 0,
      "maximum": 1,
      "title": "Score"
    }
  }
}
```

5. **Boolean Field**

```json
{
  "properties": {
    "is_valid": {
      "type": "boolean",
      "title": "Is Valid"
    }
  }
}
```

#### Supported UI Widgets

- `SelectWidget`: For enum fields (dropdown)
- `EnumWidget`: For anyOf/oneOf fields (multiple/single choice)
- `NumberMinMaxWidget`: For number fields with min/max
- `CheckboxesWidget`: For boolean fields

#### Important Notes

1. The `score` field is automatically made read-only in the UI
2. All fields must be inside a `properties` object
3. The root must have `"type": "object"`
4. Each field must have a `type` property
5. For enum/anyOf/oneOf:
   - Each option must have a `const` and `title`
   - The field must be of type "string"
6. For numbers:
   - Can have `minimum`, `maximum`, and `multipleOf`

#### Complete Example

```json
{
  "schema": {
    "properties": {
      "label": {
        "type": "string",
        "enum": ["positive", "negative", "neutral"],
        "title": "Label"
      },
      "score": {
        "type": "number",
        "minimum": 0,
        "maximum": 1,
        "title": "Confidence Score"
      },
      "is_valid": {
        "type": "boolean",
        "title": "Is Valid"
      }
    },
    "type": "object"
  },
  "uiSchema": {
    "label": {
      "ui:widget": "SelectWidget",
      "ui:placeholder": "Select a label..."
    },
    "score": {
      "ui:widget": "NumberMinMaxWidget"
    },
    "is_valid": {
      "ui:widget": "CheckboxesWidget"
    }
  }
}
```

<small>[back to top](#maipl)</small>
