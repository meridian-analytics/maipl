#!/bin/sh

ENV=${1:-development}
# Get the project root directory (parent of scripts directory)
PROJECT_ROOT="$(dirname "$(dirname "$(realpath "$0")")")"

echo "Setting up $ENV environment from $PROJECT_ROOT"

# Function to get port for an app
get_port() {
    case $1 in
        "annotation-tool") echo "3200" ;;
        "authentication-service") echo "3000" ;;
        "file-service") echo "3100" ;;
        "metrics") echo "3400" ;;
        "model-runner") echo "3300" ;;
        "model-trainer") echo "3500" ;;
        *) echo "" ;;
    esac
}

# Function to get base URL for an app
get_base_url() {
    case $1 in
        "annotation-tool") echo "/annotation-tool" ;;
        "authentication-service") echo "/authentication-service" ;;
        "file-service") echo "/file-service" ;;
        "metrics") echo "/metrics" ;;
        "model-runner") echo "/model-runner" ;;
        "model-trainer") echo "/model-trainer" ;;
        *) echo "" ;;
    esac
}

# Create symlinks and set configurations for all apps
for dir in "$PROJECT_ROOT/apps"/*/ ; do
    if [ -d "$dir" ]; then
        APP_NAME=$(basename "$dir")
        echo "Setting up environment for $APP_NAME"
        
        # Copy the base environment file
        cp "$PROJECT_ROOT/.env/env.$ENV" "$dir.env"
        
        if [ "$ENV" = "development" ]; then
            # For development, set port and default base URL
            PORT=$(get_port "$APP_NAME")
            if [ ! -z "$PORT" ]; then
                echo "" >> "$dir.env"
                echo "VITE_PORT=$PORT" >> "$dir.env"
                echo "VITE_BASE_URL=/" >> "$dir.env"
            fi
        else
            # For staging/production, set the appropriate base URL
            BASE_URL=$(get_base_url "$APP_NAME")
            if [ ! -z "$BASE_URL" ]; then
                echo "" >> "$dir.env"
                echo "VITE_BASE_URL=$BASE_URL" >> "$dir.env"
            fi
        fi
    fi
done 