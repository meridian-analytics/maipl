output "minio_instance_ips" {
  description = "IP addresses of the Minio instances"
  value       = module.minio_prod.instance_ips
}

output "minio_instance_names" {
  description = "Names of the Minio instances"
  value       = module.minio_prod.instance_names
}

output "minio_volume_ids" {
  description = "IDs of the Minio volumes"
  value       = module.minio_prod.volume_ids
}

output "database_instance_ips" {
  description = "IP addresses of the database instances"
  value       = module.database_prod.instance_ips
}

output "database_instance_names" {
  description = "Names of the database instances"
  value       = module.database_prod.instance_names
}

output "database_volume_ids" {
  description = "IDs of the database volumes"
  value       = module.database_prod.volume_ids
}
