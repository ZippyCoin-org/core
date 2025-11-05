import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { EnhancedDeFiManager } from './services/enhanced-defi-manager';
import { environmentRoutes } from './routes/environment';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3003;

// Global DeFi manager instance
let defiManager: EnhancedDeFiManager | null = null;

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
  const analytics = defiManager ? defiManager.getAnalytics() : null;
  res.json({
    status: 'healthy',
    service: 'defi-service',
    timestamp: new Date().toISOString(),
    defiStatus: analytics,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage().heapUsed,
  });
});

// Initialize DeFi service endpoint
app.post('/api/v1/defi/init', async (req, res) => {
  try {
    defiManager = new EnhancedDeFiManager();
    res.json({
      success: true,
      message: 'DeFi service initialized successfully',
    });
  } catch (error) {
    logger.error('Error initializing DeFi service:', error);
    res.status(500).json({ error: 'Failed to initialize DeFi service' });
  }
});

// API routes
app.use('/api/v1/environment', environmentRoutes);

// Enhanced DeFi routes (import after defiManager is initialized)
if (defiManager) {
  // Staking endpoints
  app.post('/api/v1/defi/stake/validator', async (req, res) => {
    try {
      const { userAddress, stakeAmount } = req.body;

      if (!userAddress || !stakeAmount) {
        return res.status(400).json({ error: 'User address and stake amount required' });
      }

      const position = await defiManager.stakeForValidator(userAddress, stakeAmount);

      res.json({
        success: true,
        position,
        message: 'Validator stake created successfully',
      });
    } catch (error) {
      logger.error('Error staking for validator:', error);
      res.status(500).json({ error: error.message || 'Failed to stake for validator' });
    }
  });

  app.post('/api/v1/defi/stake/full-node', async (req, res) => {
    try {
      const { userAddress, stakeAmount } = req.body;

      if (!userAddress || !stakeAmount) {
        return res.status(400).json({ error: 'User address and stake amount required' });
      }

      const position = await defiManager.stakeForFullNode(userAddress, stakeAmount);

      res.json({
        success: true,
        position,
        message: 'Full node stake created successfully',
      });
    } catch (error) {
      logger.error('Error staking for full node:', error);
      res.status(500).json({ error: error.message || 'Failed to stake for full node' });
    }
  });

  app.get('/api/v1/defi/stake/:userAddress', (req, res) => {
    try {
      const { userAddress } = req.params;
      const positions = defiManager.getUserStakingPositions(userAddress);

      res.json({
        userAddress,
        positions,
        count: positions.length,
      });
    } catch (error) {
      logger.error('Error getting staking positions:', error);
      res.status(500).json({ error: 'Failed to get staking positions' });
    }
  });

  // Pool endpoints
  app.get('/api/v1/defi/pools', (req, res) => {
    try {
      const pools = defiManager.getAllPools();

      res.json({
        liquidity: pools.liquidity,
        yieldFarming: pools.yieldFarming,
        totalLiquidity: pools.liquidity.length,
        totalYieldFarming: pools.yieldFarming.length,
      });
    } catch (error) {
      logger.error('Error getting pools:', error);
      res.status(500).json({ error: 'Failed to get pools' });
    }
  });

  app.get('/api/v1/defi/pool/:poolId', (req, res) => {
    try {
      const { poolId } = req.params;
      const pool = defiManager.getPool(poolId);

      if (!pool) {
        return res.status(404).json({ error: 'Pool not found' });
      }

      res.json(pool);
    } catch (error) {
      logger.error('Error getting pool:', error);
      res.status(500).json({ error: 'Failed to get pool' });
    }
  });

  // Analytics endpoints
  app.get('/api/v1/defi/analytics', (req, res) => {
    try {
      const analytics = defiManager.getAnalytics();

      res.json(analytics);
    } catch (error) {
      logger.error('Error getting DeFi analytics:', error);
      res.status(500).json({ error: 'Failed to get DeFi analytics' });
    }
  });

  app.get('/api/v1/defi/positions/:userAddress', (req, res) => {
    try {
      const { userAddress } = req.params;
      const positions = defiManager.getUserPositions(userAddress);

      res.json(positions);
    } catch (error) {
      logger.error('Error getting user positions:', error);
      res.status(500).json({ error: 'Failed to get user positions' });
    }
  });

  // Performance endpoints
  app.get('/api/v1/defi/performance', (req, res) => {
    try {
      const analytics = defiManager.getAnalytics();

      res.json({
        totalValueLocked: analytics.totalValueLocked,
        totalUsers: analytics.totalUsers,
        totalPools: analytics.totalPools,
        totalStaked: analytics.totalStaked,
        totalRewards: analytics.totalRewards,
        averageYield: analytics.averageYield,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error getting DeFi performance:', error);
      res.status(500).json({ error: 'Failed to get DeFi performance' });
    }
  });

  app.get('/api/v1/defi/health', (req, res) => {
    try {
      const analytics = defiManager.getAnalytics();

      res.json({
        status: 'healthy',
        totalValueLocked: analytics.totalValueLocked,
        totalUsers: analytics.totalUsers,
        totalPools: analytics.totalPools,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error getting DeFi health:', error);
      res.status(500).json({ error: 'Failed to get DeFi health' });
    }
  });
}

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
server.listen(PORT, () => {
  logger.info(`🚀 Enhanced DeFi Service running on port ${PORT}`);
  logger.info(`📊 Health check: http://localhost:${PORT}/health`);
  logger.info(`🔗 Staking: http://localhost:${PORT}/api/v1/defi/stake/:userAddress`);
  logger.info(`🏊 Pools: http://localhost:${PORT}/api/v1/defi/pools`);
  logger.info(`📈 Analytics: http://localhost:${PORT}/api/v1/defi/analytics`);
  logger.info(`💰 Positions: http://localhost:${PORT}/api/v1/defi/positions/:userAddress`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('DeFi service closed');
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('DeFi service closed');
  });
});

export default app; 