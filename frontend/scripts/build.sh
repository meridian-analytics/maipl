#!/bin/bash

# Exit on any error
set -e

# Default environment is staging if not provided
ENV=${1:-staging}

# Variables
IMAGE_PREFIX="${IMAGE_PREFIX:-registry.maipl-dev.com}"
IMAGE_NAME="maipl-frontend"
TAG="$ENV"
FULL_IMAGE_NAME="$IMAGE_PREFIX/$IMAGE_NAME:$TAG"

echo "🚀 Starting build process for $ENV environment..."

# Build the image for AMD64 platform
echo "📦 Building image for AMD64..."
docker buildx build \
  --platform linux/amd64 \
  --build-arg NODE_ENV=$ENV \
  --provenance=false \
  -t $FULL_IMAGE_NAME \
  .

# Push to registry
echo "⬆️  Pushing image to registry..."
docker push $FULL_IMAGE_NAME

echo "✅ Build and push completed successfully!"
echo "🔍 Image: $FULL_IMAGE_NAME"
echo "🌍 Environment: $ENV"
