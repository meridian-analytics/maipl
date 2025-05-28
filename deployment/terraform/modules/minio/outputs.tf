output "instance_ips" {
  description = "IP addresses of the Minio instances"
  value       = openstack_compute_instance_v2.minio[*].access_ip_v4
}

output "instance_names" {
  description = "Names of the Minio instances"
  value       = openstack_compute_instance_v2.minio[*].name
}

output "volume_ids" {
  description = "IDs of the attached volumes"
  value       = openstack_blockstorage_volume_v3.minio_data[*].id
}

output "instance_ids" {
  description = "IDs of the Minio instances"
  value       = openstack_compute_instance_v2.minio[*].id
}