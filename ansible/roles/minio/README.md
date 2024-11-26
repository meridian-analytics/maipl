
# Minio Role

This role deploys and configures Minio object storage with monitoring integration.

## Features

- Minio deployment using Docker
- Volume management for persistent storage
- Prometheus metrics integration
- Loki logging integration
- Grafana dashboard for monitoring

## Directory Structure

```bash
roles/minio/
├── tasks/
│   ├── main.yml          # Main task entry
│   ├── volume.yml        # Volume setup
│   ├── docker.yml        # Docker installation
│   ├── deploy.yml        # Minio deployment
│   ├── monitoring.yml    # Prometheus/metrics setup
│   └── grafana.yml       # Grafana dashboard setup
├── templates/
│   ├── docker-compose.yml.j2    # Minio container config
│   ├── .env.j2                  # Environment variables
│   ├── prometheus-main.yml.j2   # Main Prometheus config
│   ├── minio.yml.j2             # Minio metrics config  
│   └── minio-dashboard.json.j2  # Grafana dashboard
└── README.md
```

## Configuration Steps

### 1. Volume Setup
- Creates and formats volume for Minio data
- Mounts volume at configured location

### 2. Docker Installation
- Installs Docker and dependencies
- Configures Docker Compose
- Sets up Loki logging driver

### 3. Minio Deployment
- Deploys Minio using Docker Compose
- Configures environment variables
- Sets up persistent storage

### 4. Monitoring Integration
- Prometheus metrics configuration
- File-based service discovery setup
- Metrics endpoint exposure (/minio/v2/metrics/cluster)

### 5. Logging Setup
- Loki integration for log collection
- Log forwarding configuration

### 6. Grafana Dashboard
- Pre-configured dashboard for Minio metrics
- Storage capacity monitoring
- Request rate visualization

## Variables

```yaml
# Default variables
minio_volume_device: /dev/vdb
minio_data_dir: /data/minio
minio_config_dir: /etc/minio
monitoring_server: "192.168.239.67"
grafana_url: "http://192.168.239.67:3000"
loki_url: "http://192.168.239.67:3100"
```

## Monitoring Setup

### Prometheus Configuration
- Main config at `/etc/prometheus/prometheus.yml`
- Job-specific configs in `/etc/prometheus/conf.d/jobs/`
- Metrics path: `/minio/v2/metrics/cluster`

### Available Metrics
- Storage capacity
- Request rates
- Error rates
- Network traffic

## Usage

```bash
# Deploy Minio with monitoring
ansible-playbook -i inventory/terraform.py playbooks/deploy_minio.yml --ask-vault-pass
```

## Verification

### 1. Check Minio Status
```bash
curl http://<minio-ip>:9000/minio/health
```

### 2. Verify Metrics
```bash
# Check Prometheus targets
curl http://192.168.239.67:9090/api/v1/targets

# Query metrics
curl http://192.168.239.67:9090/api/v1/query?query=minio_cluster_capacity_usable_total_bytes
```

### 3. Access Dashboards
- Grafana: http://192.168.239.67:3000
- Prometheus: http://192.168.239.67:9090

## Troubleshooting

### 1. Metrics Not Showing
- Verify Prometheus target status
- Check Minio metrics endpoint
- Validate Prometheus configuration

### 2. Log Collection Issues
- Check Loki plugin status
- Verify log driver configuration
- Check Promtail status

## Future Improvements

1. Add alerts for storage capacity
2. Implement backup configuration
3. Add more dashboard visualizations
4. Enhance security configurations
