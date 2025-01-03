# Create multiple instances for Kubernetes nodes
resource "openstack_compute_instance_v2" "k8s_nodes" {
  count           = var.instance_config.count
  name            = "${var.project_name}-k8s-${var.environment}-${count.index + 1}"
  flavor_id       = var.instance_config.flavor_id
  image_id        = var.instance_config.image_id
  security_groups = var.security_groups
  key_pair        = var.instance_config.key_pair

  network {
    name = var.network_name
  }

  metadata = {
    environment = var.environment
    role        = count.index == 0 ? "k8s-master" : "k8s-worker"
    cluster     = "${var.project_name}-k8s-${var.environment}"
  }
}

# Create multiple volumes for MinIO storage per node
resource "openstack_blockstorage_volume_v3" "k8s_minio_data" {
  count = var.instance_config.count * var.instance_config.drives_per_node
  name  = "${var.project_name}-minio-data-${var.environment}-${floor(count.index / var.instance_config.drives_per_node) + 1}-${count.index % var.instance_config.drives_per_node + 1}"
  size  = var.instance_config.volume_size
}

# Attach volumes to instances
resource "openstack_compute_volume_attach_v2" "k8s_minio_data_attach" {
  count       = var.instance_config.count * var.instance_config.drives_per_node
  instance_id = openstack_compute_instance_v2.k8s_nodes[floor(count.index / var.instance_config.drives_per_node)].id
  volume_id   = openstack_blockstorage_volume_v3.k8s_minio_data[count.index].id
}