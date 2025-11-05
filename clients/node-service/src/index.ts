import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { EnhancedNodeManager, NodeConfig } from './services/enhanced-node-manager';
import { environmentRoutes } from './routes/environment';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3002;

// Global node manager instance
let nodeManager: EnhancedNodeManager | null = null;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Health check
app.get('/health', (req, res) => {
  const status = nodeManager ? nodeManager.getStatus() : null;
  res.json({
    status: 'healthy',
    service: 'node-service',
    timestamp: new Date().toISOString(),
    nodeStatus: status,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage().heapUsed,
  });
});

// Initialize node endpoint
app.post('/api/v1/node/init', async (req, res) => {
  try {
    const config: NodeConfig = {
      nodeType: req.body.nodeType || 'full',
      port: req.body.port || 30303,
      rpcPort: req.body.rpcPort || 8545,
      wsPort: req.body.wsPort || 8546,
      dataDir: req.body.dataDir || './data',
      maxPeers: req.body.maxPeers || 50,
      minPeers: req.body.minPeers || 10,
      syncMode: req.body.syncMode || 'fast',
      pruning: req.body.pruning !== false,
      enableMining: req.body.enableMining || false,
      validatorKey: req.body.validatorKey,
    };

    nodeManager = new EnhancedNodeManager(config);
    await nodeManager.initialize();

    res.json({
      success: true,
      message: 'Node initialized successfully',
      config,
    });
  } catch (error) {
    logger.error('Error initializing node:', error);
    res.status(500).json({ error: 'Failed to initialize node' });
  }
});

// API routes
app.use('/api/v1/environment', environmentRoutes);

// Enhanced node routes (import after nodeManager is initialized)
if (nodeManager) {
  // Node management endpoints
  app.get('/api/v1/node/status', (req, res) => {
    try {
      const status = nodeManager!.getStatus();
      res.json(status);
    } catch (error) {
      logger.error('Error getting node status:', error);
      res.status(500).json({ error: 'Failed to get node status' });
    }
  });

  app.get('/api/v1/node/config', (req, res) => {
    try {
      const config = nodeManager!.getConfig();
      res.json(config);
    } catch (error) {
      logger.error('Error getting node config:', error);
      res.status(500).json({ error: 'Failed to get node config' });
    }
  });

  // Blockchain data endpoints
  app.get('/api/v1/block/:blockNumber', async (req, res) => {
    try {
      const blockNumber = parseInt(req.params.blockNumber);
      if (isNaN(blockNumber)) {
        return res.status(400).json({ error: 'Invalid block number' });
      }

      const block = await nodeManager!.getBlock(blockNumber);
      if (!block) {
        return res.status(404).json({ error: 'Block not found' });
      }

      res.json(block);
    } catch (error) {
      logger.error('Error getting block:', error);
      res.status(500).json({ error: 'Failed to get block' });
    }
  });

  app.get('/api/v1/block/latest', async (req, res) => {
    try {
      const block = await nodeManager!.getLatestBlock();
      if (!block) {
        return res.status(404).json({ error: 'Latest block not found' });
      }

      res.json(block);
    } catch (error) {
      logger.error('Error getting latest block:', error);
      res.status(500).json({ error: 'Failed to get latest block' });
    }
  });

  app.get('/api/v1/transaction/:txHash', async (req, res) => {
    try {
      const txHash = req.params.txHash;
      const transaction = await nodeManager!.getTransaction(txHash);
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      res.json(transaction);
    } catch (error) {
      logger.error('Error getting transaction:', error);
      res.status(500).json({ error: 'Failed to get transaction' });
    }
  });

  // Network endpoints
  app.get('/api/v1/network/stats', (req, res) => {
    try {
      const stats = nodeManager!.getNetworkStats();
      res.json(stats);
    } catch (error) {
      logger.error('Error getting network stats:', error);
      res.status(500).json({ error: 'Failed to get network stats' });
    }
  });

  app.get('/api/v1/network/peers', (req, res) => {
    try {
      const peers = nodeManager!.getPeers();
      res.json({ peers, count: peers.length });
    } catch (error) {
      logger.error('Error getting peers:', error);
      res.status(500).json({ error: 'Failed to get peers' });
    }
  });

  // Performance endpoints
  app.get('/api/v1/node/stats', (req, res) => {
    try {
      const stats = nodeManager!.getStats();
      res.json(stats);
    } catch (error) {
      logger.error('Error getting node stats:', error);
      res.status(500).json({ error: 'Failed to get node stats' });
    }
  });

  app.get('/api/v1/node/health', (req, res) => {
    try {
      const status = nodeManager!.getStatus();

      const health = {
        status: status.isOnline ? 'healthy' : 'unhealthy',
        uptime: status.uptime,
        lastActivity: status.lastActivity,
        syncStatus: status.isSyncing ? 'syncing' : 'synced',
        peerCount: status.peerCount,
        blockHeight: status.latestBlock,
        timestamp: new Date().toISOString(),
      };

      res.json(health);
    } catch (error) {
      logger.error('Error getting node health:', error);
      res.status(500).json({ error: 'Failed to get node health' });
    }
  });
}

// WebSocket connection handling
// WebSocket peer networking will be added in a later task

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
server.listen(PORT, () => {
  logger.info(`🚀 Enhanced Node Service running on port ${PORT}`);
  logger.info(`📊 Health check: http://localhost:${PORT}/health`);
  logger.info(`🔗 Node status: http://localhost:${PORT}/api/v1/node/status`);
  logger.info(`📈 Network stats: http://localhost:${PORT}/api/v1/network/stats`);
  logger.info(`🔍 Block data: http://localhost:${PORT}/api/v1/block/:number`);
  logger.info(`💰 Transaction data: http://localhost:${PORT}/api/v1/transaction/:hash`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  if (nodeManager) {
    nodeManager.shutdown().catch(logger.error);
  }
  server.close(() => {
    logger.info('Node service closed');
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  if (nodeManager) {
    nodeManager.shutdown().catch(logger.error);
  }
  server.close(() => {
    logger.info('Node service closed');
  });
});

export default app; 