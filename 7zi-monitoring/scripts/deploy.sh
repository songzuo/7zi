#!/bin/bash
# Deploy 7zi Monitoring System
# Usage: ./scripts/deploy.sh [--production|--development]

set -e

ENVIRONMENT="${1:-development}"
INSTALL_DIR="/opt/7zi-monitoring"
SERVICE_USER="monitoring"
SERVICE_GROUP="monitoring"

echo "=== 7zi Monitoring System Deployment ==="
echo "Environment: $ENVIRONMENT"
echo "Install directory: $INSTALL_DIR"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root"
    exit 1
fi

# Create service user
if ! id "$SERVICE_USER" &>/dev/null; then
    echo "Creating service user: $SERVICE_USER"
    useradd -r -s /bin/false $SERVICE_USER
fi

# Create directories
echo "Creating directories..."
mkdir -p $INSTALL_DIR
mkdir -p /var/lib/7zi-monitoring
mkdir -p /var/log/7zi-monitoring
mkdir -p /etc/7zi-monitoring

# Copy files
echo "Copying files..."
cp -r src $INSTALL_DIR/
cp -r config $INSTALL_DIR/
cp -r examples $INSTALL_DIR/
cp start.py $INSTALL_DIR/
cp requirements.txt $INSTALL_DIR/
cp README.md $INSTALL_DIR/

# Set permissions
echo "Setting permissions..."
chown -R $SERVICE_USER:$SERVICE_GROUP $INSTALL_DIR
chown -R $SERVICE_USER:$SERVICE_GROUP /var/lib/7zi-monitoring
chown -R $SERVICE_USER:$SERVICE_GROUP /var/log/7zi-monitoring

# Install Python dependencies
echo "Installing Python dependencies..."
cd $INSTALL_DIR
pip3 install -r requirements.txt

# Create environment file
if [ ! -f /etc/7zi-monitoring/monitoring.env ]; then
    echo "Creating environment file..."
    cat > /etc/7zi-monitoring/monitoring.env << EOF
# 7zi Monitoring Environment Configuration
# Copy this file and fill in your values

# API Keys
API_KEY_DASHBOARD=your-dashboard-api-key
API_KEY_INTERNAL=your-internal-api-key

# Database
DB_PASSWORD=your-db-password

# Alert Webhook
ALERT_WEBHOOK_URL=https://your-webhook-url

# Email Settings
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=alerts@7zi.com
SMTP_PASSWORD=your-smtp-password

# Volcengine
VOLCENGINE_ACCESS_KEY=your-access-key
VOLCENGINE_SECRET_KEY=your-secret-key
VOLCENGINE_INSTANCE_GROUP_ID=your-instance-group-id
VOLCENGINE_IMAGE_ID=your-image-id
EOF
    chmod 600 /etc/7zi-monitoring/monitoring.env
fi

# Install systemd service
echo "Installing systemd service..."
cat > /etc/systemd/system/7zi-monitoring.service << EOF
[Unit]
Description=7zi Performance Monitoring System
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_GROUP
WorkingDirectory=$INSTALL_DIR
EnvironmentFile=/etc/7zi-monitoring/monitoring.env
ExecStart=/usr/bin/python3 $INSTALL_DIR/start.py --config $INSTALL_DIR/config/monitoring.yaml
Restart=on-failure
RestartSec=5s
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
systemctl daemon-reload

# Enable service
systemctl enable 7zi-monitoring

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Configuration file: $INSTALL_DIR/config/monitoring.yaml"
echo "Environment file: /etc/7zi-monitoring/monitoring.env"
echo "Log directory: /var/log/7zi-monitoring"
echo ""
echo "To start the service:"
echo "  systemctl start 7zi-monitoring"
echo ""
echo "To check status:"
echo "  systemctl status 7zi-monitoring"
echo ""
echo "To view logs:"
echo "  journalctl -u 7zi-monitoring -f"
echo ""
echo "Default API port: 8080"
echo "Health check: http://localhost:8080/health"