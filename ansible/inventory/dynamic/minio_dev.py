#!/usr/bin/env python3
"""
Dynamic inventory script for Minio DEV environment.
"""
import json
import subprocess
import os
import sys
from pathlib import Path

# Update the path to match your actual Terraform directory structure
TERRAFORM_DIR = Path(__file__).resolve().parents[3] / 'terraform' / 'environments'
ENVIRONMENT = 'dev'

def get_terraform_output():
    # Change to the correct Terraform environment directory
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
    except json.JSONDecodeError as e:
        print(f"Error parsing Terraform output: {e}", file=sys.stderr)
        return {}

def build_inventory(tf_output):
    group_name = f'minio_{ENVIRONMENT}'
    inventory = {
        '_meta': {'hostvars': {}},
        group_name: {
            'hosts': [],
            'vars': {
                'ansible_user': 'ubuntu',
                'ansible_ssh_private_key_file': '~/.ssh/id_rsa',
                'environment': ENVIRONMENT
            }
        }
    }
    
    instance_ips = tf_output.get('minio_instance_ips', {}).get('value', [])
    instance_names = tf_output.get('minio_instance_names', {}).get('value', [])
    
    for ip, name in zip(instance_ips, instance_names):
        inventory[group_name]['hosts'].append(name)
        inventory['_meta']['hostvars'][name] = {
            'ansible_host': ip,
            'instance_name': name
        }
    
    return inventory

def main():
    if len(sys.argv) == 2 and sys.argv[1] == '--list':
        tf_output = get_terraform_output()
        inventory = build_inventory(tf_output)
        print(json.dumps(inventory, indent=2))
    elif len(sys.argv) == 3 and sys.argv[1] == '--host':
        # Empty host vars
        print(json.dumps({}))
    else:
        print("Usage: %s --list or --host <hostname>" % sys.argv[0])
        sys.exit(1)

if __name__ == '__main__':
    main()