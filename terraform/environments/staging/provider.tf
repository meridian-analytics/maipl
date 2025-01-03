terraform {
  required_version = ">= 1.0.0"
  required_providers {
    openstack = {
      source  = "terraform-provider-openstack/openstack"
      version = "~> 1.48.0"
    },
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.30.0"
    },
    kubectl = {
      source  = "gavinbunney/kubectl"
      version = "~> 1.14.0"
    }
  }
}

provider "openstack" {
  # The provider will source credentials from clouds.yaml
  cloud = "openstack"
}

provider "kubernetes" {
  config_path = "~/.kube/config"
}

provider "kubectl" {
  config_path = "~/.kube/config"
}