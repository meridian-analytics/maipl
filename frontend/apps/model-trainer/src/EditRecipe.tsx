import { useState, useEffect, useMemo } from "react"
import Form from "@rjsf/mui"
import validator from "@rjsf/validator-ajv8"
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

const EditRecipe = ({ onClose }: { onClose: () => void }) => {
  const maipl = MR.useMaipl()
  const queryClient = RQ.useQueryClient()
  const { data: recipeSchemas } = RQ.useQuery({
    queryKey: ["recipe-schemas"],
    queryFn: () => RecipeSchema.list(maipl.client),
  })

  const interfaces = recipeSchemas?.map((schema) => schema.interface)

  const [name, setName] = useState("")
  const [tag, setTag] = useState("")
  const [selectedInterface, setSelectedInterface] = useState<string | null>(null)
  const [showAdvancedFields, setShowAdvancedFields] = useState(false)

  useEffect(() => {
    const advancedFieldsSection = document.querySelector(".advanced_fields") as HTMLElement | null
    if (advancedFieldsSection) {
      advancedFieldsSection.style.display = showAdvancedFields ? "block" : "none"
    }
  }, [showAdvancedFields, selectedInterface])

  const uploadFile = RQ.useMutation({
    mutationFn: (vars: Parameters<typeof File.create>) => File.create(...vars),
    onError: (err, vars) => {
      if ((import.meta as any)?.env?.["DEV"]) {
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

  const handleSubmit = async (data: any) => {
    try {
      const file_data = {
        ...data.formData["essential_fields"],
        ...data.formData["advanced_fields"],
        interface: selectedInterface,
      }

      const file_json = JSON.stringify(file_data)
      const fileForUpload = new globalThis.File([file_json], `${name}.json`, {
        type: "application/json",
      })

      await uploadFile.mutateAsync([
        maipl.client,
        {
          file: fileForUpload,
          maipl_folder: File.t_maipl_folder.model_recipes,
          meta: null,
          path: `${name}.json`,
          tag,
        },
      ])
    } catch (error) {
      console.error("Error in handleSubmit:", error)
    }
  }

  const handleError = (errors: any) => {
    console.log(errors)
  }

  const selectedSchema = useMemo(() => {
    return recipeSchemas?.find((s) => s.interface === selectedInterface)
  }, [recipeSchemas, selectedInterface])

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
            onChange={(e) => setSelectedInterface(e.target.value as string)}
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
      {selectedSchema && (
        <Form
          schema={selectedSchema.schema as any}
          validator={validator}
          onError={handleError}
          onSubmit={handleSubmit}
          uiSchema={selectedSchema.ui_schema as any}
        />
      )}
    </div>
  )
}

export default EditRecipe
