#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "Starting build and load process for astronomy and florist resources..."

KIND_CLUSTER_NAME=${1:-"kind"} # Default kind cluster name is 'kind', or use the first argument

build_and_load() {
    local app=$1
    local service=$2
    local dir="$app/$service"
    local image_name="${app}-${service}:v1"
    
    if [ -f "$dir/Dockerfile" ]; then
        echo "--------------------------------------------------------"
        echo "🏗️ Building image $image_name from $dir..."
        if [ "$service" = "ad" ]; then
            docker build --build-arg OTEL_JAVA_AGENT_VERSION=2.8.0 -t "$image_name" "$dir"
        else
            docker build -t "$image_name" "$dir"
        fi
        
        echo "🚢 Loading image $image_name into kind cluster '$KIND_CLUSTER_NAME'..."
        kind load docker-image "$image_name" --name "$KIND_CLUSTER_NAME"
        echo "✅ Successfully loaded $image_name"
    else
        echo "⚠️ No Dockerfile found in $dir, skipping..."
    fi
}

# Iterate over the two main apps
for app in astronomy florist; do
    if [ -d "$app" ]; then
        echo "Processing $app resources..."
        for service_dir in "$app"/*; do
            if [ -d "$service_dir" ]; then
                service=$(basename "$service_dir")
                build_and_load "$app" "$service"
            fi
        done
    else
        echo "❌ Directory $app not found! Run this script from the root of the project."
        exit 1
    fi
done

echo "--------------------------------------------------------"
echo "🎉 All astronomy and florist images have been built and loaded into the '$KIND_CLUSTER_NAME' kind cluster successfully!"
