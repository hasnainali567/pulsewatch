#!/bin/bash
exec > /var/log/pulsewatch-userdata.log 2>&1
set -x

mkdir -p /etc

cat > /etc/pulsewatch.env << 'ENVEOF'
DB_HOST=${db_host}
DB_NAME=${db_name}
DB_USER=${db_user}
DB_PASSWORD=${db_password}
ENVEOF

chmod 600 /etc/pulsewatch.env

systemctl daemon-reload
systemctl stop pulsewatch || true
systemctl start pulsewatch

echo "user_data finished successfully"