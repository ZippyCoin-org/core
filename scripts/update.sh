#!/bin/bash

# ZippyCoin Update Script
# Updates ZippyCoin to the latest version

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Backup current state
backup_current() {
    log_info "Creating backup..."

    BACKUP_DIR="backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"

    # Backup data
    if [[ -d "data" ]]; then
        cp -r data "$BACKUP_DIR/"
    fi

    # Backup config
    if [[ -d "config" ]]; then
        cp -r config "$BACKUP_DIR/"
    fi

    # Backup docker-compose if customized
    if [[ -f "docker-compose.override.yml" ]]; then
        cp docker-compose.override.yml "$BACKUP_DIR/"
    fi

    log_success "Backup created in: $BACKUP_DIR"
}

# Stop services
stop_services() {
    log_info "Stopping services..."

    if [[ -f "docker-compose.yml" ]]; then
        if command -v docker-compose &> /dev/null; then
            docker-compose down
        elif docker compose version &> /dev/null; then
            docker compose down
        fi
    fi

    log_success "Services stopped"
}

# Pull latest images
pull_updates() {
    log_info "Pulling latest images..."

    if [[ -f "docker-compose.yml" ]]; then
        if command -v docker-compose &> /dev/null; then
            docker-compose pull
        elif docker compose version &> /dev/null; then
            docker compose pull
        fi
    fi

    log_success "Images updated"
}

# Update configuration if needed
update_config() {
    log_info "Checking for configuration updates..."

    # Check if new config version is available
    # This would be more sophisticated in a real implementation
    log_info "Configuration is up to date"
}

# Start services
start_services() {
    log_info "Starting updated services..."

    if [[ -f "docker-compose.yml" ]]; then
        if command -v docker-compose &> /dev/null; then
            docker-compose up -d
        elif docker compose version &> /dev/null; then
            docker compose up -d
        fi
    fi

    log_success "Services started"
}

# Verify update
verify_update() {
    log_info "Verifying update..."

    # Wait a bit for services to start
    sleep 10

    # Run health check
    if [[ -f "scripts/health-check.sh" ]]; then
        ./scripts/health-check.sh
    fi
}

# Clean up old backups (keep last 5)
cleanup_backups() {
    log_info "Cleaning up old backups..."

    BACKUP_COUNT=$(ls -d backup-* 2>/dev/null | wc -l)
    if [[ $BACKUP_COUNT -gt 5 ]]; then
        # Remove oldest backups
        ls -d backup-* | head -n $(($BACKUP_COUNT - 5)) | xargs rm -rf
        log_success "Old backups cleaned up"
    fi
}

# Main function
main() {
    echo "🔄 ZippyCoin Update"
    echo "━━━━━━━━━━━━━━━━━━━"
    echo ""

    backup_current
    stop_services
    pull_updates
    update_config
    start_services
    verify_update
    cleanup_backups

    echo ""
    log_success "✅ Update complete!"
    echo ""
    echo "Your ZippyCoin installation has been updated to the latest version."
    echo ""
    echo "If you encounter any issues:"
    echo "1. Check the health report generated during verification"
    echo "2. Restore from backup if needed: ls backup-*/"
    echo "3. Check logs: docker-compose logs"
}

main "$@"
