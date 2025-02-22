#!/bin/bash

# Exit on any error
set -e

# Deployment configuration
REMOTE_HOST="root@217.160.17.72"
REMOTE_PATH="/home/flowlearn/htdocs/www.flowlearn.se"
SSH_KEY="$HOME/.ssh/flowlearn_deploy_key"

# Ensure we're in the project root
cd "$(dirname "$0")"

# Clean install dependencies and build
echo "Cleaning and installing dependencies..."
rm -rf dist node_modules
find . -name "._*" -delete
npm ci
NODE_ENV=production npm run build

# Verify build
if [ ! -f "dist/server/entry.mjs" ]; then
    echo "Error: Build failed - dist/server/entry.mjs not found"
    exit 1
fi

# Create deployment package
echo "Creating deployment package..."
tar --exclude=".*" --exclude="node_modules" -czf deploy.tar.gz \
    dist/ \
    package.json \
    package-lock.json \
    tsconfig.json

# Deploy to server
echo "Deploying to server..."

# Set up on server
ssh -i "$SSH_KEY" "$REMOTE_HOST" "
    # Stop the service
    systemctl stop flowlearn

    # Backup existing site if it exists
    if [ -d '$REMOTE_PATH' ]; then
        mv '$REMOTE_PATH' '${REMOTE_PATH}_backup_$(date +%Y%m%d_%H%M%S)'
    fi

    # Create fresh directory
    mkdir -p '$REMOTE_PATH'
    chown flowlearn:flowlearn '$REMOTE_PATH'
"

# Copy the deployment package
echo "Copying files..."
scp -i "$SSH_KEY" deploy.tar.gz "$REMOTE_HOST:$REMOTE_PATH/"

# Set up on server
ssh -i "$SSH_KEY" "$REMOTE_HOST" "
    cd '$REMOTE_PATH'
    
    # Extract files
    tar xzf deploy.tar.gz
    rm deploy.tar.gz
    
    # Install dependencies
    npm ci --production
    
    # Set correct ownership and permissions
    chown -R flowlearn:flowlearn .
    chmod -R 755 .
    
    # Verify deployment
    if [ ! -f 'dist/server/entry.mjs' ]; then
        echo 'Error: Deployment verification failed - entry.mjs not found'
        exit 1
    fi
    
    # Update systemd service
    cat > /etc/systemd/system/flowlearn.service << 'EOL'
[Unit]
Description=FlowLearn Astro Server
After=network.target

[Service]
Type=simple
User=flowlearn
Group=flowlearn
WorkingDirectory=$REMOTE_PATH
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/server/entry.mjs
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOL

    # Reload and restart service
    systemctl daemon-reload
    systemctl restart flowlearn
    systemctl status flowlearn
"

# Clean up local files
rm deploy.tar.gz

echo "Deployment completed. Checking service status..."
