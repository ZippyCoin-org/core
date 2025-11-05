#!/bin/bash

# ZippyCoin Network Setup Script
# Sets up a complete ZippyCoin network on any supported platform

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

# Configuration
NETWORK_TYPE=${ZIPPYCOIN_NETWORK:-"devnet"}
NODE_TYPE=${ZIPPYCOIN_NODE_TYPE:-"full"}
DATA_DIR=${ZIPPYCOIN_DATA_DIR:-"./data"}
CONFIG_DIR=${ZIPPYCOIN_CONFIG_DIR:-"./config"}

# Create directories
create_directories() {
    log_info "Creating directories..."

    mkdir -p "$DATA_DIR"
    mkdir -p "$CONFIG_DIR"
    mkdir -p logs

    log_success "Directories created"
}

# Generate configuration files
generate_config() {
    log_info "Generating configuration..."

    # Main config
    cat > "$CONFIG_DIR/config.json" << EOF
{
  "network": "$NETWORK_TYPE",
  "node_type": "$NODE_TYPE",
  "data_dir": "$DATA_DIR",
  "ports": {
    "p2p": 30303,
    "rpc": 8545,
    "ws": 8546,
    "metrics": 6060
  },
  "peers": {
    "max_peers": 50,
    "bootstrap_nodes": []
  },
  "consensus": {
    "block_time": 3000,
    "epoch_length": 30000
  },
  "privacy": {
    "enabled": true,
    "mixing_pools": 10
  }
}
EOF

    # Docker compose for services
    cat > docker-compose.yml << EOF
version: '3.8'

services:
  # ZippyCoin Blockchain Node
  blockchain:
    image: zippycoin/core:latest
    container_name: zippycoin-node
    ports:
      - "30303:30303"    # P2P
      - "8545:8545"      # RPC
      - "8546:8546"      # WebSocket
      - "6060:6060"      # Metrics
    volumes:
      - ./data:/app/data
      - ./config:/app/config
    environment:
      - ZIPPYCOIN_NETWORK=$NETWORK_TYPE
      - ZIPPYCOIN_NODE_TYPE=$NODE_TYPE
    restart: unless-stopped
    networks:
      - zippycoin

  # Trust Engine
  trust-engine:
    image: zippycoin/trust-engine:latest
    container_name: zippycoin-trust
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - blockchain
    networks:
      - zippycoin

  # API Gateway
  api-gateway:
    image: zippycoin/api-gateway:latest
    container_name: zippycoin-api
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
    depends_on:
      - trust-engine
    networks:
      - zippycoin

  # Monitoring (Optional)
  prometheus:
    image: prom/prometheus:latest
    container_name: zippycoin-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    networks:
      - zippycoin

  grafana:
    image: grafana/grafana:latest
    container_name: zippycoin-grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=zippycoin
    depends_on:
      - prometheus
    networks:
      - zippycoin

volumes:
  zippycoin-data:
  prometheus-data:
  grafana-data:

networks:
  zippycoin:
    driver: bridge
EOF

    # Prometheus config
    mkdir -p monitoring
    cat > monitoring/prometheus.yml << EOF
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'zippycoin-node'
    static_configs:
      - targets: ['blockchain:6060']
  - job_name: 'trust-engine'
    static_configs:
      - targets: ['trust-engine:3000']
  - job_name: 'api-gateway'
    static_configs:
      - targets: ['api-gateway:4000']
EOF

    log_success "Configuration generated"
}

# Setup genesis if this is a new network
setup_genesis() {
    if [[ "$NETWORK_TYPE" == "devnet" ]] && [[ ! -f "$DATA_DIR/genesis.json" ]]; then
        log_info "Setting up genesis block..."

        # Generate genesis block
        cat > "$DATA_DIR/genesis.json" << EOF
{
  "config": {
    "chainId": 1337,
    "homesteadBlock": 0,
    "eip150Block": 0,
    "eip155Block": 0,
    "eip158Block": 0,
    "byzantiumBlock": 0,
    "constantinopleBlock": 0,
    "petersburgBlock": 0,
    "istanbulBlock": 0,
    "berlinBlock": 0,
    "londonBlock": 0
  },
  "alloc": {},
  "coinbase": "0x0000000000000000000000000000000000000000",
  "difficulty": "0x1",
  "extraData": "0x",
  "gasLimit": "0x2fefd8",
  "nonce": "0x0000000000000042",
  "mixhash": "0x0000000000000000000000000000000000000000000000000000000000000000",
  "parentHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
  "timestamp": "$(printf '0x%x\n' $(date +%s))"
}
EOF

        log_success "Genesis block created"
    fi
}

# Start the network
start_network() {
    log_info "Starting ZippyCoin network..."

    # Check if docker-compose.yml exists
    if [[ ! -f "../docker-compose.yml" ]]; then
        log_error "docker-compose.yml not found. Please run this from the scripts/ directory."
        exit 1
    fi

    # Use docker-compose or docker compose
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    elif docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        log_error "Docker Compose not found. Please install Docker and Docker Compose."
        log_info "Installation instructions:"
        log_info "  Linux: curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh"
        log_info "  macOS: brew install --cask docker"
        exit 1
    fi

    log_info "Using: $COMPOSE_CMD"

    # Change to parent directory where docker-compose.yml is located
    cd ..

    # Stop any existing containers
    log_info "Stopping existing containers..."
    $COMPOSE_CMD down 2>/dev/null || true

    # Start the network
    log_info "Starting ZippyCoin services..."
    $COMPOSE_CMD up -d

    if [[ $? -eq 0 ]]; then
        log_success "Network started successfully!"

        # Wait a moment for services to be ready
        sleep 5

        # Show status
        log_info "Service Status:"
        $COMPOSE_CMD ps

        log_info "Checking service health..."
        if curl -s http://localhost:3000/health &> /dev/null; then
            log_success "✅ Trust Engine is responding"
        else
            log_warn "⚠️ Trust Engine not ready yet (this is normal on first startup)"
        fi

        if curl -s http://localhost:4000/health &> /dev/null; then
            log_success "✅ API Gateway is responding"
        else
            log_warn "⚠️ API Gateway not ready yet (this is normal on first startup)"
        fi
    else
        log_error "Failed to start network"
        log_info "Check logs with: $COMPOSE_CMD logs"
        exit 1
    fi
}

# Show status
show_status() {
    echo ""
    log_success "✅ ZippyCoin network setup complete!"
    echo ""
    echo "Network Type: $NETWORK_TYPE"
    echo "Node Type: $NODE_TYPE"
    echo ""
    echo "Access Points:"
    echo "- Blockchain RPC:     http://localhost:8545"
    echo "- WebSocket:          ws://localhost:8546"
    echo "- Trust Engine:       http://localhost:3000"
    echo "- API Gateway:        http://localhost:4000"
    echo "- Prometheus:         http://localhost:9090"
    echo "- Grafana:            http://localhost:3001"
    echo ""
    echo "To check status:"
    echo "docker-compose ps"
    echo "docker-compose logs -f blockchain"
    echo ""
    echo "To stop network:"
    echo "docker-compose down"
}

# Main function
main() {
    echo "🚀 ZippyCoin Network Setup"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "This will start a working ZippyCoin network with:"
    echo "- Full Node (RPC on port 8545)"
    echo "- Trust Engine (API on port 3000)"
    echo "- API Gateway (GraphQL on port 4000)"
    echo "- Monitoring (Prometheus/Grafana on ports 9090/3001)"
    echo ""

    create_directories
    generate_config
    setup_genesis
    start_network
    show_status
}

# Handle command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --network)
            NETWORK_TYPE="$2"
            shift 2
            ;;
        --node-type)
            NODE_TYPE="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --network TYPE     Network type (mainnet, testnet, devnet) [default: devnet]"
            echo "  --node-type TYPE   Node type (genesis, validator, full, light) [default: full]"
            echo "  --help             Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

main
