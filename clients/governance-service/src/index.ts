import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { proposalRoutes } from './routes/proposal';
import { voteRoutes } from './routes/vote';
import { delegateRoutes } from './routes/delegate';
import { errorHandler } from '../shared/middleware/errorHandler';
import { logger } from '../shared/utils/logger';
import { GovernanceManager } from './services/GovernanceManager';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;

// Initialize governance manager
const governanceManager = new GovernanceManager();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'governance-service',
    timestamp: new Date().toISOString(),
    activeProposals: governanceManager.getActiveProposals().length,
    totalDelegates: governanceManager.getTotalDelegates()
  });
});

// API routes
app.use('/api/v1/proposal', proposalRoutes);
app.use('/api/v1/vote', voteRoutes);
app.use('/api/v1/delegate', delegateRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Governance service running on port ${PORT}`);
  
  // Initialize governance system
  governanceManager.initialize();
});

export default app; 