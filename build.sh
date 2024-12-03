#!/bin/bash

# Ensure script stops on first error
set -e

# Install dependencies
echo "Installing dependencies..."
npm install

# Clean previous build
echo "Cleaning previous build..."
rm -rf dist/

# Build with webpack
echo "Building extension..."
npm run build

# Create zip file for Chrome Web Store
echo "Creating distribution package..."
cd dist
zip -r ../network-throttle-extension.zip ./*
cd ..

echo "Build complete! The extension package is ready in network-throttle-extension.zip" 