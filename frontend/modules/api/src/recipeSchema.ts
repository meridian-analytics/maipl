import * as K from "@maipl/constants"
import type * as Client from "./client"

/** RecipeSchema.t */
type t = {
  /** Recipe schema identifier */
  id: number
  /** Interface */
  interface: string
  /** Schema */
  schema: Record<string, any>
  /** UI Schema */
  ui_schema: Record<string, any>
  /** Created at */
  created_at: Date
  /** Updated at */
  updated_at: Date
  /** User */
  user: number
}

/** RecipeSchema.t_get_response */
type t_get_response = Omit<t, "created_at" | "updated_at"> & {
  created_at: string
  updated_at: string
}

/** RecipeSchema.t_list_response */
type t_list_response = Array<t_get_response>

/** RecipeSchema.t_list_request */
type t_list_request = {
  /** Interface */
  interface?: string
}

const recipeSchema_db = [
  {
    id: 1,
    interface: "ResNetInterface",
    schema: {
      type: "object",
      properties: {
        essential_fields: {
          title: "Essential parameters",
          type: "object",
          properties: {
            n_classes: {
              title: "Number of Classes",
              type: "integer",
              minimum: 2,
              maximum: 100,
              default: 2,
            },
          },
        },
        advanced_fields: {
          title: "Advanced parameters",
          type: "object",
          properties: {
            initial_filters: {
              title: "Initial Filters",
              type: "integer",
              default: 16,
            },
            initial_strides: {
              title: "Initial Strides",
              type: "integer",
              default: 1,
            },
            strides: {
              title: "Strides",
              type: "integer",
              default: 2,
            },
            optimizer: {
              title: "Optimizer",
              type: "object",
              properties: {
                recipe_name: {
                  enum: ["Adam"],
                },
                parameters: {
                  type: "object",
                  properties: {
                    learning_rate: {
                      type: "number",
                    },
                  },
                },
              },
              default: {
                recipe_name: "Adam",
                parameters: {
                  learning_rate: 0.001,
                },
              },
            },
            loss_function: {
              title: "Loss Function",
              type: "object",
              properties: {
                recipe_name: {
                  enum: ["FScoreLoss"],
                },
              },
              default: {
                recipe_name: "FScoreLoss",
              },
            },
            block_sets: {
              type: "array",
              title: "Block Sets",
              items: {
                type: "integer",
                minimum: 1,
                maximum: 5,
              },
              default: [2, 2, 2, 2],
            },
            kernel: {
              title: "Kernel",
              type: "array",
              items: {
                type: "integer",
              },
              default: [3, 3],
            },
            initial_kernel: {
              title: "Initial Kernel",
              type: "array",
              items: {
                type: "integer",
              },
              default: [3, 3],
            },
            metrics: {
              title: "Metrics",
              type: "array",
              items: {
                type: "object",
                properties: {
                  recipe_name: {
                    enum: ["CategoricalAccuracy", "Precision", "Recall"],
                  },
                },
                allOf: [
                  {
                    if: {
                      properties: {
                        recipe_name: {
                          const: "Precision",
                        },
                      },
                    },
                    then: {
                      properties: {
                        parameters: {
                          type: "object",
                          properties: {
                            class_id: {
                              type: "integer",
                            },
                          },
                        },
                      },
                      required: ["parameters"],
                    },
                  },
                  {
                    if: {
                      properties: {
                        recipe_name: {
                          const: "Recall",
                        },
                      },
                    },
                    then: {
                      properties: {
                        parameters: {
                          type: "object",
                          properties: {
                            class_id: {
                              type: "integer",
                            },
                          },
                        },
                      },
                      required: ["parameters"],
                    },
                  },
                ],
                required: ["recipe_name"],
              },
              default: [
                {
                  recipe_name: "CategoricalAccuracy",
                },
                {
                  recipe_name: "Precision",
                  parameters: {
                    class_id: 1,
                  },
                },
                {
                  recipe_name: "Recall",
                  parameters: {
                    class_id: 1,
                  },
                },
              ],
            },
          },
        },
      },
    },
    ui_schema: {
      advanced_fields: {
        "ui:classNames": "advanced_fields",
      },
    },
    created_at: new Date(),
    updated_at: new Date(),
    user: 1,
  },
]

const list = (
  client: Client.t,
  params?: t_list_request
): Promise<t_list_response> => {
  return recipeSchema_db
}


export {
  type t,
  type t_get_response,
  type t_list_response,
  type t_list_request,
  list,
}
