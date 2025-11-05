#!/bin/bash

# ZippyCoin Production Deployment Script
# This script deploys the complete ZippyCoin ecosystem to production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
REGION=${2:-us-east-1}
CLUSTER_NAME="zippycoin-${ENVIRONMENT}"
NAMESPACE="zippycoin"

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if kubectl is installed (for Kubernetes deployment)
    if ! command -v kubectl &> /dev/null; then
        warning "kubectl is not installed. Kubernetes deployment will be skipped."
    fi
    
    # Check if helm is installed (for Kubernetes deployment)
    if ! command -v helm &> /dev/null; then
        warning "helm is not installed. Helm charts will not be deployed."
    fi
    
    success "Prerequisites check completed"
}

# Create SSL certificates
create_ssl_certificates() {
    log "Creating SSL certificates..."
    
    mkdir -p ssl
    
    # Generate self-signed certificates for development
    # In production, these should be replaced with real certificates from a CA
    
    # API Gateway certificate
    openssl req -x509 -newkey rsa:4096 -keyout ssl/api.zippycoin.io.key -out ssl/api.zippycoin.io.crt -days 365 -nodes -subj "/C=US/ST=CA/L=San Francisco/O=ZippyCoin/OU=IT/CN=api.zippycoin.io"
    
    # RPC certificate
    openssl req -x509 -newkey rsa:4096 -keyout ssl/rpc.zippycoin.io.key -out ssl/rpc.zippycoin.io.crt -days 365 -nodes -subj "/C=US/ST=CA/L=San Francisco/O=ZippyCoin/OU=IT/CN=rpc.zippycoin.io"
    
    # Trust Engine certificate
    openssl req -x509 -newkey rsa:4096 -keyout ssl/trust.zippycoin.io.key -out ssl/trust.zippycoin.io.crt -days 365 -nodes -subj "/C=US/ST=CA/L=San Francisco/O=ZippyCoin/OU=IT/CN=trust.zippycoin.io"
    
    # Wallet Service certificate
    openssl req -x509 -newkey rsa:4096 -keyout ssl/wallet.zippycoin.io.key -out ssl/wallet.zippycoin.io.crt -days 365 -nodes -subj "/C=US/ST=CA/L=San Francisco/O=ZippyCoin/OU=IT/CN=wallet.zippycoin.io"
    
    # Governance Service certificate
    openssl req -x509 -newkey rsa:4096 -keyout ssl/governance.zippycoin.io.key -out ssl/governance.zippycoin.io.crt -days 365 -nodes -subj "/C=US/ST=CA/L=San Francisco/O=ZippyCoin/OU=IT/CN=governance.zippycoin.io"
    
    # DeFi Service certificate
    openssl req -x509 -newkey rsa:4096 -keyout ssl/defi.zippycoin.io.key -out ssl/defi.zippycoin.io.crt -days 365 -nodes -subj "/C=US/ST=CA/L=San Francisco/O=ZippyCoin/OU=IT/CN=defi.zippycoin.io"
    
    # NFT Service certificate
    openssl req -x509 -newkey rsa:4096 -keyout ssl/nft.zippycoin.io.key -out ssl/nft.zippycoin.io.crt -days 365 -nodes -subj "/C=US/ST=CA/L=San Francisco/O=ZippyCoin/OU=IT/CN=nft.zippycoin.io"
    
    # Bridge Service certificate
    openssl req -x509 -newkey rsa:4096 -keyout ssl/bridge.zippycoin.io.key -out ssl/bridge.zippycoin.io.crt -days 365 -nodes -subj "/C=US/ST=CA/L=San Francisco/O=ZippyCoin/OU=IT/CN=bridge.zippycoin.io"
    
    # Node Service certificate
    openssl req -x509 -newkey rsa:4096 -keyout ssl/node.zippycoin.io.key -out ssl/node.zippycoin.io.crt -days 365 -nodes -subj "/C=US/ST=CA/L=San Francisco/O=ZippyCoin/OU=IT/CN=node.zippycoin.io"
    
    # Monitoring certificates
    openssl req -x509 -newkey rsa:4096 -keyout ssl/metrics.zippycoin.io.key -out ssl/metrics.zippycoin.io.crt -days 365 -nodes -subj "/C=US/ST=CA/L=San Francisco/O=ZippyCoin/OU=IT/CN=metrics.zippycoin.io"
    openssl req -x509 -newkey rsa:4096 -keyout ssl/dashboard.zippycoin.io.key -out ssl/dashboard.zippycoin.io.crt -days 365 -nodes -subj "/C=US/ST=CA/L=San Francisco/O=ZippyCoin/OU=IT/CN=dashboard.zippycoin.io"
    openssl req -x509 -newkey rsa:4096 -keyout ssl/logs.zippycoin.io.key -out ssl/logs.zippycoin.io.crt -days 365 -nodes -subj "/C=US/ST=CA/L=San Francisco/O=ZippyCoin/OU=IT/CN=logs.zippycoin.io"
    
    success "SSL certificates created"
}

# Build Docker images
build_images() {
    log "Building Docker images..."
    
    # Build blockchain core
    log "Building blockchain core..."
    docker build -t zippycoin/blockchain-core:latest ../blockchain-core/
    
    # Build layer2-edge
    log "Building layer2-edge..."
    docker build -t zippycoin/layer2-edge:latest ../layer2-edge/
    
    # Build mesh-network
    log "Building mesh-network..."
    docker build -t zippycoin/mesh-network:latest ../mesh-network/
    
    # Build backend services
    log "Building backend services..."
    docker build -t zippycoin/api-gateway:latest ../backend-services/api-gateway/
    docker build -t zippycoin/trust-engine:latest ../backend-services/trust-engine/
    docker build -t zippycoin/wallet-service:latest ../backend-services/wallet-service/
    docker build -t zippycoin/governance-service:latest ../backend-services/governance-service/
    docker build -t zippycoin/defi-service:latest ../backend-services/defi-service/
    docker build -t zippycoin/nft-service:latest ../backend-services/nft-service/
    docker build -t zippycoin/bridge-service:latest ../backend-services/bridge-service/
    docker build -t zippycoin/node-service:latest ../backend-services/node-service/
    
    success "Docker images built successfully"
}

# Deploy with Docker Compose
deploy_docker_compose() {
    log "Deploying with Docker Compose..."
    
    # Stop existing containers
    docker-compose down --remove-orphans
    
    # Start services
    docker-compose up -d
    
    # Wait for services to be ready
    log "Waiting for services to be ready..."
    sleep 30
    
    # Check service health
    check_service_health
    
    success "Docker Compose deployment completed"
}

# Deploy with Kubernetes
deploy_kubernetes() {
    log "Deploying with Kubernetes..."
    
    # Create namespace
    kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
    
    # Apply Kubernetes manifests
    kubectl apply -f k8s/ -n $NAMESPACE
    
    # Wait for deployments to be ready
    log "Waiting for deployments to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment --all -n $NAMESPACE
    
    success "Kubernetes deployment completed"
}

# Check service health
check_service_health() {
    log "Checking service health..."
    
    # Check API Gateway
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        success "API Gateway is healthy"
    else
        error "API Gateway is not responding"
    fi
    
    # Check Trust Engine
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        success "Trust Engine is healthy"
    else
        error "Trust Engine is not responding"
    fi
    
    # Check Wallet Service
    if curl -f http://localhost:3002/health > /dev/null 2>&1; then
        success "Wallet Service is healthy"
    else
        error "Wallet Service is not responding"
    fi
    
    # Check Governance Service
    if curl -f http://localhost:3003/health > /dev/null 2>&1; then
        success "Governance Service is healthy"
    else
        error "Governance Service is not responding"
    fi
    
    # Check DeFi Service
    if curl -f http://localhost:3004/health > /dev/null 2>&1; then
        success "DeFi Service is healthy"
    else
        error "DeFi Service is not responding"
    fi
    
    # Check NFT Service
    if curl -f http://localhost:3005/health > /dev/null 2>&1; then
        success "NFT Service is healthy"
    else
        error "NFT Service is not responding"
    fi
    
    # Check Bridge Service
    if curl -f http://localhost:3006/health > /dev/null 2>&1; then
        success "Bridge Service is healthy"
    else
        error "Bridge Service is not responding"
    fi
    
    # Check Node Service
    if curl -f http://localhost:3007/health > /dev/null 2>&1; then
        success "Node Service is healthy"
    else
        error "Node Service is not responding"
    fi
    
    # Check blockchain nodes
    if curl -f http://localhost:8545 > /dev/null 2>&1; then
        success "Blockchain validator 1 is healthy"
    else
        error "Blockchain validator 1 is not responding"
    fi
    
    if curl -f http://localhost:8546 > /dev/null 2>&1; then
        success "Blockchain validator 2 is healthy"
    else
        error "Blockchain validator 2 is not responding"
    fi
    
    # Check monitoring
    if curl -f http://localhost:9090 > /dev/null 2>&1; then
        success "Prometheus is healthy"
    else
        error "Prometheus is not responding"
    fi
    
    if curl -f http://localhost:3001 > /dev/null 2>&1; then
        success "Grafana is healthy"
    else
        error "Grafana is not responding"
    fi
    
    success "Service health check completed"
}

# Initialize blockchain
initialize_blockchain() {
    log "Initializing blockchain..."
    
    # Wait for validators to be ready
    sleep 60
    
    # Check if genesis block is created
    if curl -f http://localhost:8545 -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' > /dev/null 2>&1; then
        success "Blockchain initialized successfully"
    else
        error "Failed to initialize blockchain"
        exit 1
    fi
}

# Setup monitoring
setup_monitoring() {
    log "Setting up monitoring..."
    
    # Wait for monitoring services to be ready
    sleep 30
    
    # Check Prometheus
    if curl -f http://localhost:9090 > /dev/null 2>&1; then
        success "Prometheus is running"
    else
        error "Prometheus is not running"
    fi
    
    # Check Grafana
    if curl -f http://localhost:3001 > /dev/null 2>&1; then
        success "Grafana is running"
    else
        error "Grafana is not running"
    fi
    
    # Check Kibana
    if curl -f http://localhost:5601 > /dev/null 2>&1; then
        success "Kibana is running"
    else
        error "Kibana is not running"
    fi
    
    success "Monitoring setup completed"
}

# Main deployment function
main() {
    log "Starting ZippyCoin production deployment..."
    log "Environment: $ENVIRONMENT"
    log "Region: $REGION"
    
    # Check prerequisites
    check_prerequisites
    
    # Create SSL certificates
    create_ssl_certificates
    
    # Build Docker images
    build_images
    
    # Deploy with Docker Compose
    deploy_docker_compose
    
    # Initialize blockchain
    initialize_blockchain
    
    # Setup monitoring
    setup_monitoring
    
    # Final health check
    check_service_health
    
    success "ZippyCoin production deployment completed successfully!"
    log "Services are now running:"
    log "  - API Gateway: https://api.zippycoin.io"
    log "  - Blockchain RPC: https://rpc.zippycoin.io"
    log "  - Trust Engine: https://trust.zippycoin.io"
    log "  - Wallet Service: https://wallet.zippycoin.io"
    log "  - Governance Service: https://governance.zippycoin.io"
    log "  - DeFi Service: https://defi.zippycoin.io"
    log "  - NFT Service: https://nft.zippycoin.io"
    log "  - Bridge Service: https://bridge.zippycoin.io"
    log "  - Node Service: https://node.zippycoin.io"
    log "  - Monitoring Dashboard: https://dashboard.zippycoin.io"
    log "  - Metrics: https://metrics.zippycoin.io"
    log "  - Logs: https://logs.zippycoin.io"
}

# Run main function
main "$@"










