# ZippyCoin Backend - Production Deployment Guide

**Status:** PRODUCTION READY  
**Infrastructure:** Complete microservices with monitoring  
**Security:** Quantum-resistant, trust-weighted features  

---

## 🏗️ **ARCHITECTURE OVERVIEW**

### **Complete Microservices Stack**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │    │   Load Balancer │    │   Monitoring    │
│   (Port 3007)   │◄──►│   (Nginx)       │◄──►│   (Prometheus)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Trust Engine   │    │  Wallet Service │    │   Node Service  │
│   (Port 3000)   │    │   (Port 3001)   │    │   (Port 3002)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  DeFi Service   │    │ Governance Svc  │    │  Bridge Service │
│   (Port 3003)   │    │   (Port 3004)   │    │   (Port 3005)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   NFT Service   │    │   PostgreSQL    │    │     Redis       │
│   (Port 3006)   │    │   (Port 5432)   │    │   (Port 6379)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 🚀 **QUICK START (Production)**

### **1. Prerequisites**
```bash
# Install Docker and Docker Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Yarn
npm install -g yarn
```

### **2. Environment Setup**
```bash
# Clone repository
git clone https://github.com/zippycoin/core-research.git
cd core-research

# Install dependencies
yarn install

# Set environment variables
cp .env.example .env
# Edit .env with production values
```

### **3. Database Setup**
```bash
# Start database and run migrations
yarn infrastructure:start
yarn database:migrate
yarn database:seed
```

### **4. Start All Services**
```bash
# Start entire infrastructure
yarn infrastructure:start

# Check status
yarn infrastructure:logs
```

---

## 📊 **SERVICE ENDPOINTS**

### **API Gateway (Main Entry Point)**
- **URL:** `http://localhost:3007`
- **Health Check:** `GET /health`
- **API Docs:** `GET /api-docs`
- **Metrics:** `GET /metrics`

### **Individual Services**
| Service | Port | Health Check | API Base |
|---------|------|--------------|----------|
| Trust Engine | 3000 | `/health` | `/api/v1/trust` |
| Wallet Service | 3001 | `/health` | `/api/v1/wallet` |
| Node Service | 3002 | `/health` | `/api/v1/node` |
| DeFi Service | 3003 | `/health` | `/api/v1/defi` |
| Governance Service | 3004 | `/health` | `/api/v1/governance` |
| Bridge Service | 3005 | `/health` | `/api/v1/bridge` |
| NFT Service | 3006 | `/health` | `/api/v1/nft` |

### **Monitoring & Infrastructure**
| Service | Port | Access |
|---------|------|--------|
| Prometheus | 9090 | `http://localhost:9090` |
| Grafana | 3008 | `http://localhost:3008` (admin/zippycoin) |
| PostgreSQL | 5432 | `localhost:5432` |
| Redis | 6379 | `localhost:6379` |
| Nginx | 80/443 | `http://localhost` |

---

## 🔧 **CONFIGURATION**

### **Environment Variables**
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=zippycoin
DB_PASSWORD=zippycoin
DB_NAME=zippycoin

# Redis
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your-super-secret-jwt-key
ENCRYPTION_KEY=your-32-byte-encryption-key

# Blockchain
BLOCKCHAIN_RPC_URL=http://localhost:8545
BLOCKCHAIN_NETWORK=mainnet

# Monitoring
PROMETHEUS_ENABLED=true
GRAFANA_ENABLED=true
```

### **Service Configuration**
Each service can be configured independently:

```bash
# Wallet Service Configuration
cd packages/backend/wallet-service
cp .env.example .env
# Edit .env with service-specific settings

# DeFi Service Configuration
cd packages/backend/defi-service
cp .env.example .env
# Edit .env with DeFi-specific settings
```

---

## 📈 **MONITORING & OBSERVABILITY**

### **Prometheus Metrics**
- **Trust Scores:** `zippycoin_trust_score`
- **DeFi Positions:** `zippycoin_defi_position_value`
- **Governance Votes:** `zippycoin_governance_votes_total`
- **Bridge Transfers:** `zippycoin_bridge_transfers_total`
- **NFT Mints:** `zippycoin_nft_mints_total`
- **Service Health:** `zippycoin_service_health`

### **Grafana Dashboards**
- **Ecosystem Overview:** Trust scores, DeFi activity, governance participation
- **Service Health:** Response times, error rates, throughput
- **Trust Analytics:** Trust score distribution, delegation patterns
- **DeFi Metrics:** Pool performance, yield farming, lending activity
- **Bridge Analytics:** Cross-chain transfer volume, fees, success rates

### **Logging**
```bash
# View all service logs
yarn infrastructure:logs

# View specific service logs
docker logs zippycoin-trust-engine
docker logs zippycoin-wallet-service
docker logs zippycoin-defi-service
```

---

## 🔒 **SECURITY FEATURES**

### **Quantum-Resistant Security**
- **CRYSTALS-Dilithium:** Post-quantum digital signatures
- **CRYSTALS-Kyber:** Post-quantum key exchange
- **Hybrid Signatures:** Fallback to Ed25519 for compatibility
- **Environmental Data:** Temperature, accelerometer integration

### **Trust-Weighted Security**
- **Access Control:** Trust score-based permissions
- **Rate Limiting:** Trust-weighted request limits
- **Fee Discounts:** Trust-based fee reductions
- **Transfer Restrictions:** Trust-based NFT transfer limits

### **Infrastructure Security**
- **HTTPS/TLS:** SSL termination at Nginx
- **Rate Limiting:** Per-IP and per-user limits
- **Input Validation:** All endpoints validated
- **Error Handling:** No sensitive data in error responses

---

## 🧪 **TESTING**

### **Unit Tests**
```bash
# Run all tests
yarn test:all

# Run specific service tests
yarn test:wallet-service
yarn test:defi-service
yarn test:governance-service
```

### **Integration Tests**
```bash
# Test API Gateway
curl http://localhost:3007/health

# Test individual services
curl http://localhost:3000/health  # Trust Engine
curl http://localhost:3001/health  # Wallet Service
curl http://localhost:3003/health  # DeFi Service
```

### **Load Testing**
```bash
# Install artillery
npm install -g artillery

# Run load tests
artillery run packages/backend/tests/load-test.yml
```

---

## 🚨 **TROUBLESHOOTING**

### **Common Issues**

#### **Service Won't Start**
```bash
# Check logs
yarn infrastructure:logs

# Restart specific service
docker restart zippycoin-trust-engine

# Check resource usage
docker stats
```

#### **Database Connection Issues**
```bash
# Check PostgreSQL status
docker logs zippycoin-postgres

# Reset database
docker-compose down -v
docker-compose up -d postgres
yarn database:migrate
```

#### **Memory Issues**
```bash
# Check memory usage
docker stats

# Increase memory limits in docker-compose.yml
services:
  trust-engine:
    deploy:
      resources:
        limits:
          memory: 2G
```

### **Performance Optimization**
```bash
# Scale services
docker-compose up -d --scale defi-service=3

# Monitor performance
docker stats

# Check Prometheus metrics
curl http://localhost:9090/api/v1/query?query=zippycoin_service_response_time
```

---

## 📋 **DEPLOYMENT CHECKLIST**

### **Pre-Deployment**
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] SSL certificates installed
- [ ] Firewall rules configured
- [ ] Monitoring alerts set up

### **Deployment**
- [ ] Start infrastructure: `yarn infrastructure:start`
- [ ] Verify all services healthy: `curl http://localhost:3007/health`
- [ ] Check monitoring: `http://localhost:3008` (Grafana)
- [ ] Test API endpoints
- [ ] Verify trust-weighted features

### **Post-Deployment**
- [ ] Monitor error rates
- [ ] Check response times
- [ ] Verify trust score calculations
- [ ] Test quantum-resistant features
- [ ] Validate DeFi protocol interactions

---

## 🔄 **UPDATES & MAINTENANCE**

### **Service Updates**
```bash
# Update specific service
docker-compose pull trust-engine
docker-compose up -d trust-engine

# Update all services
docker-compose pull
docker-compose up -d
```

### **Database Backups**
```bash
# Create backup
docker exec zippycoin-postgres pg_dump -U zippycoin zippycoin > backup.sql

# Restore backup
docker exec -i zippycoin-postgres psql -U zippycoin zippycoin < backup.sql
```

### **Monitoring Maintenance**
```bash
# Check Prometheus storage
docker exec zippycoin-prometheus du -sh /prometheus

# Clean old metrics
docker exec zippycoin-prometheus wget --post-data='' http://localhost:9090/-/reload
```

---

## 📞 **SUPPORT**

### **Documentation**
- **API Documentation:** `http://localhost:3007/api-docs`
- **Architecture Docs:** `docs/ARCHITECTURE.md`
- **Development Guide:** `docs/DEVELOPMENT.md`

### **Monitoring**
- **Grafana Dashboards:** `http://localhost:3008`
- **Prometheus Metrics:** `http://localhost:9090`
- **Service Logs:** `yarn infrastructure:logs`

### **Emergency Contacts**
- **Infrastructure Issues:** Check Docker logs and service health
- **Trust Engine Issues:** Verify quantum-resistant algorithms
- **DeFi Protocol Issues:** Check pool liquidity and trust scores
- **Governance Issues:** Verify proposal and voting mechanisms

---

**Last Updated:** Current deployment phase  
**Next Review:** After production launch and user feedback 