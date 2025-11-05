# ZippyCoin v1.0.0 - Universal Blockchain Platform

**Deploy ZippyCoin on any hardware - from single machines to global networks**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Required-blue.svg)](https://docker.com/)

## 🚀 Quick Start

### One-Line Install
```bash
curl -fsSL https://raw.githubusercontent.com/ZippyCoin-org/core/main/install.sh | bash
```

### Manual Install
```bash
git clone https://github.com/ZippyCoin-org/core.git
cd core
./install.sh
```

## 📦 Available Clients & Services

### Core Clients (`/clients/`)

| Client | Purpose | Technology | Location |
|--------|---------|------------|----------|
| **Backend Services** | API Gateway, Trust Engine, Wallet Service, DeFi, Governance | Node.js/TypeScript | `clients/backend-services/` |
| **Mobile Wallet** | iOS/Android wallet with biometric auth | React Native | `clients/mobile-wallet/` |
| **Smart Contracts** | DeFi, Governance, Bridge, NFT contracts | Solidity | `clients/smart-contracts/` |
| **Blockchain Core** | DPoS consensus engine | Rust | `clients/blockchain-core/` |
| **Infrastructure** | Docker Compose, K8s, Monitoring | YAML/Docker | `clients/infrastructure/` |

### Service Breakdown

#### Backend Services (`clients/backend-services/`)
- **Trust Engine**: Privacy scoring and compliance
- **API Gateway**: GraphQL API with WebSocket subscriptions
- **Wallet Service**: HD wallets, multisig, quantum-resistant crypto
- **DeFi Service**: Lending, staking, yield farming
- **Governance Service**: Proposal voting and delegation
- **NFT Service**: Credential NFTs and digital assets
- **Bridge Service**: Cross-chain transfers
- **Node Service**: Full node with RPC interface

#### Mobile Wallet (`clients/mobile-wallet/`)
- React Native app for iOS/Android
- Biometric authentication
- Quantum-resistant cryptography
- Trust scoring integration
- DeFi protocol interactions

#### Smart Contracts (`clients/smart-contracts/`)
- **TrustEngine.sol**: Privacy scoring contracts
- **Governance.sol**: Decentralized governance
- **DeFiProtocol.sol**: Lending and staking
- **Bridge.sol**: Cross-chain bridges
- **NFTCredential.sol**: Privacy-preserving NFTs

#### Infrastructure (`clients/infrastructure/`)
- **docker-compose.yml**: Full stack deployment
- **k8s/**: Kubernetes manifests for production
- **prometheus.yml**: Monitoring configuration
- **nginx.conf**: Load balancer configuration

## 🖥️ Supported Platforms

| Platform | Status | Minimum Requirements |
|----------|--------|---------------------|
| **Linux** | ✅ Full Support | Ubuntu 18.04+, 2GB RAM, 10GB disk |
| **macOS** | ✅ Full Support | macOS 10.15+, 4GB RAM, 10GB disk |
| **Windows** | 🔄 Coming Soon | WSL2 required |
| **Raspberry Pi** | ✅ Supported | 4GB RAM model recommended |
| **Cloud VMs** | ✅ Full Support | AWS, GCP, Azure, DigitalOcean |

## 📋 System Requirements

### Minimum (Single Node)
- **CPU**: 2 cores
- **RAM**: 2GB
- **Storage**: 10GB SSD
- **Network**: 10Mbps internet

### Recommended (Multi-Node)
- **CPU**: 4+ cores
- **RAM**: 8GB+
- **Storage**: 50GB+ SSD
- **Network**: 100Mbps+ internet

## 🛠️ Manual Setup

### 1. Install Dependencies

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install -y curl wget git build-essential
```

**macOS:**
```bash
# Install Homebrew if needed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

brew install curl wget git node@18 docker
```

**CentOS/RHEL/Fedora:**
```bash
sudo yum install -y curl wget git gcc gcc-c++ make
# or
sudo dnf install -y curl wget git gcc gcc-c++ make
```

### 2. Install Node.js (18+)

**Using NodeSource (Linux):**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Using Homebrew (macOS):**
```bash
brew install node@18
```

### 3. Install Docker

**Linux:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

**macOS:**
```bash
brew install --cask docker
```

### 4. Clone and Run

```bash
git clone https://github.com/ZippyCoin-org/core.git
cd core
npm install
npm run setup
```

## 🚀 Running ZippyCoin

### Quick Start (Docker)
```bash
cd clients/infrastructure
docker-compose up -d
```

### Individual Services

#### Run a Full Node
```bash
cd clients/backend-services
docker-compose up -d blockchain
```

#### Run Backend Services
```bash
cd clients/backend-services
docker-compose up -d trust-engine api-gateway wallet-service
```

#### Run Mobile Wallet (Development)
```bash
cd clients/mobile-wallet
npm install
npm start
# Or for iOS: npm run ios
# Or for Android: npm run android
```

#### Deploy Smart Contracts
```bash
cd clients/smart-contracts
npm install
npx hardhat run scripts/deploy.js --network localhost
```

#### Run Blockchain Core (Requires Rust)
```bash
cd clients/blockchain-core
cargo build --release
./target/release/zippycoin-node
```

## 📊 Monitoring & Management

Once running, access:
- **Blockchain Explorer**: http://localhost:3000
- **API Gateway**: http://localhost:4000
- **Monitoring Dashboard**: http://localhost:9090
- **Grafana**: http://localhost:3001

## 🔧 Configuration

### Environment Variables
```bash
# Network configuration
ZIPPYCOIN_NETWORK=mainnet|testnet|devnet
ZIPPYCOIN_PORT=8545
ZIPPYCOIN_DATA_DIR=/data/zippycoin

# Performance tuning
ZIPPYCOIN_MAX_PEERS=50
ZIPPYCOIN_CACHE_SIZE=512MB
```

### Docker Compose Override
```yaml
version: '3.8'
services:
  blockchain:
    environment:
      - ZIPPYCOIN_NETWORK=testnet
    volumes:
      - ./data:/data/zippycoin
```

## 🏘️ Network Deployment

### Genesis Node Setup
```bash
./scripts/setup-genesis.sh
```

### Add Validator Nodes
```bash
./scripts/add-validator.sh --ip <validator-ip>
```

### Scale to Multiple Nodes
```bash
./scripts/scale-network.sh --nodes 10
```

## 🛡️ Security

- **Validator Keys**: Secure key management with hardware security modules
- **Network Security**: TLS encryption and certificate pinning
- **Access Control**: Role-based permissions and API authentication
- **Monitoring**: Real-time security event monitoring

## 📚 Documentation

- [Architecture Overview](./docs/ARCHITECTURE.md)
- [API Reference](./docs/API.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Troubleshooting](./docs/TROUBLESHOOTING.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs.zippycoin.io](https://docs.zippycoin.io)
- **Discord**: [Join our community](https://discord.gg/zippycoin)
- **Issues**: [GitHub Issues](https://github.com/ZippyCoin-org/core/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ZippyCoin-org/core/discussions)

## 🚀 Roadmap

- [ ] Windows native support
- [ ] Mobile wallet apps
- [ ] Hardware wallet integration
- [ ] DeFi protocol expansion
- [ ] Cross-chain bridges
- [ ] Enterprise features

---

**Built with ❤️ by the ZippyCoin Community**

*Empowering financial freedom through decentralized technology*