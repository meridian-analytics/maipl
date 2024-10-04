import React, { useState, useEffect } from "react"
import model_recipe from "./data/model_recipe.json"
import audio_repr from "./data/audio_repr.json"
import recipe from "./data/recipe.json"
import Form from "@rjsf/mui"
import validator from "@rjsf/validator-ajv8"
import recipe_ui_schema from "./data/recipe_ui_schema.json"
import ui_schema from "./data/ui_schema.json"
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Typography,
  Divider,
} from "@mui/material"

const schemas = [recipe]

const EditRecipe = () => {

  const [name, setName] = useState("")
  const [tag, setTag] = useState("")
  const [interf, setInterf] = useState("")
  const [showAdvancedFields, setShowAdvancedFields] = useState(false)

  useEffect(() => {
    const advancedFieldsSection = document.querySelector(".advanced_fields")
    if (advancedFieldsSection) {
      advancedFieldsSection.style.display = showAdvancedFields
        ? "block"
        : "none"
    }
  }, [showAdvancedFields])

  


  const handleSubmit = (data) => {
    console.log({
      ...data.formData['essential_fields'],
      ...data.formData['advanced_fields']
    })
  }

  const handleError = (errors) => {
    console.log(errors)
  }

  return (
    <div>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5">Recipe</Typography>
        <Divider sx={{ mb: 4 }} />
        <TextField
          label="RecipeName"
          variant="outlined"
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          label="Tag"
          variant="outlined"
          fullWidth
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          sx={{ mb: 2 }}
        />
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="interf-label">Interface</InputLabel>
          <Select
            label="Interface"
            value={interf || ""}
            onChange={(e) => setInterf(e.target.value)}
          >
            <MenuItem value="option1">Option 1</MenuItem>
            <MenuItem value="option2">Option 2</MenuItem>
            <MenuItem value="option3">Option 3</MenuItem>
          </Select>
        </FormControl>
        <FormControlLabel
          control={
            <Switch
              checked={showAdvancedFields}
              onChange={(e) => setShowAdvancedFields(e.target.checked)}
            />
          }
          label="Show Advanced Fields"
        />
      </Box>
      <Form
        schema={schemas[0]["schema"]}
        validator={validator}
        onError={handleError}
        onSubmit={handleSubmit}
        uiSchema={ui_schema}
      />
    </div>
  )
}

export default EditRecipe
