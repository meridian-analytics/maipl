module "minio_staging" {
  source = "../../modules/minio-k8s"

  project_name = "maipl"
  environment  = "staging"
  
  instance_config = {
    count            = 1                                          # 1 nodes 
    flavor_id        = "8b110439-caf6-4f05-853b-86e697edaabe"   # p8-12gb (8 CPU, 12GB RAM)
    volume_size      = 1000
    image_id         = "cc683663-c2b6-4626-ae6a-f6129cf2f316"   # Ubuntu 22.04
    key_pair         = "maipl-dev-gateway"
    drives_per_node  = 1                                         # 4 drives per node
  }

  network_name    = "rpp-stanmat-network"
  security_groups = ["MAIPL-SERVICES", "MAIPL-SSH", "default"]
}