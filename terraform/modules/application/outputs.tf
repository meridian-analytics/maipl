output "instance_ip" {
  description = "Public IPs of the application instances"
  value = openstack_compute_instance_v2.application.access_ip_v4
}

output "instance_name" {
  description = "Names of the database instances"
  value = openstack_compute_instance_v2.application.name
}

output "volume_id" {
  description = "IDs of the attached volumes"
  value = openstack_blockstorage_volume_v3.application_data.id
}

output "instance_id" {
  description = "IDs of the application instances"
  value = openstack_compute_instance_v2.application.id
}

