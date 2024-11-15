#!/usr/bin/env python3
import json
import subprocess
import os
from pathlib import Path

TERRAFORM_DIR = Path(__file__).resolve().parents[2] / 'terraform' / 'environments'

def get_terraform_output(environment='dev'):
    # Change to appropriate Terraform environment directory
    os.chdir(str(TERRAFORM_DIR / environment))
    
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

def build_inventory(tf_output, environment='dev'):
    group_name = f'minio_{environment}'  # Fix: format string properly
    
    inventory = {
        '_meta': {
            'hostvars': {}
        },
        group_name: {  # Use the formatted group name
            'hosts': [],
            'vars': {
                'ansible_user': 'ubuntu',
                'ansible_ssh_private_key_file': '~/.ssh/id_rsa',
                'environment': environment
            }
        }
    }
    
    # Get IPs and names from Terraform output
    instance_ips = tf_output.get('minio_instance_ips', {}).get('value', [])
    instance_names = tf_output.get('minio_instance_names', {}).get('value', [])
    
    # Add each instance to inventory
    for ip, name in zip(instance_ips, instance_names):
        inventory[group_name]['hosts'].append(name)  # Use the formatted group name
        inventory['_meta']['hostvars'][name] = {
            'ansible_host': ip,
            'instance_name': name
        }
    
    return inventory

def main():
    # Get outputs for each environment
    environments = ['dev']  # Add 'prod', 'staging' as needed
    
    inventory = {
        '_meta': {
            'hostvars': {}
        },
        'all': {
            'children': []
        }
    }
    
    for env in environments:
        tf_output = get_terraform_output(env)
        env_inventory = build_inventory(tf_output, env)
        
        # Merge environment inventory into main inventory
        inventory['_meta']['hostvars'].update(env_inventory['_meta']['hostvars'])
        for group, group_data in env_inventory.items():
            if group != '_meta':
                inventory[group] = group_data
                inventory['all']['children'].append(group)
    
    print(json.dumps(inventory, indent=2))

if __name__ == '__main__':
    main()