#!/usr/bin/env python3
"""
Dynamic inventory script for K8s Staging environment.
"""
import json
import subprocess
import os
import sys
from pathlib import Path

TERRAFORM_DIR = Path(__file__).resolve().parents[3] / 'terraform' / 'environments'
ENVIRONMENT = 'staging'

def get_terraform_output():
    terraform_env_dir = TERRAFORM_DIR / ENVIRONMENT
    
    if not terraform_env_dir.exists():
        print(f"Error: Terraform directory not found: {terraform_env_dir}", file=sys.stderr)
        return {}
    
    os.chdir(str(terraform_env_dir))
    try:
        result = subprocess.run(
            ['terraform', 'output', '-json'],
            capture_output=True,
            text=True,
            check=True
        )
        return json.loads(result.stdout)
    except subprocess.CalledProcessError as e:
        print(f"Error getting Terraform output: {e}", file=sys.stderr)
        return {}

def build_inventory(tf_output):
    inventory = {
        '_meta': {'hostvars': {}},
        'k8s_staging': {
            'children': ['k8s_staging_master', 'k8s_staging_workers']
        },
        'k8s_staging_master': {
            'hosts': [],
            'vars': {
                'ansible_user': 'ubuntu',
                'ansible_ssh_private_key_file': '~/.ssh/id_rsa',
                'environment': ENVIRONMENT
            }
        },
        'k8s_staging_workers': {
            'hosts': [],
            'vars': {
                'ansible_user': 'ubuntu',
                'ansible_ssh_private_key_file': '~/.ssh/id_rsa',
                'environment': ENVIRONMENT
            }
        }
    }
    
    # Get IPs from terraform output
    master_ip = tf_output.get('k8s_master_ip', {}).get('value')
    worker_ips = tf_output.get('k8s_worker_ips', {}).get('value', [])
    
    # Add master node
    master_name = "maipl-k8s-staging-1"
    inventory['k8s_staging_master']['hosts'].append(master_name)
    inventory['_meta']['hostvars'][master_name] = {
        'ansible_host': master_ip,
        'instance_name': master_name,
        'k8s_role': 'master'
    }
    
    # Add worker nodes
    for i, ip in enumerate(worker_ips, start=2):
        worker_name = f"maipl-k8s-staging-{i}"
        inventory['k8s_staging_workers']['hosts'].append(worker_name)
        inventory['_meta']['hostvars'][worker_name] = {
            'ansible_host': ip,
            'instance_name': worker_name,
            'k8s_role': 'worker'
        }
    
    return inventory

def main():
    if len(sys.argv) == 2 and sys.argv[1] == '--list':
        tf_output = get_terraform_output()
        inventory = build_inventory(tf_output)
        print(json.dumps(inventory, indent=2))
    elif len(sys.argv) == 3 and sys.argv[1] == '--host':
        print(json.dumps({}))
    else:
        print("Usage: %s --list or --host <hostname>" % sys.argv[0])
        sys.exit(1)

if __name__ == '__main__':
    main()