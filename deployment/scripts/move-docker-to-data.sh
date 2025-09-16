#!/bin/bash

set -e

# Define the new Docker storage path
NEW_DOCKER_DIR="/data/docker"
DOCKER_CONFIG="/etc/docker/daemon.json"

echo "🚀 Stopping Docker service..."
sudo systemctl stop docker

# Create new Docker storage directory
echo "📂 Creating new Docker storage at $NEW_DOCKER_DIR..."
sudo mkdir -p "$NEW_DOCKER_DIR"

# Update Docker config
echo "📝 Updating Docker configuration..."
if [ ! -f "$DOCKER_CONFIG" ]; then
    sudo mkdir -p /etc/docker
    echo '{ "data-root": "'"$NEW_DOCKER_DIR"'" }' | sudo tee "$DOCKER_CONFIG"
else
    sudo jq '. + { "data-root": "'"$NEW_DOCKER_DIR"'" }' "$DOCKER_CONFIG" | sudo tee "$DOCKER_CONFIG" > /dev/null
fi

# Move existing Docker data if present
if [ -d "/var/lib/docker" ]; then
    echo "🚚 Moving existing Docker data to $NEW_DOCKER_DIR..."
    sudo rsync -aP /var/lib/docker/ "$NEW_DOCKER_DIR/"
    echo "🧹 Removing old Docker data..."
    sudo rm -rf /var/lib/docker
fi

# Restart Docker service
echo "🔄 Restarting Docker..."
sudo systemctl start docker

# Verify the new Docker storage path
NEW_PATH=$(docker info | grep "Docker Root Dir" | awk '{print $4}')
if [ "$NEW_PATH" == "$NEW_DOCKER_DIR" ]; then
    echo "✅ Docker storage successfully moved to $NEW_DOCKER_DIR"
else
    echo "❌ Failed to move Docker storage!"
fi