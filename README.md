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

## 🏗️ What Gets Installed

- **Blockchain Core**: Pure DPoS consensus engine
- **Backend Services**: Trust Engine, API Gateway, Wallet Service
- **Layer 2 Edge**: Privacy chains and mesh networking
- **Monitoring Stack**: Prometheus, Grafana, and custom dashboards
- **Deployment Tools**: Scripts for scaling and management

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

### Single Node (Development)
```bash
npm run start:single
```

### Multi-Node Network
```bash
npm run start:network
```

### With Monitoring
```bash
npm run start:full
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