#!/bin/bash

# Exit on any error
set -e

# Deployment configuration
REMOTE_HOST="cloudpanel@flowlearn.se"
REMOTE_PATH="/var/www/flowlearn/htdocs"
SSH_KEY="$HOME/.ssh/flowlearn_deploy_key"

# Ensure we're on the main branch 
git checkout main

# Install dependencies
npm install

# Build the production site
NODE_ENV=production npm run build

# Deploy to CloudPanel using the specified SSH key
rsync -avz --delete \
    -e "ssh -i $SSH_KEY -p 22" \
    dist/ \
    "$REMOTE_HOST:$REMOTE_PATH"

# Optional: Set correct permissions on remote server
ssh -i "$SSH_KEY" "$REMOTE_HOST" "chmod -R 755 $REMOTE_PATH"

echo "Deployment to CloudPanel completed successfully!"
