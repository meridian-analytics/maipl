#!/bin/bash

# Get the project root directory (parent of scripts directory)
PROJECT_ROOT="$(dirname "$(dirname "$(realpath "$0")")")"

# Remove all .env files from apps directories
for dir in "$PROJECT_ROOT/apps"/*/ ; do
    if [ -d "$dir" ]; then
        APP_NAME=$(basename "$dir")
        echo "Removing .env from $APP_NAME"
        rm -f "$dir.env"
    fi
done 