# Create multiple instances based on count
resource "openstack_compute_instance_v2" "minio" {
  count           = var.instance_config.count
  name            = "${var.project_name}-minio-${var.environment}-${count.index + 1}"
  flavor_id       = var.instance_config.flavor_id
  image_id        = var.instance_config.image_id
  security_groups = var.security_groups
  key_pair        = var.instance_config.key_pair

  network {
    name = var.network_name
  }

  metadata = {
    environment = var.environment
    role        = "minio"
    cluster     = "${var.project_name}-minio-${var.environment}"
  }
}

# Create volumes for each instance based on volume_count
resource "openstack_blockstorage_volume_v3" "minio_data" {
  count = var.instance_config.volume_count
  name  = "${var.project_name}-minio-data-${var.environment}-${count.index + 1}"
  size  = var.instance_config.volume_size
}

# Attach volumes to instances
resource "openstack_compute_volume_attach_v2" "minio_data_attach" {
  count       = var.instance_config.volume_count
  instance_id = openstack_compute_instance_v2.minio[count.index % var.instance_config.count].id
  volume_id   = openstack_blockstorage_volume_v3.minio_data[count.index].id
}