output "staging_instance_ip" {
  description = "IP addresses of the staging node"
  value       = module.staging_instance.instance_ip
}

output "staging_instance_name" {
  description = "Names of the staging node"
  value       = module.staging_instance.instance_name
}

output "staging_volume_id" {
  description = "IDs of the attached volumes"
  value       = module.staging_instance.volume_id
}

output "staging_instance_id" {
  description = "IDs of the application instances"
  value       = module.staging_instance.instance_id
}

output "demo_instance_ip" {
  description = "IP addresses of the demo node"
  value       = module.demo_instance.instance_ip
}

output "demo_instance_name" {
  description = "Names of the demo node"
  value       = module.demo_instance.instance_name
}

output "demo_volume_id" {
  description = "IDs of the attached volumes"
  value       = module.demo_instance.volume_id
}

output "demo_instance_id" {
  description = "IDs of the application instances"
  value       = module.demo_instance.instance_id
}
