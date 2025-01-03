variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "instance_config" {
  description = "Kubernetes nodes and MinIO storage configuration"
  type = object({
    count            = number
    flavor_id        = string
    volume_size      = number
    image_id         = string
    key_pair         = string
    drives_per_node  = number
  })

  validation {
    condition     = var.instance_config.count >= 4
    error_message = "MinIO distributed mode requires at least 4 nodes."
  }

  validation {
    condition     = var.instance_config.drives_per_node >= 1
    error_message = "Each node must have at least 1 drive."
  }
}

variable "network_name" {
  description = "Existing network name"
  type        = string
}

variable "security_groups" {
  description = "List of security group names"
  type        = list(string)
}