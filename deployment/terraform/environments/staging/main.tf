module "staging_instance" {
  source = "../../modules/application"

  project_name = "maipl"
  environment  = "staging"
  
  instance_config = {
    flavor_id   = "fdf112cd-dcb5-445b-b429-6e93dc0dbc16"   # p16-32gb
    volume_size = 512                                      # 512GB for data volume
    image_id    = "cc683663-c2b6-4626-ae6a-f6129cf2f316"   # Ubuntu 22.04
    key_pair    = "maipl-dev-gateway"
  }

  network_name    = "rpp-stanmat-network"
  security_groups = ["MAIPL-SERVICES", "MAIPL-SSH", "default"]
}

module "demo_instance" {
  source = "../../modules/application"

  project_name = "maipl"
  environment  = "demo"
  
  instance_config = {
    flavor_id   = "fdf112cd-dcb5-445b-b429-6e93dc0dbc16"   # p16-32gb
    volume_size = 512                                      # 512GB for data volume
    image_id    = "cc683663-c2b6-4626-ae6a-f6129cf2f316"   # Ubuntu 22.04
    key_pair    = "maipl-dev-gateway"
  }

  network_name    = "rpp-stanmat-network"
  security_groups = ["MAIPL-SERVICES", "MAIPL-SSH", "default"]
}