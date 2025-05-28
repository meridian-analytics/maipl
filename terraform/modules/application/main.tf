# Create application instance
resource "openstack_compute_instance_v2" "application" {
  name            = "${var.project_name}-application-${var.environment}"
  flavor_id       = var.instance_config.flavor_id
  image_id        = var.instance_config.image_id
  security_groups = var.security_groups
  key_pair        = var.instance_config.key_pair

  network {
    name = var.network_name
  }

  metadata = {
    environment = var.environment
    project     = var.project_name
    role        = "application"
  }

  # Add boot parameters
  config_drive = true
  admin_pass  = null  # Let OpenStack generate a random password
}

# Create volumes
resource "openstack_blockstorage_volume_v3" "application_data" {
  name        = "${var.project_name}-${var.environment}-app-volume"
  size        = var.instance_config.volume_size
}

# Attach volumes to instance
resource "openstack_compute_volume_attach_v2" "application_data_attach" {
  instance_id = openstack_compute_instance_v2.application.id
  volume_id   = openstack_blockstorage_volume_v3.application_data.id
}