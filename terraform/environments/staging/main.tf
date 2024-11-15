module "minio_staging" {
  source = "../../modules/minio"

  project_name = "maipl"
  environment  = "staging"
  
  instance_config = {
    count       = 4                                          # 4-node cluster
    flavor_id   = "14a6f9ff-4ab0-4df2-86e4-a66df670e6f2"   # c8-30gb-288
    volume_size = 10240                                      # 10TB per node
    image_id    = "cc683663-c2b6-4626-ae6a-f6129cf2f316"   # Ubuntu 22.04
  }

  network_name    = "rpp-stanmat-network"
  security_groups = ["MAIPL-SERVICES", "MAIPL-SSH"]
}