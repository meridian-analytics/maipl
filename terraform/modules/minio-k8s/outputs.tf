output "k8s_node_ips" {
  description = "IP addresses of the Kubernetes nodes"
  value       = openstack_compute_instance_v2.k8s_nodes[*].access_ip_v4
}

output "k8s_master_ip" {
  description = "IP address of the Kubernetes master node"
  value       = openstack_compute_instance_v2.k8s_nodes[0].access_ip_v4
}

output "k8s_worker_ips" {
  description = "IP addresses of the Kubernetes worker nodes"
  value       = slice(openstack_compute_instance_v2.k8s_nodes[*].access_ip_v4, 1, var.instance_config.count)
}

output "volume_ids" {
  description = "IDs of the attached volumes"
  value       = openstack_blockstorage_volume_v3.k8s_minio_data[*].id
}

output "volume_device_names" {
  description = "Device names of the attached volumes"
  value       = openstack_compute_volume_attach_v2.k8s_minio_data_attach[*].device
}