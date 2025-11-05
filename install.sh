#!/bin/bash

# ZippyCoin Universal Installer
# Works on Linux, macOS, and various cloud platforms

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

# Detect OS and architecture
detect_platform() {
    log_info "Detecting platform..."

    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
        if command -v lsb_release &> /dev/null; then
            DISTRO=$(lsb_release -si | tr '[:upper:]' '[:lower:]')
        else
            DISTRO="linux"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        DISTRO="macos"
    else
        log_error "Unsupported OS: $OSTYPE"
        exit 1
    fi

    ARCH=$(uname -m)
    if [[ "$ARCH" == "x86_64" ]]; then
        ARCH="amd64"
    elif [[ "$ARCH" == "aarch64" ]] || [[ "$ARCH" == "arm64" ]]; then
        ARCH="arm64"
    fi

    log_success "Platform: $OS ($DISTRO) on $ARCH"
}

# Check system requirements
check_requirements() {
    log_info "Checking system requirements..."

    # Check memory
    if [[ "$OS" == "linux" ]]; then
        TOTAL_MEM=$(free -m | awk 'NR==2{printf "%.0f", $2}')
        if [[ $TOTAL_MEM -lt 2048 ]]; then
            log_error "Insufficient memory: ${TOTAL_MEM}MB (minimum 2GB required)"
            exit 1
        fi
        log_success "Memory: ${TOTAL_MEM}MB"
    fi

    # Check disk space
    DISK_SPACE=$(df -BG . | tail -1 | awk '{print $4}' | sed 's/G//')
    if [[ $DISK_SPACE -lt 10 ]]; then
        log_error "Insufficient disk space: ${DISK_SPACE}GB (minimum 10GB required)"
        exit 1
    fi
    log_success "Disk space: ${DISK_SPACE}GB available"
}

# Download pre-compiled binaries
download_binaries() {
    log_info "Downloading ZippyCoin binaries for $OS/$ARCH..."

    # Create binaries directory
    mkdir -p binaries

    # Determine download URLs based on platform
    BASE_URL="https://github.com/ZippyCoin-org/core/releases/download/v1.0.0"

    if [[ "$OS" == "linux" ]]; then
        if [[ "$ARCH" == "amd64" ]]; then
            BINARIES=(
                "zippycoin-node-linux-amd64:Full node binary"
                "zippycoin-validator-linux-amd64:Validator binary"
                "zippycoin-wallet-cli-linux-amd64:Wallet CLI"
                "trust-engine-linux-amd64:Trust engine binary"
                "api-gateway-linux-amd64:API gateway binary"
            )
        else
            log_error "Unsupported Linux architecture: $ARCH"
            exit 1
        fi
    elif [[ "$OS" == "macos" ]]; then
        if [[ "$ARCH" == "amd64" ]] || [[ "$ARCH" == "arm64" ]]; then
            BINARIES=(
                "zippycoin-node-darwin-$ARCH:Full node binary"
                "zippycoin-validator-darwin-$ARCH:Validator binary"
                "zippycoin-wallet-cli-darwin-$ARCH:Wallet CLI"
                "trust-engine-darwin-$ARCH:Trust engine binary"
                "api-gateway-darwin-$ARCH:API gateway binary"
            )
        else
            log_error "Unsupported macOS architecture: $ARCH"
            exit 1
        fi
    else
        log_error "Unsupported OS: $OS"
        exit 1
    fi

    # Download each binary
    for binary_info in "${BINARIES[@]}"; do
        BINARY_FILE=$(echo "$binary_info" | cut -d: -f1)
        BINARY_DESC=$(echo "$binary_info" | cut -d: -f2)

        log_info "Downloading $BINARY_DESC..."

        if curl -L -o "binaries/$BINARY_FILE" "$BASE_URL/$BINARY_FILE" 2>/dev/null; then
            # Make executable on Unix-like systems
            if [[ "$OS" != "windows" ]]; then
                chmod +x "binaries/$BINARY_FILE" 2>/dev/null || true
            fi
            log_success "Downloaded $BINARY_DESC"
        else
            log_warn "Failed to download $BINARY_DESC (may not be available yet)"
        fi
    done

    log_success "Binary download complete"
}

# Setup Docker environment (optional)
setup_docker() {
    log_info "Setting up Docker environment..."

    if ! command -v docker &> /dev/null; then
        log_info "Docker not found. Installing Docker..."

        if [[ "$OS" == "linux" ]]; then
            curl -fsSL https://get.docker.com -o get-docker.sh 2>/dev/null
            sudo sh get-docker.sh 2>/dev/null
            sudo usermod -aG docker $USER 2>/dev/null || true
            sudo systemctl start docker 2>/dev/null || true
        elif [[ "$OS" == "macos" ]]; then
            log_info "Please install Docker Desktop for Mac from https://docker.com"
        fi
    fi

    # Test Docker
    if command -v docker &> /dev/null; then
        log_success "Docker is available"
    else
        log_warn "Docker not available - you can still use the downloaded binaries"
    fi
}

# Create configuration
create_config() {
    log_info "Creating default configuration..."

    mkdir -p config

    cat > config/default.json << EOF
{
  "network": "testnet",
  "node": {
    "rpc_port": 8545,
    "p2p_port": 30303,
    "data_dir": "./data"
  },
  "trust": {
    "enabled": true,
    "api_port": 3000
  },
  "api": {
    "port": 4000,
    "graphql": true,
    "websocket": true
  }
}
EOF

    log_success "Configuration created in config/default.json"
}

# Main installation
main() {
    echo "🚀 ZippyCoin Binary Installer"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "This installer downloads pre-compiled binaries only."
    echo "No source code is included to protect intellectual property."
    echo ""

    detect_platform
    check_requirements
    download_binaries
    setup_docker
    create_config

    echo ""
    log_success "✅ Installation complete!"
    echo ""
    echo "Downloaded binaries in ./binaries/:"
    echo "🏃 zippycoin-node*      - Full blockchain node"
    echo "⚖️  zippycoin-validator* - Validator node"
    echo "👛 zippycoin-wallet-cli* - Command-line wallet"
    echo "🔍 trust-engine*        - Privacy scoring service"
    echo "🌐 api-gateway*         - GraphQL API server"
    echo ""
    echo "Quick start options:"
    echo "1. Run full node: ./binaries/zippycoin-node-linux-amd64"
    echo "2. Docker: docker run -d zippycoin/core:latest"
    echo "3. Wallet: ./binaries/zippycoin-wallet-cli-linux-amd64 --help"
    echo ""
    echo "Configuration: ./config/default.json"
    echo ""
    echo "See README.md for detailed usage instructions"
    echo ""
    echo "🎉 Ready to run ZippyCoin!"
}

main "$@"