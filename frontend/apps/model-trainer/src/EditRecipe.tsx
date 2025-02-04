import React, { useState, useEffect } from "react"
import model_recipe from "./schema/model_recipe.json"
import audio_repr from "./schema/audio_repr.json"
import recipe from "./schema/recipe.json"
import Form from "@rjsf/mui"
import validator from "@rjsf/validator-ajv8"
import recipe_ui_schema from "./schema/recipe_ui_schema.json"
import ui_schema from "./schema/ui_schema.json"
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
import * as MR from "@maipl/react"
import * as RQ from "@tanstack/react-query"
import { RecipeSchema, File } from "@maipl/api"

const schemas = [recipe]

const EditRecipe = ({ onClose }) => {
  const maipl = MR.useMaipl()
  const queryClient = RQ.useQueryClient()
  const { data: recipeSchemas } = RQ.useQuery({
    queryKey: ["recipe-schemas"],
    queryFn: () => RecipeSchema.list(maipl.client),
  })

  const interfaces = recipeSchemas?.map((schema) => schema.interface)

  const [name, setName] = useState("")
  const [tag, setTag] = useState("")
  const [selectedInterface, setSelectedInterface] = useState(null)
  const [showAdvancedFields, setShowAdvancedFields] = useState(false)

  useEffect(() => {
    const advancedFieldsSection = document.querySelector(".advanced_fields")
    if (advancedFieldsSection) {
      advancedFieldsSection.style.display = showAdvancedFields
        ? "block"
        : "none"
    }
  }, [showAdvancedFields, selectedInterface])

  const uploadFile = RQ.useMutation({
    mutationFn: (vars: Parameters<typeof File.create>) => File.create(...vars),
    onError: (err, vars) => {
      if (import.meta.env["DEV"]) {
        console.error("FileUpload uploadMutation error", err, vars)
      }
    },
    onSuccess: (file) => {
      console.log("File uploaded successfully", file)
      onClose()
      //refetch recipes
      queryClient.refetchQueries({ queryKey: ["files", "list"] })
    },
  })

  const handleSubmit = async (data) => {
    try {
      const file_data = {
        ...data.formData["essential_fields"],
        ...data.formData["advanced_fields"],
        interface: selectedInterface,
      }

      const file_json = JSON.stringify(file_data)

      const blob = new Blob([file_json], { type: "application/json" })

      await uploadFile.mutateAsync([
        maipl.client,
        {
          file: blob,
          maipl_folder: "recipe",
          meta: {},
          path: `${name}.json`,
          tag,
        },
      ])
    } catch (error) {
      console.error("Error in handleSubmit:", error)
    }
  }

  const handleError = (errors) => {
    console.log(errors)
  }

  return (
    <div>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5">Add new recipe</Typography>
        <Divider sx={{ mb: 4 }} />
        <TextField
          label="Recipe Name"
          variant="outlined"
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mb: 2 }}
          required
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
            value={selectedInterface || ""}
            onChange={(e) => setSelectedInterface(e.target.value)}
          >
            {interfaces?.map((i) => (
              <MenuItem key={i} value={i}>
                {i}
              </MenuItem>
            ))}
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
      {selectedInterface && (
        <Form
          schema={
            recipeSchemas.find((s) => s.interface === selectedInterface)?.schema
          }
          validator={validator}
          onError={handleError}
          onSubmit={handleSubmit}
          uiSchema={
            recipeSchemas.find((s) => s.interface === selectedInterface)
              ?.ui_schema
          }
        />
      )}
    </div>
  )
}

export default EditRecipe
