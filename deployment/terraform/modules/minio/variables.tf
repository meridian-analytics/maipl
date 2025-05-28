variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "instance_config" {
  description = "Minio instance configuration"
  type = object({
    count       = number        # Number of instances
    flavor_id   = string        # Instance flavor
    volume_count = number        # Number of volumes
    volume_size = number        # Volume size in GB
    image_id    = string        # OS image
    key_pair    = string        # SSH key pair
  })
}

variable "network_name" {
  description = "Existing network name"
  type        = string
}

variable "security_groups" {
  description = "List of security group names"
  type        = list(string)
}