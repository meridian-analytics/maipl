#!/usr/bin/env python3
"""
Dynamic inventory script for Staging Demo environment.
"""
import json
import subprocess
import os
import sys
from pathlib import Path

# Update the path to match your actual Terraform directory structure
TERRAFORM_DIR = Path(__file__).resolve().parents[3] / 'terraform' / 'environments'
ENVIRONMENT = 'staging'

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
    group_name = f'staging_demo'
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
    
    # Get staging instance IP and name from Terraform output
    staging_ip = tf_output.get('staging_instance_ip', {}).get('value')
    staging_name = tf_output.get('staging_instance_name', {}).get('value')
    
    # Get demo instance IP and name from Terraform output
    demo_ip = tf_output.get('demo_instance_ip', {}).get('value')
    demo_name = tf_output.get('demo_instance_name', {}).get('value')
    
    # Add staging instance if available
    if staging_ip and staging_name:
        inventory[group_name]['hosts'].append(staging_name)
        inventory['_meta']['hostvars'][staging_name] = {
            'ansible_host': staging_ip,
            'instance_name': staging_name
        }
    
    # Add demo instance if available
    if demo_ip and demo_name:
        inventory[group_name]['hosts'].append(demo_name)
        inventory['_meta']['hostvars'][demo_name] = {
            'ansible_host': demo_ip,
            'instance_name': demo_name
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
