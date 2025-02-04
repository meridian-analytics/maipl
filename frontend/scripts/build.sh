#!/bin/bash

# Exit on any error
set -e

# Variables
REGISTRY="registry.maipl-dev.com"
IMAGE_NAME="maipl-frontend"
TAG="dev"
FULL_IMAGE_NAME="$REGISTRY/$IMAGE_NAME:$TAG"

echo "🚀 Starting build process..."

# Build the image for AMD64 platform
echo "📦 Building image for AMD64..."
docker buildx build \
  --platform linux/amd64 \
  -t $FULL_IMAGE_NAME \
  .

# Push to registry
echo "⬆️  Pushing image to registry..."
docker push $FULL_IMAGE_NAME

echo "✅ Build and push completed successfully!"
echo "🔍 Image: $FULL_IMAGE_NAME"