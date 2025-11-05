#!/bin/bash

# ZippyCoin Mainnet Launch Script
# This script launches the ZippyCoin mainnet with all validators and services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MAINNET_TIMESTAMP=$(date +%s)
GENESIS_TIMESTAMP=$MAINNET_TIMESTAMP
VALIDATOR_COUNT=50
FULL_NODE_COUNT=200
EDGE_NODE_COUNT=500

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

# Create mainnet genesis block
create_mainnet_genesis() {
    log "Creating mainnet genesis block..."
    
    # Update genesis.json with mainnet timestamp
    jq --arg timestamp "0x$(printf '%x' $GENESIS_TIMESTAMP)" '.timestamp = $timestamp' genesis.json > genesis-mainnet.json
    
    # Add all 50 validators to genesis
    for i in $(seq 1 $VALIDATOR_COUNT); do
        # Generate validator address and key
        VALIDATOR_ADDRESS=$(openssl rand -hex 20 | sed 's/^/0x/')
        VALIDATOR_PUBLIC_KEY=$(openssl rand -hex 65 | sed 's/^/0x04/')
        VALIDATOR_STAKE="1000000000000000000000000"
        VALIDATOR_TRUST_SCORE=$((100 - (i - 1) * 2))
        
        # Add validator to genesis
        jq --arg address "$VALIDATOR_ADDRESS" \
           --arg publicKey "$VALIDATOR_PUBLIC_KEY" \
           --arg stake "$VALIDATOR_STAKE" \
           --argjson trustScore "$VALIDATOR_TRUST_SCORE" \
           '.validators += [{
             "address": $address,
             "publicKey": $publicKey,
             "stake": $stake,
             "trustScore": $trustScore,
             "isActive": true,
             "nodeType": "validator"
           }]' genesis-mainnet.json > temp.json && mv temp.json genesis-mainnet.json
    done
    
    success "Mainnet genesis block created with $VALIDATOR_COUNT validators"
}

# Deploy validators
deploy_validators() {
    log "Deploying $VALIDATOR_COUNT validators..."
    
    for i in $(seq 1 $VALIDATOR_COUNT); do
        log "Deploying validator $i..."
        
        # Create validator deployment
        cat > "validator-${i}.yaml" << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: zippycoin-validator-${i}
  namespace: zippycoin
  labels:
    app: zippycoin-validator-${i}
    component: blockchain
    node-type: validator
spec:
  replicas: 1
  selector:
    matchLabels:
      app: zippycoin-validator-${i}
  template:
    metadata:
      labels:
        app: zippycoin-validator-${i}
        component: blockchain
        node-type: validator
    spec:
      containers:
      - name: zippycoin-validator-${i}
        image: zippycoin/blockchain-core:latest
        ports:
        - containerPort: 8545
          name: rpc
        - containerPort: 30303
          name: p2p
        env:
        - name: NODE_TYPE
          value: "validator"
        - name: NODE_ID
          value: "validator-${i}"
        - name: NETWORK_ID
          value: "zippycoin-mainnet"
        - name: GENESIS_FILE
          value: "/app/genesis.json"
        - name: RPC_PORT
          value: "8545"
        - name: P2P_PORT
          value: "30303"
        - name: VALIDATOR_STAKE
          value: "1000000000000000000000000"
        - name: TRUST_SCORE
          value: "$((100 - (i - 1) * 2))"
        resources:
          requests:
            memory: "4Gi"
            cpu: "2"
          limits:
            memory: "8Gi"
            cpu: "4"
        volumeMounts:
        - name: genesis-config
          mountPath: /app/genesis.json
          subPath: genesis.json
        - name: validator-${i}-data
          mountPath: /app/data
        livenessProbe:
          httpGet:
            path: /health
            port: 8545
          initialDelaySeconds: 60
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 8545
          initialDelaySeconds: 30
          periodSeconds: 10
      volumes:
      - name: genesis-config
        configMap:
          name: zippycoin-genesis
      - name: validator-${i}-data
        persistentVolumeClaim:
          claimName: validator-${i}-pvc
      restartPolicy: Always
EOF
        
        # Create validator service
        cat > "validator-${i}-service.yaml" << EOF
apiVersion: v1
kind: Service
metadata:
  name: zippycoin-validator-${i}
  namespace: zippycoin
  labels:
    app: zippycoin-validator-${i}
spec:
  selector:
    app: zippycoin-validator-${i}
  ports:
  - name: rpc
    port: 8545
    targetPort: 8545
  - name: p2p
    port: 30303
    targetPort: 30303
  type: ClusterIP
EOF
        
        # Create validator PVC
        cat > "validator-${i}-pvc.yaml" << EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: validator-${i}-pvc
  namespace: zippycoin
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
  storageClassName: fast-ssd
EOF
        
        # Apply validator resources
        kubectl apply -f "validator-${i}.yaml"
        kubectl apply -f "validator-${i}-service.yaml"
        kubectl apply -f "validator-${i}-pvc.yaml"
        
        # Wait for validator to be ready
        kubectl wait --for=condition=available --timeout=300s deployment/zippycoin-validator-${i} -n zippycoin
        
        success "Validator $i deployed successfully"
    done
    
    success "All $VALIDATOR_COUNT validators deployed"
}

# Deploy full nodes
deploy_full_nodes() {
    log "Deploying $FULL_NODE_COUNT full nodes..."
    
    for i in $(seq 1 $FULL_NODE_COUNT); do
        log "Deploying full node $i..."
        
        # Create full node deployment
        cat > "full-node-${i}.yaml" << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: zippycoin-full-node-${i}
  namespace: zippycoin
  labels:
    app: zippycoin-full-node-${i}
    component: blockchain
    node-type: full
spec:
  replicas: 1
  selector:
    matchLabels:
      app: zippycoin-full-node-${i}
  template:
    metadata:
      labels:
        app: zippycoin-full-node-${i}
        component: blockchain
        node-type: full
    spec:
      containers:
      - name: zippycoin-full-node-${i}
        image: zippycoin/blockchain-core:latest
        ports:
        - containerPort: 8545
          name: rpc
        - containerPort: 30303
          name: p2p
        env:
        - name: NODE_TYPE
          value: "full"
        - name: NODE_ID
          value: "full-node-${i}"
        - name: NETWORK_ID
          value: "zippycoin-mainnet"
        - name: GENESIS_FILE
          value: "/app/genesis.json"
        - name: RPC_PORT
          value: "8545"
        - name: P2P_PORT
          value: "30303"
        resources:
          requests:
            memory: "2Gi"
            cpu: "1"
          limits:
            memory: "4Gi"
            cpu: "2"
        volumeMounts:
        - name: genesis-config
          mountPath: /app/genesis.json
          subPath: genesis.json
        - name: full-node-${i}-data
          mountPath: /app/data
        livenessProbe:
          httpGet:
            path: /health
            port: 8545
          initialDelaySeconds: 60
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 8545
          initialDelaySeconds: 30
          periodSeconds: 10
      volumes:
      - name: genesis-config
        configMap:
          name: zippycoin-genesis
      - name: full-node-${i}-data
        persistentVolumeClaim:
          claimName: full-node-${i}-pvc
      restartPolicy: Always
EOF
        
        # Create full node service
        cat > "full-node-${i}-service.yaml" << EOF
apiVersion: v1
kind: Service
metadata:
  name: zippycoin-full-node-${i}
  namespace: zippycoin
  labels:
    app: zippycoin-full-node-${i}
spec:
  selector:
    app: zippycoin-full-node-${i}
  ports:
  - name: rpc
    port: 8545
    targetPort: 8545
  - name: p2p
    port: 30303
    targetPort: 30303
  type: ClusterIP
EOF
        
        # Create full node PVC
        cat > "full-node-${i}-pvc.yaml" << EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: full-node-${i}-pvc
  namespace: zippycoin
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
  storageClassName: standard
EOF
        
        # Apply full node resources
        kubectl apply -f "full-node-${i}.yaml"
        kubectl apply -f "full-node-${i}-service.yaml"
        kubectl apply -f "full-node-${i}-pvc.yaml"
        
        # Wait for full node to be ready
        kubectl wait --for=condition=available --timeout=300s deployment/zippycoin-full-node-${i} -n zippycoin
        
        success "Full node $i deployed successfully"
    done
    
    success "All $FULL_NODE_COUNT full nodes deployed"
}

# Deploy edge nodes
deploy_edge_nodes() {
    log "Deploying $EDGE_NODE_COUNT edge nodes..."
    
    for i in $(seq 1 $EDGE_NODE_COUNT); do
        log "Deploying edge node $i..."
        
        # Create edge node deployment
        cat > "edge-node-${i}.yaml" << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: zippycoin-edge-node-${i}
  namespace: zippycoin
  labels:
    app: zippycoin-edge-node-${i}
    component: blockchain
    node-type: edge
spec:
  replicas: 1
  selector:
    matchLabels:
      app: zippycoin-edge-node-${i}
  template:
    metadata:
      labels:
        app: zippycoin-edge-node-${i}
        component: blockchain
        node-type: edge
    spec:
      containers:
      - name: zippycoin-edge-node-${i}
        image: zippycoin/layer2-edge:latest
        ports:
        - containerPort: 8545
          name: rpc
        - containerPort: 30303
          name: p2p
        env:
        - name: NODE_TYPE
          value: "edge"
        - name: NODE_ID
          value: "edge-node-${i}"
        - name: NETWORK_ID
          value: "zippycoin-mainnet"
        - name: GENESIS_FILE
          value: "/app/genesis.json"
        - name: RPC_PORT
          value: "8545"
        - name: P2P_PORT
          value: "30303"
        - name: EDGE_SERVICES
          value: "compute,storage,dvpn"
        resources:
          requests:
            memory: "1Gi"
            cpu: "0.5"
          limits:
            memory: "2Gi"
            cpu: "1"
        volumeMounts:
        - name: genesis-config
          mountPath: /app/genesis.json
          subPath: genesis.json
        - name: edge-node-${i}-data
          mountPath: /app/data
        livenessProbe:
          httpGet:
            path: /health
            port: 8545
          initialDelaySeconds: 60
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 8545
          initialDelaySeconds: 30
          periodSeconds: 10
      volumes:
      - name: genesis-config
        configMap:
          name: zippycoin-genesis
      - name: edge-node-${i}-data
        persistentVolumeClaim:
          claimName: edge-node-${i}-pvc
      restartPolicy: Always
EOF
        
        # Create edge node service
        cat > "edge-node-${i}-service.yaml" << EOF
apiVersion: v1
kind: Service
metadata:
  name: zippycoin-edge-node-${i}
  namespace: zippycoin
  labels:
    app: zippycoin-edge-node-${i}
spec:
  selector:
    app: zippycoin-edge-node-${i}
  ports:
  - name: rpc
    port: 8545
    targetPort: 8545
  - name: p2p
    port: 30303
    targetPort: 30303
  type: ClusterIP
EOF
        
        # Create edge node PVC
        cat > "edge-node-${i}-pvc.yaml" << EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: edge-node-${i}-pvc
  namespace: zippycoin
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
  storageClassName: standard
EOF
        
        # Apply edge node resources
        kubectl apply -f "edge-node-${i}.yaml"
        kubectl apply -f "edge-node-${i}-service.yaml"
        kubectl apply -f "edge-node-${i}-pvc.yaml"
        
        # Wait for edge node to be ready
        kubectl wait --for=condition=available --timeout=300s deployment/zippycoin-edge-node-${i} -n zippycoin
        
        success "Edge node $i deployed successfully"
    done
    
    success "All $EDGE_NODE_COUNT edge nodes deployed"
}

# Deploy backend services
deploy_backend_services() {
    log "Deploying backend services..."
    
    # Deploy API Gateway
    kubectl apply -f k8s/api-gateway.yaml
    
    # Deploy Trust Engine
    kubectl apply -f k8s/trust-engine.yaml
    
    # Deploy Wallet Service
    kubectl apply -f k8s/wallet-service.yaml
    
    # Deploy Governance Service
    kubectl apply -f k8s/governance-service.yaml
    
    # Deploy DeFi Service
    kubectl apply -f k8s/defi-service.yaml
    
    # Deploy NFT Service
    kubectl apply -f k8s/nft-service.yaml
    
    # Deploy Bridge Service
    kubectl apply -f k8s/bridge-service.yaml
    
    # Deploy Node Service
    kubectl apply -f k8s/node-service.yaml
    
    # Wait for all services to be ready
    kubectl wait --for=condition=available --timeout=300s deployment --all -n zippycoin
    
    success "All backend services deployed"
}

# Deploy monitoring
deploy_monitoring() {
    log "Deploying monitoring stack..."
    
    # Deploy Prometheus
    kubectl apply -f k8s/prometheus.yaml
    
    # Deploy Grafana
    kubectl apply -f k8s/grafana.yaml
    
    # Deploy ELK Stack
    kubectl apply -f k8s/elasticsearch.yaml
    kubectl apply -f k8s/logstash.yaml
    kubectl apply -f k8s/kibana.yaml
    
    # Wait for monitoring to be ready
    kubectl wait --for=condition=available --timeout=300s deployment --all -n zippycoin
    
    success "Monitoring stack deployed"
}

# Deploy load balancer
deploy_load_balancer() {
    log "Deploying load balancer..."
    
    # Deploy Nginx
    kubectl apply -f k8s/nginx.yaml
    
    # Wait for load balancer to be ready
    kubectl wait --for=condition=available --timeout=300s deployment/nginx -n zippycoin
    
    success "Load balancer deployed"
}

# Initialize mainnet
initialize_mainnet() {
    log "Initializing mainnet..."
    
    # Wait for validators to be ready
    sleep 60
    
    # Check if genesis block is created
    if kubectl exec -n zippycoin deployment/zippycoin-validator-1 -- curl -f http://localhost:8545 -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' > /dev/null 2>&1; then
        success "Mainnet initialized successfully"
    else
        error "Failed to initialize mainnet"
        exit 1
    fi
}

# Check mainnet health
check_mainnet_health() {
    log "Checking mainnet health..."
    
    # Check validators
    for i in $(seq 1 $VALIDATOR_COUNT); do
        if kubectl exec -n zippycoin deployment/zippycoin-validator-${i} -- curl -f http://localhost:8545/health > /dev/null 2>&1; then
            success "Validator $i is healthy"
        else
            error "Validator $i is not responding"
        fi
    done
    
    # Check full nodes
    for i in $(seq 1 $FULL_NODE_COUNT); do
        if kubectl exec -n zippycoin deployment/zippycoin-full-node-${i} -- curl -f http://localhost:8545/health > /dev/null 2>&1; then
            success "Full node $i is healthy"
        else
            error "Full node $i is not responding"
        fi
    done
    
    # Check edge nodes
    for i in $(seq 1 $EDGE_NODE_COUNT); do
        if kubectl exec -n zippycoin deployment/zippycoin-edge-node-${i} -- curl -f http://localhost:8545/health > /dev/null 2>&1; then
            success "Edge node $i is healthy"
        else
            error "Edge node $i is not responding"
        fi
    done
    
    # Check backend services
    if kubectl exec -n zippycoin deployment/api-gateway -- curl -f http://localhost:3000/health > /dev/null 2>&1; then
        success "API Gateway is healthy"
    else
        error "API Gateway is not responding"
    fi
    
    if kubectl exec -n zippycoin deployment/trust-engine -- curl -f http://localhost:3001/health > /dev/null 2>&1; then
        success "Trust Engine is healthy"
    else
        error "Trust Engine is not responding"
    fi
    
    if kubectl exec -n zippycoin deployment/wallet-service -- curl -f http://localhost:3002/health > /dev/null 2>&1; then
        success "Wallet Service is healthy"
    else
        error "Wallet Service is not responding"
    fi
    
    if kubectl exec -n zippycoin deployment/governance-service -- curl -f http://localhost:3003/health > /dev/null 2>&1; then
        success "Governance Service is healthy"
    else
        error "Governance Service is not responding"
    fi
    
    if kubectl exec -n zippycoin deployment/defi-service -- curl -f http://localhost:3004/health > /dev/null 2>&1; then
        success "DeFi Service is healthy"
    else
        error "DeFi Service is not responding"
    fi
    
    if kubectl exec -n zippycoin deployment/nft-service -- curl -f http://localhost:3005/health > /dev/null 2>&1; then
        success "NFT Service is healthy"
    else
        error "NFT Service is not responding"
    fi
    
    if kubectl exec -n zippycoin deployment/bridge-service -- curl -f http://localhost:3006/health > /dev/null 2>&1; then
        success "Bridge Service is healthy"
    else
        error "Bridge Service is not responding"
    fi
    
    if kubectl exec -n zippycoin deployment/node-service -- curl -f http://localhost:3007/health > /dev/null 2>&1; then
        success "Node Service is healthy"
    else
        error "Node Service is not responding"
    fi
    
    success "Mainnet health check completed"
}

# Main function
main() {
    log "Starting ZippyCoin mainnet launch..."
    log "Mainnet timestamp: $MAINNET_TIMESTAMP"
    log "Validator count: $VALIDATOR_COUNT"
    log "Full node count: $FULL_NODE_COUNT"
    log "Edge node count: $EDGE_NODE_COUNT"
    
    # Create mainnet genesis block
    create_mainnet_genesis
    
    # Deploy validators
    deploy_validators
    
    # Deploy full nodes
    deploy_full_nodes
    
    # Deploy edge nodes
    deploy_edge_nodes
    
    # Deploy backend services
    deploy_backend_services
    
    # Deploy monitoring
    deploy_monitoring
    
    # Deploy load balancer
    deploy_load_balancer
    
    # Initialize mainnet
    initialize_mainnet
    
    # Check mainnet health
    check_mainnet_health
    
    success "ZippyCoin mainnet launched successfully!"
    log "Mainnet is now live with:"
    log "  - $VALIDATOR_COUNT validators"
    log "  - $FULL_NODE_COUNT full nodes"
    log "  - $EDGE_NODE_COUNT edge nodes"
    log "  - All backend services"
    log "  - Complete monitoring stack"
    log "  - Load balancer"
    log ""
    log "Services are accessible at:"
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
    log ""
    log "ZippyCoin mainnet is now live and ready for transactions!"
}

# Run main function
main "$@"










