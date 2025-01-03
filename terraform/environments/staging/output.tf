output "k8s_node_ips" {
  description = "IP addresses of the Kubernetes nodes"
  value       = module.minio_staging.k8s_node_ips
}

output "k8s_master_ip" {
  description = "IP address of the Kubernetes master node"
  value       = module.minio_staging.k8s_master_ip
}

output "k8s_worker_ips" {
  description = "IP addresses of the Kubernetes worker nodes"
  value       = module.minio_staging.k8s_worker_ips
}

output "volume_ids" {
  description = "IDs of the attached volumes"
  value       = module.minio_staging.volume_ids
}

output "volume_device_names" {
  description = "Device names of the attached volumes"
  value       = module.minio_staging.volume_device_names
}