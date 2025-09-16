module "minio_prod" {
  source = "../../modules/minio"

  project_name = "maipl"
  environment  = "prod"
  
  instance_config = {
    count       = 1                                          # Single instance
    flavor_id   = "fdf112cd-dcb5-445b-b429-6e93dc0dbc16"   # p16-32gb
    volume_count = 4                                       # 4 volumes
    volume_size = 5120                                       # 5TB
    image_id    = "cc683663-c2b6-4626-ae6a-f6129cf2f316"   # Ubuntu 22.04
    key_pair    = "maipl-dev-gateway"
  }

  network_name    = "rpp-stanmat-network"
  security_groups = ["MAIPL-SERVICES", "MAIPL-SSH", "default"]
}

module "database_prod" {
  source = "../../modules/database"

  project_name = "maipl"
  environment  = "prod"

  instance_config = {
    count       = 1                                          # Single instance for now
    flavor_id   = "fdf112cd-dcb5-445b-b429-6e93dc0dbc16"   # p16-32gb
    volume_count = 1                                        # 1 volume for data (OS volume comes with instance)
    volume_size = 512                                      # 512GB for data volume
    image_id    = "cc683663-c2b6-4626-ae6a-f6129cf2f316"   # Ubuntu 22.04
    key_pair    = "maipl-dev-gateway"
  }

  network_name    = "rpp-stanmat-network"
  security_groups = ["MAIPL-SERVICES", "MAIPL-SSH", "default"]
}
