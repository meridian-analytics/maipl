module "minio_dev" {
  source = "../../modules/minio"

  project_name = "maipl"
  environment  = "dev"
  
  instance_config = {
    count       = 1                                          # Single instance
    flavor_id   = "d2e0247d-3869-4f17-b9d0-9735f4f1b57a"   # p4-6gb
    volume_size = 5120                                       # 5TB
    image_id    = "cc683663-c2b6-4626-ae6a-f6129cf2f316"   # Ubuntu 22.04
    key_pair    = "maipl-dev-gateway"
  }

  network_name    = "rpp-stanmat-network"
  security_groups = ["MAIPL-SERVICES", "MAIPL-SSH", "default"]
}