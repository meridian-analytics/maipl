output "instance_ips" {
  description = "Public IPs of the database instances"
  value = {
    for idx, instance in openstack_compute_instance_v2.database : idx => instance.access_ip_v4
  }
}

output "instance_names" {
  description = "Names of the database instances"
  value = {
    for idx, instance in openstack_compute_instance_v2.database : idx => instance.name
  }
}

output "volume_ids" {
  description = "IDs of the attached volumes"
  value = {
    for idx, volume in openstack_blockstorage_volume_v3.database_data : idx => volume.id
  }
}

output "instance_ids" {
  description = "IDs of the database instances"
  value = {
    for idx, instance in openstack_compute_instance_v2.database : idx => instance.id
  }
}

