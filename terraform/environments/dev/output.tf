output "minio_instance_ips" {
  description = "IP addresses of the Minio instances"
  value       = module.minio_dev.instance_ips
}

output "minio_instance_names" {
  description = "Names of the Minio instances"
  value       = module.minio_dev.instance_names
}

output "minio_volume_ids" {
  description = "IDs of the Minio volumes"
  value       = module.minio_dev.volume_ids
}