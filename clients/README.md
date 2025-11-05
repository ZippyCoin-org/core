# ZippyCoin Backend Microservices

This directory contains backend microservices for the ZippyCoin ecosystem. Each service is factored for modularity, scalability, and independent deployment.

## Microservices Overview

### ✅ **COMPLETED SERVICES**

#### 1. Trust Engine Service
- **Path:** `trust-engine/`
- **Role:** Trust score calculation, delegation, reputation tracking
- **API:** `/trust/score`, `/trust/delegate`, `/trust/reputation`
- **Status:** ✅ Implemented with quantum-resistant features

#### 2. Wallet Service
- **Path:** `wallet-service/`
- **Role:** Wallet creation, key management, transaction signing, balance queries
- **API:** `/wallet/create`, `/wallet/balance`, `/wallet/send`, `/wallet/sign`
- **Status:** ✅ Implemented with HD wallet and quantum-resistant crypto

#### 3. Node Service
- **Path:** `node-service/`
- **Role:** Node status, peer management, block/tx relay, WebSocket support
- **API:** `/node/status`, `/node/peers`, `/node/relay`
- **Status:** ✅ Implemented with WebSocket peer management

#### 4. DeFi Service
- **Path:** `defi-service/`
- **Role:** DeFi protocol interaction, yield farming, lending, trust-weighted features
- **API:** `/defi/pools`, `/defi/position`, `/defi/yield`, `/defi/swap`
- **Status:** ✅ Implemented with trust-weighted protocols

### 🚧 **IN PROGRESS SERVICES**

#### 5. Governance Service (Planned)
- **Role:** Proposal management, trust-weighted voting
- **API:** `/governance/proposals`, `/governance/vote`, `/governance/results`
- **Status:** 🔄 In development

#### 6. Bridge Service (Planned)
- **Role:** Cross-chain asset transfer, proof verification
- **API:** `/bridge/transfer`, `/bridge/proof`
- **Status:** 🔄 In development

#### 7. NFT Service (Planned)
- **Role:** NFT minting, transfer, credential verification
- **API:** `/nft/mint`, `/nft/transfer`, `/nft/verify`
- **Status:** 🔄 In development

## 🏗️ **Architecture**

### Service Communication
- All services communicate via REST/GraphQL APIs and message queues
- WebSocket support for real-time updates (Node Service)
- Shared types and utilities in `shared/` directory
- Each service is independently deployable and scalable

### Security Features
- Rate limiting on all endpoints
- Helmet.js security headers
- CORS configuration
- Input validation middleware
- Error handling with structured logging

### Quantum-Resistant Features
- Trust Engine with quantum-resistant algorithms
- Wallet service with hybrid signature schemes
- Environmental data integration
- Trust-weighted DeFi protocols

## 🚀 **Quick Start**

### Prerequisites
- Node.js 18+
- Yarn package manager
- Redis (for caching and sessions)

### Development Setup
```bash
# Install dependencies for all services
yarn install

# Start all services in development mode
yarn dev:api

# Or start individual services
yarn dev:wallet-api
yarn dev:node-api
yarn dev:trust-api
yarn dev:defi-api
```

### Production Deployment
```bash
# Build all services
yarn build:all

# Start services individually
cd packages/backend/wallet-service && yarn start
cd packages/backend/node-service && yarn start
cd packages/backend/trust-engine && yarn start
cd packages/backend/defi-service && yarn start
```

## 📊 **Service Status**

| Service | Status | Port | Health Check |
|---------|--------|------|--------------|
| Trust Engine | ✅ Complete | 3000 | `/health` |
| Wallet Service | ✅ Complete | 3001 | `/health` |
| Node Service | ✅ Complete | 3002 | `/health` |
| DeFi Service | ✅ Complete | 3003 | `/health` |
| Governance | 🔄 In Progress | 3004 | - |
| Bridge | 🔄 In Progress | 3005 | - |
| NFT | 🔄 In Progress | 3006 | - |

## 🔧 **Configuration**

Each service uses environment variables for configuration:

```env
# Common
NODE_ENV=development
PORT=3001
LOG_LEVEL=info

# Database (if needed)
DATABASE_URL=postgresql://user:pass@localhost:5432/zippycoin

# Redis
REDIS_URL=redis://localhost:6379

# Blockchain
BLOCKCHAIN_RPC_URL=http://localhost:8545
BLOCKCHAIN_NETWORK=testnet

# Security
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key
```

## 📈 **Monitoring & Logging**

- Structured JSON logging across all services
- Health check endpoints for monitoring
- Error tracking and alerting
- Performance metrics collection
- Trust score monitoring and analytics

## 🔒 **Security Considerations**

- All private keys encrypted at rest
- Quantum-resistant cryptographic algorithms
- Trust-weighted access controls
- Rate limiting and DDoS protection
- Input validation and sanitization
- Secure WebSocket connections

## 🧪 **Testing**

```bash
# Run tests for all services
yarn test:all

# Run tests for specific service
cd packages/backend/wallet-service && yarn test
cd packages/backend/node-service && yarn test
cd packages/backend/trust-engine && yarn test
cd packages/backend/defi-service && yarn test
```

## 📚 **API Documentation**

Each service includes OpenAPI/Swagger documentation available at:
- Trust Engine: `http://localhost:3000/api-docs`
- Wallet Service: `http://localhost:3001/api-docs`
- Node Service: `http://localhost:3002/api-docs`
- DeFi Service: `http://localhost:3003/api-docs`

## 🚨 **Next Steps**

1. **Complete remaining services** (Governance, Bridge, NFT)
2. **Add comprehensive testing** for all services
3. **Implement database persistence** for wallet and DeFi data
4. **Add monitoring and alerting** infrastructure
5. **Deploy to cloud infrastructure** (AWS/GCP)
6. **Implement load balancing** and auto-scaling
7. **Add API gateway** for unified access
8. **Implement service discovery** and health checks

---

**Last Updated:** Current development phase  
**Next Review:** After completing remaining services 