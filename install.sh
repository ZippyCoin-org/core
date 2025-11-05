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

# Install system dependencies
install_dependencies() {
    log_info "Installing system dependencies..."

    if [[ "$OS" == "linux" ]]; then
        if command -v apt-get &> /dev/null; then
            # Debian/Ubuntu
            sudo apt-get update
            sudo apt-get install -y curl wget git build-essential
        elif command -v yum &> /dev/null; then
            # RHEL/CentOS
            sudo yum update -y
            sudo yum install -y curl wget git gcc gcc-c++ make
        elif command -v dnf &> /dev/null; then
            # Fedora
            sudo dnf update -y
            sudo dnf install -y curl wget git gcc gcc-c++ make
        else
            log_error "Unsupported Linux distribution"
            exit 1
        fi
    elif [[ "$OS" == "macos" ]]; then
        if ! command -v brew &> /dev/null; then
            log_info "Installing Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        fi
        brew install curl wget git
    fi

    log_success "Dependencies installed"
}

# Install Node.js
install_nodejs() {
    log_info "Installing Node.js..."

    if ! command -v node &> /dev/null; then
        if [[ "$OS" == "linux" ]]; then
            curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
            sudo apt-get install -y nodejs
        elif [[ "$OS" == "macos" ]]; then
            brew install node@18
        fi
    fi

    NODE_VERSION=$(node --version)
    log_success "Node.js installed: $NODE_VERSION"
}

# Install Docker
install_docker() {
    log_info "Installing Docker..."

    if ! command -v docker &> /dev/null; then
        if [[ "$OS" == "linux" ]]; then
            curl -fsSL https://get.docker.com -o get-docker.sh
            sudo sh get-docker.sh
            sudo usermod -aG docker $USER
        elif [[ "$OS" == "macos" ]]; then
            brew install --cask docker
        fi
    fi

    # Start Docker service
    if [[ "$OS" == "linux" ]]; then
        sudo systemctl start docker 2>/dev/null || true
        sudo systemctl enable docker 2>/dev/null || true
    fi

    log_success "Docker installed"
}

# Clone and setup ZippyCoin
setup_zippycoin() {
    log_info "Setting up ZippyCoin..."

    if [[ ! -d "zippycoin" ]]; then
        git clone https://github.com/ZippyCoin-org/core.git zippycoin
    fi

    cd zippycoin

    # Install dependencies
    if [[ -f "package.json" ]]; then
        npm install
    fi

    cd ..
    log_success "ZippyCoin setup complete"
}

# Main installation
main() {
    echo "🚀 ZippyCoin Universal Installer"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    detect_platform
    check_requirements
    install_dependencies
    install_nodejs
    install_docker
    setup_zippycoin

    echo ""
    log_success "✅ Installation complete!"
    echo ""
    echo "Next steps:"
    echo "1. cd zippycoin"
    echo "2. ./scripts/setup-network.sh"
    echo "3. See README.md for detailed instructions"
    echo ""
    echo "🎉 Ready to run ZippyCoin!"
}

main "$@"