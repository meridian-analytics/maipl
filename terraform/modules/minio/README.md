# MinIO Terraform Module

This Terraform module deploys MinIO instances on OpenStack infrastructure. It creates multiple MinIO instances with attached storage volumes, configurable networking, and security groups.

## Features

- Creates multiple MinIO instances with configurable specifications
- Provisions and attaches storage volumes to each instance
- Configurable security groups and networking
- Supports different environments and project naming

## Requirements

- Terraform >= 0.13
- OpenStack provider configured
- Existing network
- Configured security groups
- Valid SSH key pair

## Inputs

| Name | Description | Type | Required |
|------|-------------|------|----------|
| project_name | Project name | string | yes |
| environment | Environment name | string | yes |
| instance_config | MinIO instance configuration | object | yes |
| network_name | Existing network name | string | yes |
| security_groups | List of security group names | list(string) | yes |

### instance_config Object Structure

The `instance_config` variable expects an object with the following structure:

| Field | Description | Type |
|-------|-------------|------|
| count | Number of MinIO instances to create | number |
| flavor_id | Instance flavor/size ID | string |
| volume_size | Size of attached storage volume in GB | number |
| image_id | OS image ID to use for instances | string |
| key_pair | SSH key pair name | string |


## Outputs

| Name | Description |
|------|-------------|
| instance_ips | IP addresses of the MinIO instances |
| volume_ids | IDs of the attached volumes |

## Notes

- Each instance will be named in the format: `{project_name}-minio-{environment}-{index}`
- Each volume will be named in the format: `{project_name}-minio-data-{environment}-{index}`
- Instances are tagged with metadata including environment, role, and cluster name
- Make sure the security groups allow necessary MinIO ports (typically 9000 for API and 9001 for Console)

## License

This module is released under the MIT License.