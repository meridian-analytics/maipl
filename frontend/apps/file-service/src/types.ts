import type * as DZ from "react-dropzone"
import type { File } from "@maipl/api"

// Type definitions for tracking upload progress and status
export interface UploadProgress {
  loaded: number        // Number of bytes uploaded
  total: number         // Total file size in bytes
  startTime: number     // Upload start timestamp
  lastLoaded: number    // Previously loaded bytes (for speed calculation)
  lastTime: number      // Previous timestamp (for speed calculation)
  speedSamples: number[] // Array of recent upload speeds for averaging
}

// Maps file paths to their current status and progress
export interface UploadStatusData {
  status: string
  progress?: UploadProgress
}

export type UploadStatus = Map<string, UploadStatusData>

// Represents a file in the upload table
export interface FileState {
  id: string
  name: string
  path: string
  size: number
  status: string
  progress?: UploadProgress
}

// Possible states for the action buttons
export type ActionState =
  | "none"      // Initial state
  | "pending"   // Selected but not started
  | "uploading" // Currently uploading
  | "cancelling"// Cancel in progress
  | "cancelled" // Upload cancelled
  | "error"     // Upload failed
  | "duplicate" // File already exists
  | "ok"        // Upload completed

// Props for the main FileUpload component
export interface FileUploadProps {
  accept?: DZ.Accept           // Allowed file types
  disabled?: boolean          // Whether uploads are allowed
  folder: File.t_maipl_folder // Target folder for uploads
  onClose: () => void        // Called when modal is closed
  text?: string              // Custom dropzone text
  validator?: DZ.DropzoneOptions["validator"] // Custom file validation
  onDrop?: (files: DZ.FileWithPath[]) => void // Called when files are dropped
}

// Props for FileUploadStep2 component
export interface FileUploadStep2Props {
  files: Array<DZ.FileWithPath>  // Files selected for upload
  folder: File.t_maipl_folder   // Target folder
  onClose: () => void          // Called when modal is closed
}

// Type for error responses
export interface FileErrorResponse {
  code: string
  message: string
  path: string
  type: string
} 