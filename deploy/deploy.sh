#!/bin/bash
# Romana's Book - Deployment Script
# new.music-book.me -> /var/www/music-book

set -e

# Configuration
DOMAIN="new.music-book.me"
SITE_ROOT="/var/www/music-book"
NGINX_CONF="/etc/nginx/sites-available/music-book"
NGINX_ENABLED="/etc/nginx/sites-enabled/music-book"
BACKUP_DIR="/var/backups/music-book"

echo "========================================="
echo "Romana's Book - Deployment Script"
echo "Domain: $DOMAIN"
echo "========================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root (sudo)"
    exit 1
fi

# Create backup of existing site
if [ -d "$SITE_ROOT" ]; then
    echo "[1/7] Creating backup..."
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    mkdir -p "$BACKUP_DIR"
    tar -czf "$BACKUP_DIR/backup_$TIMESTAMP.tar.gz" -C "$SITE_ROOT" .
    echo "Backup created: $BACKUP_DIR/backup_$TIMESTAMP.tar.gz"
else
    echo "[1/7] No existing site to backup"
fi

# Create site directory
echo "[2/7] Creating site directory..."
mkdir -p "$SITE_ROOT"
mkdir -p "$SITE_ROOT/images"
mkdir -p "$SITE_ROOT/books"

# Copy files (assumes files are in current directory)
echo "[3/7] Copying site files..."
cp -r ./css "$SITE_ROOT/"
cp -r ./js "$SITE_ROOT/"
cp -r ./images/* "$SITE_ROOT/images/" 2>/dev/null || true
cp -r ./books "$SITE_ROOT/"
cp ./*.html "$SITE_ROOT/"

# Set permissions
echo "[4/7] Setting permissions..."
chown -R www-data:www-data "$SITE_ROOT"
chmod -R 755 "$SITE_ROOT"

# Install nginx config
echo "[5/7] Installing nginx configuration..."
cp ./deploy/nginx.conf "$NGINX_CONF"
ln -sf "$NGINX_CONF" "$NGINX_ENABLED"

# Test nginx configuration
echo "[6/7] Testing nginx configuration..."
nginx -t

# Obtain SSL certificate (if not exists)
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    echo "[7/7] Obtaining SSL certificate..."
    certbot certonly --webroot -w "$SITE_ROOT" -d "$DOMAIN" --non-interactive --agree-tos --email admin@music-book.me
else
    echo "[7/7] SSL certificate already exists"
fi

# Reload nginx
echo "Reloading nginx..."
systemctl reload nginx

echo "========================================="
echo "Deployment completed successfully!"
echo "Site is now live at: https://$DOMAIN"
echo "========================================="
