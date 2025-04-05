#!/bin/bash

# Exit on any error
set -e

# Ensure we're on the main branch and have latest changes
git checkout main
git pull origin main

# Install dependencies
npm install

# Build the production site with production environment
NODE_ENV=production npm run build

# Optional: Backup previous deployment
ssh root@flowlearn.se "mkdir -p /var/www/flowlearn/backups"
ssh root@flowlearn.se "cp -r /var/www/flowlearn/current /var/www/flowlearn/backups/backup_$(date +"%Y%m%d_%H%M%S")"

# Deploy to VPS
rsync -avz --delete dist/ root@flowlearn.se:/var/www/flowlearn/current

# Set correct permissions
ssh root@flowlearn.se "chown -R www-data:www-data /var/www/flowlearn/current"

# Restart web server (assuming Nginx)
ssh root@flowlearn.se "systemctl restart nginx"

echo "Deployment completed successfully!"
