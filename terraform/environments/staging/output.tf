output "k8s_node_ips" {
  description = "IP addresses of the Kubernetes nodes"
  value       = module.minio_staging.k8s_node_ips
}

output "volume_ids" {
  description = "IDs of the attached volumes"
  value       = module.minio_staging.volume_ids
}

output "volume_device_names" {
  description = "Device names of the attached volumes"
  value       = module.minio_staging.volume_device_names
}