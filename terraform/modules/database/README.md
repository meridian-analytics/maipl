# Database Module

This module creates a PostgreSQL database instance in OpenStack with configurable volumes and security settings.

## Features

- Creates PostgreSQL database instances
- Configurable instance size and count
- Multiple volume attachments
- Security group management
- Network configuration

## Usage

```hcl
module "database" {
  source = "../../modules/database"

  project_name = "myproject"
  environment  = "prod"
  
  instance_config = {
    count       = 1
    flavor_id   = "your-flavor-id"
    volume_count = 2
    volume_size = 100
    image_id    = "your-image-id"
    key_pair    = "your-key-pair"
  }

  network_name    = "your-network"
  security_groups = ["your-security-group"]
}
```

## Requirements

- OpenStack provider
- Network with DHCP enabled
- Security groups with appropriate rules
- SSH key pair

## Inputs

| Name | Description | Type | Required |
|------|-------------|------|----------|
| project_name | Name of the project | string | yes |
| environment | Environment name (e.g., prod, staging, dev) | string | yes |
| instance_config | Configuration for the database instance | object | yes |
| network_name | Name of the network to attach the instance to | string | yes |
| security_groups | List of security group names | list(string) | yes |
| databases | List of databases to create | list(object) | no |

## Outputs

| Name | Description |
|------|-------------|
| instance_ips | Public IPs of the database instances |
| instance_names | Names of the database instances |
| volume_ids | IDs of the attached volumes |
| database_endpoints | Database connection endpoints | 