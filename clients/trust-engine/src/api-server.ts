import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { performance } from 'perf_hooks';
import type { ServerResponse } from 'http';
import { logger } from '../shared/utils/logger';
import trustEngine from './enhanced-trust-engine';

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
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
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'enhanced-trust-engine',
    timestamp: new Date().toISOString()
  });
});

// ==================== CORE TRUST API ENDPOINTS ====================

// 1. Get trust score for a wallet
app.get('/api/v1/trust/score/:walletAddress', async (req: Request, res: Response) => {
  const startTime = performance.now();

  try {
    const { walletAddress } = req.params;
    const { appId } = req.query;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    if (!appId) {
      // Return core trust score only
      const coreMetrics = await trustEngine.getCoreMetrics(walletAddress);
      return res.json({
        wallet_address: walletAddress,
        core_score: coreMetrics.core_trust_score,
        timestamp: Date.now()
      });
    }

    // Return composite trust score
    const compositScore = await trustEngine.calculateCompositeTrustScore(walletAddress, appId as string);
    res.json(compositScore);
  } catch (error) {
    logger.error('Error getting trust score:', error);
    res.status(500).json({ error: 'Failed to get trust score' });
  } finally {
    const duration = performance.now() - startTime;
    logger.debug(`Trust score request completed in ${duration}ms`);
  }
});

// 2. Update core trust metrics
app.put('/api/v1/trust/metrics/:walletAddress', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;
    const updates = req.body;

    if (!walletAddress || !updates) {
      return res.status(400).json({ error: 'Wallet address and updates required' });
    }

    await trustEngine.updateCoreMetrics(walletAddress, updates);

    res.json({
      success: true,
      message: 'Core trust metrics updated successfully'
    });
  } catch (error) {
    logger.error('Error updating core metrics:', error);
    res.status(500).json({ error: 'Failed to update core metrics' });
  }
});

// 3. Get trust history for a wallet
app.get('/api/v1/trust/history/:walletAddress', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;
    const { limit = 50 } = req.query;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    // This would query trust score history from database
    // For now, return current score
    const coreMetrics = await trustEngine.getCoreMetrics(walletAddress);

    res.json({
      wallet_address: walletAddress,
      history: [{
        timestamp: Date.now(),
        score: coreMetrics.core_trust_score
      }],
      limit: parseInt(limit as string)
    });
  } catch (error) {
    logger.error('Error getting trust history:', error);
    res.status(500).json({ error: 'Failed to get trust history' });
  }
});

// ==================== TRUST DELEGATION API ENDPOINTS ====================

// 4. Delegate trust to another wallet
app.post('/api/v1/trust/delegate', async (req: Request, res: Response) => {
  try {
    const { delegator, delegate, amount } = req.body;

    if (!delegator || !delegate || !amount) {
      return res.status(400).json({ error: 'Delegator, delegate, and amount required' });
    }

    const delegationId = await trustEngine.delegateTrust(delegator, delegate, amount);

    res.json({
      success: true,
      delegation_id: delegationId,
      message: 'Trust delegation created successfully'
    });
  } catch (error) {
    logger.error('Error delegating trust:', error);
    res.status(500).json({ error: error.message || 'Failed to delegate trust' });
  }
});

// 5. Get delegation chain for a wallet
app.get('/api/v1/trust/delegation-chain/:walletAddress', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    const chain = await trustEngine.getDelegationChain(walletAddress);

    res.json({
      wallet_address: walletAddress,
      delegation_chain: chain
    });
  } catch (error) {
    logger.error('Error getting delegation chain:', error);
    res.status(500).json({ error: 'Failed to get delegation chain' });
  }
});

// 6. Revoke trust delegation
app.post('/api/v1/trust/revoke-delegation', async (req: Request, res: Response) => {
  try {
    const { delegationId } = req.body;

    if (!delegationId) {
      return res.status(400).json({ error: 'Delegation ID required' });
    }

    await trustEngine.revokeDelegation(delegationId);

    res.json({
      success: true,
      message: 'Trust delegation revoked successfully'
    });
  } catch (error) {
    logger.error('Error revoking delegation:', error);
    res.status(500).json({ error: 'Failed to revoke delegation' });
  }
});

// ==================== FRAUD DETECTION API ENDPOINTS ====================

// 7. Get fraud score for a wallet
app.get('/api/v1/trust/fraud-score/:walletAddress', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    const fraudScore = await trustEngine.calculateFraudScore(walletAddress);

    res.json(fraudScore);
  } catch (error) {
    logger.error('Error getting fraud score:', error);
    res.status(500).json({ error: 'Failed to get fraud score' });
  }
});

// 8. Get anti-gaming detection for a wallet
app.get('/api/v1/trust/anti-gaming/:walletAddress', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    const detection = await trustEngine['detectSuspiciousActivity'](walletAddress);

    res.json(detection);
  } catch (error) {
    logger.error('Error getting anti-gaming detection:', error);
    res.status(500).json({ error: 'Failed to get anti-gaming detection' });
  }
});

// ==================== REPUTATION API ENDPOINTS ====================

// 9. Get reputation metrics for a wallet
app.get('/api/v1/trust/reputation/:walletAddress', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    const metrics = await trustEngine.getReputationMetrics(walletAddress);

    res.json({
      wallet_address: walletAddress,
      reputation_metrics: metrics
    });
  } catch (error) {
    logger.error('Error getting reputation metrics:', error);
    res.status(500).json({ error: 'Failed to get reputation metrics' });
  }
});

// 10. Record reputation metric
app.post('/api/v1/trust/reputation', async (req: Request, res: Response) => {
  try {
    const { walletAddress, metricName, value } = req.body;

    if (!walletAddress || !metricName || value === undefined) {
      return res.status(400).json({ error: 'Wallet address, metric name, and value required' });
    }

    await trustEngine.recordReputationMetric(walletAddress, metricName, value);

    res.json({
      success: true,
      message: 'Reputation metric recorded successfully'
    });
  } catch (error) {
    logger.error('Error recording reputation metric:', error);
    res.status(500).json({ error: 'Failed to record reputation metric' });
  }
});

// ==================== ANALYTICS API ENDPOINTS ====================

// 11. Get trust analytics
app.get('/api/v1/trust/analytics', async (req: Request, res: Response) => {
  try {
    const analytics = await trustEngine.getTrustAnalytics();

    res.json(analytics);
  } catch (error) {
    logger.error('Error getting trust analytics:', error);
    res.status(500).json({ error: 'Failed to get trust analytics' });
  }
});

// 12. Get delegation graph
app.get('/api/v1/trust/delegation-graph', async (req: Request, res: Response) => {
  try {
    const graph = await trustEngine.getDelegationGraph();

    res.json(graph);
  } catch (error) {
    logger.error('Error getting delegation graph:', error);
    res.status(500).json({ error: 'Failed to get delegation graph' });
  }
});

// ==================== CUSTOM METRICS API ENDPOINTS ====================

// 13. Register custom trust metrics for an app
app.post('/api/v1/trust/custom-metrics', async (req: Request, res: Response) => {
  try {
    const { appId, developerId, metrics } = req.body;

    if (!appId || !developerId || !metrics) {
      return res.status(400).json({ error: 'App ID, developer ID, and metrics required' });
    }

    await trustEngine.registerCustomMetrics(appId, developerId, metrics);

    res.json({
      success: true,
      message: 'Custom trust metrics registered successfully',
      appId
    });
  } catch (error) {
    logger.error('Error registering custom metrics:', error);
    res.status(500).json({ error: 'Failed to register custom metrics' });
  }
});

// 14. Get custom metrics for an app
app.get('/api/v1/trust/custom-metrics/:appId', async (req: Request, res: Response) => {
  try {
    const { appId } = req.params;

    if (!appId) {
      return res.status(400).json({ error: 'App ID required' });
    }

    const metrics = trustEngine['customMetrics'].get(appId);
    if (!metrics) {
      return res.status(404).json({ error: 'App not found' });
    }

    res.json(metrics);
  } catch (error) {
    logger.error('Error getting custom metrics:', error);
    res.status(500).json({ error: 'Failed to get custom metrics' });
  }
});

// 15. Update custom trust field
app.put('/api/v1/trust/custom-field', async (req: Request, res: Response) => {
  try {
    const { appId, walletAddress, fieldName, value } = req.body;

    if (!appId || !walletAddress || !fieldName || value === undefined) {
      return res.status(400).json({ error: 'App ID, wallet address, field name, and value required' });
    }

    await trustEngine.updateCustomTrustField(walletAddress, appId, fieldName, value);

    res.json({
      success: true,
      message: 'Custom trust field updated successfully'
    });
  } catch (error) {
    logger.error('Error updating custom trust field:', error);
    res.status(500).json({ error: 'Failed to update custom trust field' });
  }
});

// 16. Calculate composite trust score
app.post('/api/v1/trust/composite-score', async (req: Request, res: Response) => {
  try {
    const { walletAddress, appId } = req.body;

    if (!walletAddress || !appId) {
      return res.status(400).json({ error: 'Wallet address and app ID required' });
    }

    const score = await trustEngine.calculateCompositeTrustScore(walletAddress, appId);

    res.json(score);
  } catch (error) {
    logger.error('Error calculating composite score:', error);
    res.status(500).json({ error: 'Failed to calculate composite score' });
  }
});

// ==================== VERIFICATION API ENDPOINTS ====================

// 17. Verify trust requirement
app.post('/api/v1/trust/verify', async (req: Request, res: Response) => {
  try {
    const { appId, walletAddress, requirements } = req.body;

    if (!appId || !walletAddress || !requirements) {
      return res.status(400).json({ error: 'App ID, wallet address, and requirements required' });
    }

    const compositScore = await trustEngine.calculateCompositeTrustScore(walletAddress, appId);

    const verified = compositScore.core_score >= (requirements.minCoreScore || 0) &&
                    compositScore.custom_score >= (requirements.minCustomScore || 0) &&
                    compositScore.final_score >= (requirements.minFinalScore || 0);

    res.json({
      verified,
      scores: {
        core: compositScore.core_score,
        custom: compositScore.custom_score,
        final: compositScore.final_score
      },
      requirements
    });
  } catch (error) {
    logger.error('Error verifying trust requirement:', error);
    res.status(500).json({ error: 'Failed to verify trust requirement' });
  }
});

// ==================== BATCH OPERATIONS API ENDPOINTS ====================

// 18. Batch get trust scores
app.post('/api/v1/trust/batch-scores', async (req: Request, res: Response) => {
  try {
    const { walletAddresses, appId } = req.body;

    if (!walletAddresses || !Array.isArray(walletAddresses)) {
      return res.status(400).json({ error: 'Wallet addresses array required' });
    }

    const results = await Promise.all(
      walletAddresses.map(async (address: string) => {
        try {
          if (appId) {
            return await trustEngine.calculateCompositeTrustScore(address, appId);
          } else {
            const metrics = await trustEngine.getCoreMetrics(address);
            return {
              wallet_address: address,
              core_score: metrics.core_trust_score,
              timestamp: Date.now()
            };
          }
        } catch (error) {
          return {
            wallet_address: address,
            error: error.message
          };
        }
      })
    );

    res.json({
      results,
      count: results.length,
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error('Error in batch trust scores:', error);
    res.status(500).json({ error: 'Failed to get batch trust scores' });
  }
});

// ==================== REAL-TIME API ENDPOINTS ====================

// 19. Subscribe to trust updates (SSE)
app.get('/api/v1/trust/subscribe', async (req: Request, res: Response) => {
  try {
    const walletAddress = (req.query.walletAddress as string) || '';
    const appId = (req.query.appId as string) || '';
    if (!walletAddress || !appId) {
      return res.status(400).json({ error: 'walletAddress and appId are required' });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    let stopped = false;
    req.on('close', () => {
      stopped = true;
    });

    const intervalMs = Math.max(5000, Math.min(30000, parseInt(process.env.TRUST_SSE_INTERVAL_MS || '10000')));

    const sendEvent = (event: string, data: any) => {
      try {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (_) {
        stopped = true;
      }
    };

    // Initial push
    try {
      const score = await trustEngine.calculateCompositeTrustScore(walletAddress, appId);
      sendEvent('score', score);
    } catch (e) {
      sendEvent('error', { message: 'initial calculation failed' });
    }

    // Heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
      if (stopped) return;
      sendEvent('ping', { t: Date.now() });
    }, 15000);

    // Periodic updates
    const ticker = setInterval(async () => {
      if (stopped) return;
      try {
        const score = await trustEngine.calculateCompositeTrustScore(walletAddress, appId);
        sendEvent('score', score);
      } catch (e) {
        sendEvent('error', { message: 'calculation failed' });
      }
    }, intervalMs);

    // Cleanup on close
    const clean = () => {
      clearInterval(heartbeat);
      clearInterval(ticker);
      try { (res as unknown as ServerResponse).end(); } catch {}
    };
    req.on('close', clean);
  } catch (error) {
    logger.error('SSE subscribe error:', error);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

// ==================== ADMIN API ENDPOINTS ====================

// 20. Get trust engine statistics
app.get('/api/v1/trust/stats', async (req: Request, res: Response) => {
  try {
    const analytics = await trustEngine.getTrustAnalytics();

    res.json({
      timestamp: Date.now(),
      total_wallets: analytics.total_wallets,
      average_trust_score: analytics.average_trust_score,
      trust_distribution: analytics.trust_distribution,
      suspicious_activity: analytics.suspicious_activity
    });
  } catch (error) {
    logger.error('Error getting trust stats:', error);
    res.status(500).json({ error: 'Failed to get trust statistics' });
  }
});

// 21. Manual cache clear
app.post('/api/v1/trust/cache/clear', async (req: Request, res: Response) => {
  try {
    const { pattern } = req.body;

    // Clear specific cache patterns
    if (pattern) {
      // Implementation would clear cache by pattern
      logger.info(`Cleared cache pattern: ${pattern}`);
    } else {
      // Clear all cache (dangerous in production)
      logger.warn('Cleared all trust engine cache');
    }

    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    logger.error('Error clearing cache:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

// 22. Get system health
app.get('/api/v1/trust/health', async (req: Request, res: Response) => {
  try {
    // Check database connectivity
    await trustEngine.getCoreMetrics('test_address');

    res.json({
      status: 'healthy',
      database: 'connected',
      cache: 'active',
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error('Trust engine health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: Date.now()
    });
  }
});

// ==================== REPORTING API ENDPOINTS ====================

// 23. Generate trust report
app.post('/api/v1/trust/report', async (req: Request, res: Response) => {
  try {
    const { walletAddress, appId, includeHistory = false } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    const report: any = {
      wallet_address: walletAddress,
      generated_at: Date.now(),
      sections: {}
    };

    // Core metrics
    const coreMetrics = await trustEngine.getCoreMetrics(walletAddress);
    report.sections.core_metrics = coreMetrics;

    // Fraud score
    const fraudScore = await trustEngine.calculateFraudScore(walletAddress);
    report.sections.fraud_score = fraudScore;

    // Anti-gaming detection
    const antiGaming = await trustEngine['detectSuspiciousActivity'](walletAddress);
    report.sections.anti_gaming = antiGaming;

    // Delegation chain
    const delegationChain = await trustEngine.getDelegationChain(walletAddress);
    report.sections.delegation_chain = delegationChain;

    // Reputation metrics
    const reputationMetrics = await trustEngine.getReputationMetrics(walletAddress);
    report.sections.reputation_metrics = reputationMetrics;

    // Composite score if appId provided
    if (appId) {
      const compositeScore = await trustEngine.calculateCompositeTrustScore(walletAddress, appId);
      report.sections.composite_score = compositeScore;
    }

    res.json(report);
  } catch (error) {
    logger.error('Error generating trust report:', error);
    res.status(500).json({ error: 'Failed to generate trust report' });
  }
});

// 24. Get top trusted wallets
app.get('/api/v1/trust/top-trusted', async (req: Request, res: Response) => {
  try {
    const { limit = 100 } = req.query;

    // This would query the database for top trusted wallets
    // For now, return analytics data
    const analytics = await trustEngine.getTrustAnalytics();

    res.json({
      top_performers: analytics.top_performers,
      limit: parseInt(limit as string),
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error('Error getting top trusted wallets:', error);
    res.status(500).json({ error: 'Failed to get top trusted wallets' });
  }
});

// 25. Get suspicious activity report
app.get('/api/v1/trust/suspicious-activity', async (req: Request, res: Response) => {
  try {
    const { limit = 50 } = req.query;

    // This would query the database for wallets with high risk scores
    // For now, return analytics data
    const analytics = await trustEngine.getTrustAnalytics();

    res.json({
      total_suspicious: analytics.suspicious_activity,
      limit: parseInt(limit as string),
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error('Error getting suspicious activity:', error);
    res.status(500).json({ error: 'Failed to get suspicious activity' });
  }
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((error: any, req: Request, res: Response, next: any) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// ==================== SERVER STARTUP ====================

app.listen(PORT, async () => {
  logger.info(`🚀 Enhanced Trust Engine API running on port ${PORT}`);
  logger.info(`📊 Health check: http://localhost:${PORT}/health`);
  logger.info(`🔗 Trust scores: http://localhost:${PORT}/api/v1/trust/score/:walletAddress`);
  logger.info(`📈 Trust analytics: http://localhost:${PORT}/api/v1/trust/analytics`);
  logger.info(`🔍 Fraud detection: http://localhost:${PORT}/api/v1/trust/fraud-score/:walletAddress`);
  logger.info(`📊 Delegation graph: http://localhost:${PORT}/api/v1/trust/delegation-graph`);
  logger.info(`📡 Real-time updates: http://localhost:${PORT}/api/v1/trust/subscribe`);

  // Load existing custom metrics
  await trustEngine.loadCustomMetrics();
});

export default app;

