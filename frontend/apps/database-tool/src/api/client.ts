import * as API from "@maipl/api"
import * as MR from "@maipl/react"
import type { DatabaseTask } from "../types"

// Create a function that returns the API with the authenticated client
export const createDatabaseTaskApi = (client: MR.t_client) => ({
  // Get all tasks
  async getTasks(params?: API.t_page_params): Promise<API.t_page<API.DatabaseTask.t>> {
    // Get the list first
    const listResult = await API.DatabaseTask.list(client, params || {})
    
    // Then fetch full details for each task to get metadata
    const fullTasks = await Promise.all(
      listResult.data.map(task => API.DatabaseTask.get(client, task.id))
    )
    
    return {
      ...listResult,
      data: fullTasks
    }
  },

  // Get single task by ID
  async getTask(taskId: number): Promise<DatabaseTask> {
    const apiTask = await API.DatabaseTask.get(client, taskId)
    // The API already returns strings for dates, so we can use them directly
    return apiTask as unknown as DatabaseTask
  },

  // Create new task
  async createTask(request: API.DatabaseTask.t_create_request): Promise<API.DatabaseTask.t> {
    return API.DatabaseTask.create(client, request)
  },

  // Update task
  async updateTask(taskId: number, updates: API.DatabaseTask.t_update_request): Promise<void> {
    return API.DatabaseTask.update(client, taskId, updates)
  },

  // Delete task
  async deleteTask(taskId: number): Promise<void> {
    return API.DatabaseTask.delete(client, taskId)
  },

  // Update task status
  async updateTaskStatus(taskId: number, status: API.DatabaseTask.t_status_update_request): Promise<void> {
    return API.DatabaseTask.updateStatus(client, taskId, status)
  },

  // Get task statistics
  async getTaskStatistics(taskId: number): Promise<API.DatabaseTask.t_statistics_response> {
    return API.DatabaseTask.getStatistics(client, taskId)
  },

  // Create group within task
  async createGroup(taskId: number, groupConfig: API.DatabaseTask.t_group_create_request): Promise<API.DatabaseTask.t_group> {
    // Backend expects task field in request body
    const requestWithTask = {
      task: taskId,
      ...groupConfig
    }
    return API.DatabaseTask.createGroup(client, taskId, requestWithTask)
  },

  // List groups within task
  async listGroups(taskId: number, params?: API.DatabaseTask.t_group_list_request): Promise<API.t_page<API.DatabaseTask.t_group_list_item>> {
    return API.DatabaseTask.listGroups(client, taskId, params || {})
  },

  // Get group details within task
  async getGroup(taskId: number, groupId: number): Promise<API.DatabaseTask.t_group> {
    return API.DatabaseTask.getGroup(client, taskId, groupId)
  },

  // Get group log within task
  async getGroupLog(taskId: number, groupId: number): Promise<API.DatabaseTask.t_group_log_response> {
    return API.DatabaseTask.getGroupLog(client, taskId, groupId)
  },

  // Update group within task
  async updateGroup(taskId: number, groupId: number, updates: API.DatabaseTask.t_group_update_request): Promise<void> {
    return API.DatabaseTask.updateGroup(client, taskId, groupId, updates)
  },

  // Delete group within task
  async deleteGroup(taskId: number, groupId: number): Promise<void> {
    return API.DatabaseTask.deleteGroup(client, taskId, groupId)
  },

  // Update group status within task
  async updateGroupStatus(taskId: number, groupId: number, status: API.DatabaseTask.t_group_status_update_request): Promise<void> {
    return API.DatabaseTask.updateGroupStatus(client, taskId, groupId, status)
  },

  // Create global group
  async createGlobalGroup(groupConfig: API.DatabaseTask.t_group_create_request): Promise<API.DatabaseTask.t_group> {
    return API.DatabaseTask.createGlobalGroup(client, groupConfig)
  },

  // List global groups
  async listGlobalGroups(params?: API.DatabaseTask.t_group_list_request): Promise<API.t_page<API.DatabaseTask.t_group_list_item>> {
    return API.DatabaseTask.listGlobalGroups(client, params || {})
  },

  // Get global group details
  async getGlobalGroup(groupId: number): Promise<API.DatabaseTask.t_group> {
    return API.DatabaseTask.getGlobalGroup(client, groupId)
  },

  // Update global group
  async updateGlobalGroup(groupId: number, updates: API.DatabaseTask.t_group_update_request): Promise<void> {
    return API.DatabaseTask.updateGlobalGroup(client, groupId, updates)
  },

  // Delete global group
  async deleteGlobalGroup(groupId: number): Promise<void> {
    return API.DatabaseTask.deleteGlobalGroup(client, groupId)
  },

  // Update global group status
  async updateGlobalGroupStatus(groupId: number, status: API.DatabaseTask.t_group_status_update_request): Promise<void> {
    return API.DatabaseTask.updateGlobalGroupStatus(client, groupId, status)
  }
}) 