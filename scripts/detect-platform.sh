#!/bin/bash

# ZippyCoin Platform Detection Script
# Detects OS, architecture, and capabilities

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

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Detect operating system
detect_os() {
    log_info "Detecting operating system..."

    case "$OSTYPE" in
        linux-gnu*)
            OS="linux"
            if [[ -f /etc/os-release ]]; then
                . /etc/os-release
                DISTRO=$ID
                VERSION=$VERSION_ID
            elif command -v lsb_release &> /dev/null; then
                DISTRO=$(lsb_release -si | tr '[:upper:]' '[:lower:]')
                VERSION=$(lsb_release -sr)
            else
                DISTRO="linux"
                VERSION="unknown"
            fi
            ;;
        darwin*)
            OS="macos"
            DISTRO="macos"
            VERSION=$(sw_vers -productVersion)
            ;;
        msys*|win32*)
            OS="windows"
            DISTRO="windows"
            VERSION=$(cmd //c ver 2>/dev/null | grep -oP '\d+\.\d+\.\d+' | head -1)
            ;;
        *)
            log_error "Unsupported OS: $OSTYPE"
            exit 1
            ;;
    esac

    log_success "OS: $OS ($DISTRO $VERSION)"
}

# Detect architecture
detect_arch() {
    log_info "Detecting architecture..."

    ARCH=$(uname -m)
    case "$ARCH" in
        x86_64|amd64)
            ARCH="amd64"
            ;;
        aarch64|arm64)
            ARCH="arm64"
            ;;
        armv7l|armv7)
            ARCH="armv7"
            ;;
        i386|i686)
            ARCH="386"
            ;;
        *)
            log_warn "Unknown architecture: $ARCH"
            ;;
    esac

    log_success "Architecture: $ARCH"
}

# Check available tools
check_tools() {
    log_info "Checking available tools..."

    TOOLS=("curl" "wget" "git" "docker" "node" "npm")

    for tool in "${TOOLS[@]}"; do
        if command -v "$tool" &> /dev/null; then
            VERSION=$($tool --version 2>/dev/null | head -1)
            log_success "$tool: $VERSION"
        else
            log_warn "$tool: not found"
        fi
    done
}

# Check system resources
check_resources() {
    log_info "Checking system resources..."

    if [[ "$OS" == "linux" ]] || [[ "$OS" == "macos" ]]; then
        # CPU cores
        CPU_CORES=$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo "unknown")
        log_success "CPU cores: $CPU_CORES"

        # Memory
        if [[ "$OS" == "linux" ]]; then
            TOTAL_MEM=$(free -h | awk 'NR==2{print $2}')
            AVAILABLE_MEM=$(free -h | awk 'NR==2{print $7}')
        elif [[ "$OS" == "macos" ]]; then
            TOTAL_MEM=$(echo "$(sysctl -n hw.memsize) / 1024 / 1024 / 1024" | bc)"GB"
            AVAILABLE_MEM="unknown"
        fi
        log_success "Total memory: $TOTAL_MEM"
        [[ "$AVAILABLE_MEM" != "unknown" ]] && log_success "Available memory: $AVAILABLE_MEM"

        # Disk space
        DISK_INFO=$(df -h . | tail -1)
        DISK_TOTAL=$(echo "$DISK_INFO" | awk '{print $2}')
        DISK_AVAILABLE=$(echo "$DISK_INFO" | awk '{print $4}')
        log_success "Disk space: $DISK_TOTAL total, $DISK_AVAILABLE available"
    fi
}

# Generate platform info file
generate_info() {
    log_info "Generating platform info..."

    cat > platform-info.json << EOF
{
  "os": "$OS",
  "distro": "$DISTRO",
  "version": "$VERSION",
  "arch": "$ARCH",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "hostname": "$(hostname)"
}
EOF

    log_success "Platform info saved to platform-info.json"
}

# Main function
main() {
    echo "🔍 ZippyCoin Platform Detection"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    detect_os
    detect_arch
    echo ""
    check_tools
    echo ""
    check_resources
    echo ""
    generate_info

    echo ""
    log_success "✅ Platform detection complete!"
    echo ""
    echo "Platform Summary:"
    echo "- OS: $OS ($DISTRO $VERSION)"
    echo "- Architecture: $ARCH"
    echo "- Full details in: platform-info.json"
}

main "$@"
