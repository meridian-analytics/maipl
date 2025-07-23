import type { DatabaseTask, CreateTaskRequest } from "../types"
import { getDatabaseMetadata, extractGroupsFromMetadata } from "../utils/databaseMetadata"
import { File } from "@maipl/api"

// In-memory storage for mock data
let mockTasks: DatabaseTask[] = [
  {
    id: "task_12345",
    task_id: "task_12345",
    task_name: "Whale Detection Database",
    description: "Database for training whale call detection model",
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-15T11:45:00Z",
    status: "active",
    audio_representation_config_id: 15,
    database_selection: {
      mode: "new_database"
    },
    database_file: {
      filename: "whale_detection_db.h5",
      size: 1048576,
      created_at: "2024-01-15T11:45:00Z"
    },
    groups: [
      {
        name: "/train",
        created_at: "2024-01-15T11:45:00Z",
        status: "completed",
        source: "new_group",
        statistics: {
          file_count: 4,
          label_count: 3,
          total_samples: 150
        }
      }
    ],
    output_settings: {
      database_filename: "whale_detection_db.h5",
      table_name: "/data",
      overwrite: false,
      seed: 42
    }
  },
  {
    id: "task_12346",
    task_id: "task_12346",
    task_name: "Background Noise Database",
    description: "Database for background noise samples",
    created_at: "2024-01-16T09:15:00Z",
    updated_at: "2024-01-16T10:30:00Z",
    status: "completed",
    audio_representation_config_id: 15,
    database_selection: {
      mode: "new_database"
    },
    database_file: {
      filename: "background_db.h5",
      size: 5242880,
      created_at: "2024-01-16T10:30:00Z"
    },
    groups: [],
    output_settings: {
      database_filename: "background_db.h5",
      table_name: "/data",
      overwrite: false
    }
  }
]

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Generate unique task ID
const generateTaskId = () => `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

export const mockApi = {
  // Get all tasks
  async getTasks(): Promise<DatabaseTask[]> {
    await delay(500) // Simulate network delay
    return [...mockTasks]
  },

  // Get single task by ID
  async getTask(taskId: string): Promise<DatabaseTask | null> {
    await delay(300)
    return mockTasks.find(task => task.task_id === taskId) || null
  },

  // Get task by ID
  async getTask(taskId: string): Promise<DatabaseTask> {
    await delay(300) // Simulate network delay
    
    const task = mockTasks.find(t => t.task_id === taskId)
    if (!task) {
      throw new Error(`Task with ID ${taskId} not found`)
    }
    
    return task
  },

  // Create new task
  async createTask(request: CreateTaskRequest): Promise<DatabaseTask> {
    await delay(800) // Simulate processing time
    
    const now = new Date().toISOString()
    const taskId = generateTaskId()
    
    let groups: DatabaseTask["groups"] = []
    let databaseMetadata: DatabaseTask["database_metadata"] = undefined
    
    // If using existing database, extract groups and metadata
    if (request.database_selection.mode === "use_existing" && request.database_selection.database_file_id) {
      // In a real implementation, you would fetch the actual file from the backend
      // For now, we'll simulate this with mock data
      const mockExistingFile: File.t = {
        id: request.database_selection.database_file_id,
        basename: "existing_database.h5",
        created_at: new Date("2024-01-01T00:00:00Z"),
        updated_at: new Date("2024-01-01T00:00:00Z"),
        dirname: "",
        extname: ".h5",
        file: "mock://existing_database.h5",
        maipl_folder: File.t_maipl_folder.h5_databases,
        meta: {
          maipl: "h5_database",
          hdf5_structure: {
            "/train": { "data": "dataset", "labels": "dataset" },
            "/test": { "data": "dataset", "labels": "dataset" }
          },
          total_samples: 1000,
          groups: ["/train", "/test"]
        },
        path: "existing_database.h5",
        owner: { id: 1, username: "user", email: "user@example.com" },
        sha256: "mock-sha256",
        shared_to: [],
        size: 1048576,
        tag: "",
        user_id: 1
      }
      
      databaseMetadata = getDatabaseMetadata(mockExistingFile)
      groups = extractGroupsFromMetadata(mockExistingFile)
    }
    
    const newTask: DatabaseTask = {
      id: taskId,
      task_id: taskId,
      task_name: request.task_name,
      description: request.description,
      created_at: now,
      updated_at: now,
      status: "active",
      audio_representation_config_id: request.audio_representation_config_id || 15, // Default to 15 if not provided
      database_selection: request.database_selection,
      database_file: {
        filename: `${request.task_name.toLowerCase().replace(/\s+/g, '_')}_db.h5`,
        size: 0,
        created_at: now
      },
      groups: groups,
      output_settings: {
        database_filename: `${request.task_name.toLowerCase().replace(/\s+/g, '_')}_db.h5`,
        table_name: "/data",
        overwrite: false
      },
      database_metadata: databaseMetadata
    }
    
    mockTasks.push(newTask)
    return newTask
  },

  // Delete task
  async deleteTask(taskId: string): Promise<void> {
    await delay(400)
    mockTasks = mockTasks.filter(task => task.task_id !== taskId)
  },

  // Delete multiple tasks
  async deleteTasks(taskIds: string[]): Promise<void> {
    await delay(600)
    mockTasks = mockTasks.filter(task => !taskIds.includes(task.task_id))
  },

  // Update task
  async updateTask(taskId: string, updates: Partial<DatabaseTask>): Promise<DatabaseTask> {
    await delay(500)
    const taskIndex = mockTasks.findIndex(task => task.task_id === taskId)
    if (taskIndex === -1) {
      throw new Error(`Task ${taskId} not found`)
    }
    
    mockTasks[taskIndex] = {
      ...mockTasks[taskIndex],
      ...updates,
      updated_at: new Date().toISOString()
    }
    
    return mockTasks[taskIndex]
  },

  // Add group to task
  async addGroup(taskId: string, groupConfig: any): Promise<DatabaseTask> {
    await delay(1000) // Simulate database processing time
    
    const taskIndex = mockTasks.findIndex(task => task.task_id === taskId)
    if (taskIndex === -1) {
      throw new Error(`Task ${taskId} not found`)
    }
    
    const now = new Date().toISOString()
    const newGroup = {
      name: groupConfig.name,
      created_at: now,
      status: "completed" as const,
      source: "new_group" as const,
      statistics: {
        file_count: groupConfig.audio_file_ids?.length || 0,
        label_count: Object.keys(groupConfig.annotations?.labels || {}).length,
        total_samples: Math.floor(Math.random() * 500) + 50 // Mock sample count
      }
    }
    
    mockTasks[taskIndex].groups.push(newGroup)
    mockTasks[taskIndex].updated_at = now
    
    return mockTasks[taskIndex]
  }
} 