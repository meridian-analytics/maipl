#!/bin/bash

# Update package index
sudo apt-get update

# Install prerequisites
sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common

# Add Docker’s official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -

# Add Docker repository
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"

# Update package index again
sudo apt-get update

# Install Docker Engine
sudo apt-get install -y docker-ce

# Ensure Docker service is started
sudo systemctl start docker
sudo systemctl enable docker

# Add your user to the 'docker' group to avoid using 'sudo' with Docker commands
sudo usermod -aG docker $USER
newgrp docker

# Print Docker version to verify installation
docker --version

# Install Docker Compose
DOCKER_COMPOSE_VERSION="2.20.2" # Specify the desired version of Docker Compose here
curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Apply executable permissions to the Docker Compose binary
sudo chmod +x /usr/local/bin/docker-compose

# Verify Docker Compose installation
docker-compose --version

# Print a message to log out and log back in for the group changes to take effect
echo "Docker and Docker Compose installation is complete. Please log out and log back in for the group changes to take effect."

# Optional: Verify Docker installation and functionality
echo "Verifying Docker installation..."
sudo docker run hello-world