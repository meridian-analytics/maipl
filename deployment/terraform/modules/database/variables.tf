variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., prod, staging, dev)"
  type        = string
}

variable "instance_config" {
  description = "Configuration for the database instance"
  type = object({
    count       = number
    flavor_id   = string
    volume_count = number
    volume_size = number
    image_id    = string
    key_pair    = string
  })
}

variable "network_name" {
  description = "Name of the network to attach the instance to"
  type        = string
}

variable "security_groups" {
  description = "List of security group names to attach to the instance"
  type        = list(string)
} 