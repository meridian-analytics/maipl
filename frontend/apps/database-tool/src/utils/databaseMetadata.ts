import { File, Meta } from "@maipl/api"
import type { DatabaseGroup, GroupConfig } from "../types"

/**
 * Extract groups from H5 database metadata
 */
export function extractGroupsFromMetadata(file: File.t): DatabaseGroup[] {
  // Try the standard H5 database metadata format first (with maipl wrapper)
  const h5Structure = Meta.safeReadH5Structure(file.meta)
  if (h5Structure) {
    return Object.entries(h5Structure).map(([groupName, datasets]) => ({
      name: groupName,
      created_at: file.created_at.toISOString(),
      status: "imported" as const,
      source: "existing_database" as const,
      config: undefined, // No config for imported groups
      statistics: {
        file_count: 0, // Will be calculated from datasets
        label_count: 0, // Will be calculated from datasets
        total_samples: 0, // Will be calculated from datasets
      }
    }))
  }

  // Try direct hdf5_structure access (like model-trainer expects)
  if (file.meta && typeof file.meta === 'object') {
    const meta = file.meta as any
    
    if (meta.hdf5_structure && typeof meta.hdf5_structure === 'object') {
      return Object.entries(meta.hdf5_structure).map(([groupName, datasets]) => ({
        name: groupName,
        created_at: file.created_at.toISOString(),
        status: "imported" as const,
        source: "existing_database" as const,
        config: undefined, // No config for imported groups
        statistics: {
          file_count: 0, // Will be calculated from datasets
          label_count: 0, // Will be calculated from datasets
          total_samples: 0, // Will be calculated from datasets
        }
      }))
    }
  }

  return []
}

/**
 * Update H5 database metadata when adding a new group
 */
export function updateMetadataWithNewGroup(
  currentMetadata: DatabaseTask["database_metadata"],
  newGroup: DatabaseGroup,
  groupConfig: GroupConfig
): DatabaseTask["database_metadata"] {
  const existingStructure = currentMetadata?.hdf5_structure || {}
  const existingGroups = currentMetadata?.groups || []
  
  // Create nested structure for the new group
  // For a path like "/train/sub/dec", we need to create the full hierarchy
  const groupPath = newGroup.name
  const pathParts = groupPath.split('/').filter(part => part.length > 0)
  
  let currentStructure = { ...existingStructure }
  let currentPath = ""
  
  // Build the nested structure
  for (let i = 0; i < pathParts.length; i++) {
    const part = pathParts[i]
    currentPath = currentPath + "/" + part
    
    if (i === pathParts.length - 1) {
      // This is the final group, add the datasets
      currentStructure[currentPath] = {
        "data": "dataset",
        "labels": "dataset"
      }
    } else {
      // This is an intermediate group, create it if it doesn't exist
      if (!currentStructure[currentPath]) {
        currentStructure[currentPath] = {}
      }
    }
  }

  // Add new group to groups list
  const updatedGroups = [...existingGroups, newGroup.name]

  // Calculate total samples (this would be updated by backend)
  const totalSamples = (currentMetadata?.total_samples || 0) + (newGroup.statistics.total_samples || 0)

  return {
    hdf5_structure: currentStructure,
    total_samples: totalSamples,
    groups: updatedGroups
  }
}

/**
 * Check if a group name already exists in the database
 */
export function groupExists(
  groupName: string,
  metadata: DatabaseTask["database_metadata"]
): boolean {
  if (!metadata?.groups) return false
  return metadata.groups.includes(groupName)
}

/**
 * Get all existing group names from metadata
 */
export function getExistingGroups(metadata: DatabaseTask["database_metadata"]): string[] {
  return metadata?.groups || []
}

/**
 * Trim trailing spaces from group name
 */
export function trimGroupName(groupName: string): string {
  return groupName.trimEnd()
}

/**
 * Validate group name format and uniqueness
 */
export function validateGroupName(
  groupName: string,
  existingGroups: string[]
): { isValid: boolean; error?: string } {
  // Trim trailing spaces
  const trimmedName = trimGroupName(groupName)
  
  // Check if group name starts with /
  if (!trimmedName.startsWith('/')) {
    return { isValid: false, error: "Group name must start with '/' (e.g., '/train')" }
  }

  // Check if group name is valid format - support nested paths like /train/sub/dec
  if (!/^\/[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)*$/.test(trimmedName)) {
    return { isValid: false, error: "Group name can only contain letters, numbers, underscores, and hyphens. Nested paths are supported (e.g., '/train/sub/dec')" }
  }

  // Check if group already exists
  if (existingGroups.includes(trimmedName)) {
    return { isValid: false, error: `Group '${trimmedName}' already exists in the database` }
  }

  return { isValid: true }
}

/**
 * Get database metadata from a selected H5 database file
 */
export function getDatabaseMetadata(file: File.t): DatabaseTask["database_metadata"] | null {
  // Try the standard H5 database metadata format first (with maipl wrapper)
  const h5Structure = Meta.safeReadH5Structure(file.meta)
  const audioConfigId = Meta.safeReadH5Config(file.meta)
  
  if (h5Structure) {
    const groups = Object.keys(h5Structure)
    return {
      hdf5_structure: h5Structure,
      total_samples: 0, // This would be calculated from the actual database
      groups: groups
    }
  }

  // Try direct hdf5_structure access (like model-trainer expects)
  if (file.meta && typeof file.meta === 'object') {
    const meta = file.meta as any
    
    if (meta.hdf5_structure && typeof meta.hdf5_structure === 'object') {
      const groups = Object.keys(meta.hdf5_structure)
      return {
        hdf5_structure: meta.hdf5_structure,
        total_samples: 0,
        groups: groups
      }
    }
  }
  
  return null
}

/**
 * Create initial metadata for a new database
 */
export function createInitialMetadata(): DatabaseTask["database_metadata"] {
  return {
    hdf5_structure: {},
    total_samples: 0,
    groups: []
  }
} 