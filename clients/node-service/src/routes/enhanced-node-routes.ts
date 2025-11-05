import express, { Request, Response } from 'express';
import { EnhancedNodeManager, NodeConfig } from '../services/enhanced-node-manager';
import { logger } from '../utils/logger';

const router = express.Router();

// Global node manager instance
let nodeManager: EnhancedNodeManager | null = null;

// Middleware to ensure node is initialized
const ensureNodeInitialized = (req: Request, res: Response, next: any) => {
  if (!nodeManager) {
    return res.status(503).json({ error: 'Node not initialized' });
  }
  next();
};

// ==================== NODE MANAGEMENT ENDPOINTS ====================

// 1. Initialize node
router.post('/api/v1/node/init', async (req: Request, res: Response) => {
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

// 2. Get node status
router.get('/api/v1/node/status', ensureNodeInitialized, (req: Request, res: Response) => {
  try {
    const status = nodeManager!.getStatus();
    res.json(status);
  } catch (error) {
    logger.error('Error getting node status:', error);
    res.status(500).json({ error: 'Failed to get node status' });
  }
});

// 3. Get node configuration
router.get('/api/v1/node/config', ensureNodeInitialized, (req: Request, res: Response) => {
  try {
    const config = nodeManager!.getConfig();
    res.json(config);
  } catch (error) {
    logger.error('Error getting node config:', error);
    res.status(500).json({ error: 'Failed to get node config' });
  }
});

// 4. Update node configuration
router.put('/api/v1/node/config', ensureNodeInitialized, (req: Request, res: Response) => {
  try {
    const updates = req.body;
    nodeManager!.updateConfig(updates);

    res.json({
      success: true,
      message: 'Node configuration updated',
      updates,
    });
  } catch (error) {
    logger.error('Error updating node config:', error);
    res.status(500).json({ error: 'Failed to update node config' });
  }
});

// ==================== BLOCKCHAIN DATA ENDPOINTS ====================

// 5. Get block by number
router.get('/api/v1/block/:blockNumber', ensureNodeInitialized, async (req: Request, res: Response) => {
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

// 6. Get latest block
router.get('/api/v1/block/latest', ensureNodeInitialized, async (req: Request, res: Response) => {
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

// 7. Get block by hash
router.get('/api/v1/block/hash/:hash', ensureNodeInitialized, async (req: Request, res: Response) => {
  try {
    const hash = req.params.hash;
    const block = await nodeManager!.getBlockByHash(hash);
    if (!block) {
      return res.status(404).json({ error: 'Block not found' });
    }

    res.json(block);
  } catch (error) {
    logger.error('Error getting block by hash:', error);
    res.status(500).json({ error: 'Failed to get block' });
  }
});

// 8. Get blocks in range
router.get('/api/v1/blocks/:start/:end', ensureNodeInitialized, async (req: Request, res: Response) => {
  try {
    const start = parseInt(req.params.start);
    const end = parseInt(req.params.end);

    if (isNaN(start) || isNaN(end) || start > end) {
      return res.status(400).json({ error: 'Invalid block range' });
    }

    const blocks = await nodeManager!.getBlocksInRange(start, end);
    res.json({ blocks, count: blocks.length });
  } catch (error) {
    logger.error('Error getting blocks in range:', error);
    res.status(500).json({ error: 'Failed to get blocks' });
  }
});

// 9. Get transaction by hash
router.get('/api/v1/transaction/:txHash', ensureNodeInitialized, async (req: Request, res: Response) => {
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

// 10. Get transaction status
router.get('/api/v1/transaction/:txHash/status', ensureNodeInitialized, async (req: Request, res: Response) => {
  try {
    const txHash = req.params.txHash;
    const status = await nodeManager!.getTransactionStatus(txHash);
    res.json(status);
  } catch (error) {
    logger.error('Error getting transaction status:', error);
    res.status(500).json({ error: 'Failed to get transaction status' });
  }
});

// 11. Submit transaction
router.post('/api/v1/transaction/submit', ensureNodeInitialized, async (req: Request, res: Response) => {
  try {
    const transaction = req.body;
    const txHash = await nodeManager!.submitTransaction(transaction);

    res.json({
      success: true,
      txHash,
      message: 'Transaction submitted successfully',
    });
  } catch (error) {
    logger.error('Error submitting transaction:', error);
    res.status(500).json({ error: 'Failed to submit transaction' });
  }
});

// ==================== NETWORK ENDPOINTS ====================

// 12. Get network statistics
router.get('/api/v1/network/stats', ensureNodeInitialized, (req: Request, res: Response) => {
  try {
    const stats = nodeManager!.getNetworkStats();
    res.json(stats);
  } catch (error) {
    logger.error('Error getting network stats:', error);
    res.status(500).json({ error: 'Failed to get network stats' });
  }
});

// 13. Get sync status
router.get('/api/v1/network/sync', ensureNodeInitialized, (req: Request, res: Response) => {
  try {
    const syncStatus = nodeManager!.getSyncStatus();
    res.json(syncStatus);
  } catch (error) {
    logger.error('Error getting sync status:', error);
    res.status(500).json({ error: 'Failed to get sync status' });
  }
});

// 14. Get all peers
router.get('/api/v1/network/peers', ensureNodeInitialized, (req: Request, res: Response) => {
  try {
    const peers = nodeManager!.getPeers();
    res.json({ peers, count: peers.length });
  } catch (error) {
    logger.error('Error getting peers:', error);
    res.status(500).json({ error: 'Failed to get peers' });
  }
});

// 15. Add peer
router.post('/api/v1/network/peers', ensureNodeInitialized, async (req: Request, res: Response) => {
  try {
    const { address, port, version, capabilities } = req.body;

    if (!address || !port) {
      return res.status(400).json({ error: 'Address and port required' });
    }

    await nodeManager!.addPeer(address, port, version || '1.0.0', capabilities || ['eth/66']);

    res.json({
      success: true,
      message: 'Peer added successfully',
    });
  } catch (error) {
    logger.error('Error adding peer:', error);
    res.status(500).json({ error: 'Failed to add peer' });
  }
});

// 16. Remove peer
router.delete('/api/v1/network/peers/:peerId', ensureNodeInitialized, async (req: Request, res: Response) => {
  try {
    const peerId = req.params.peerId;
    await nodeManager!.removePeer(peerId);

    res.json({
      success: true,
      message: 'Peer removed successfully',
    });
  } catch (error) {
    logger.error('Error removing peer:', error);
    res.status(500).json({ error: 'Failed to remove peer' });
  }
});

// ==================== BLOCKCHAIN STATE ENDPOINTS ====================

// 17. Get node statistics
router.get('/api/v1/node/stats', ensureNodeInitialized, (req: Request, res: Response) => {
  try {
    const stats = nodeManager!.getStats();
    res.json(stats);
  } catch (error) {
    logger.error('Error getting node stats:', error);
    res.status(500).json({ error: 'Failed to get node stats' });
  }
});

// 18. Get pending transactions
router.get('/api/v1/transactions/pending', ensureNodeInitialized, (req: Request, res: Response) => {
  try {
    const pendingTxs = nodeManager!.getPendingTransactions();
    res.json({ pendingTransactions: pendingTxs, count: pendingTxs.length });
  } catch (error) {
    logger.error('Error getting pending transactions:', error);
    res.status(500).json({ error: 'Failed to get pending transactions' });
  }
});

// ==================== ENVIRONMENTAL DATA ENDPOINTS ====================

// 19. Get environmental data for block
router.get('/api/v1/environment/block/:blockNumber', ensureNodeInitialized, async (req: Request, res: Response) => {
  try {
    const blockNumber = parseInt(req.params.blockNumber);
    const block = await nodeManager!.getBlock(blockNumber);

    if (!block) {
      return res.status(404).json({ error: 'Block not found' });
    }

    res.json({
      blockNumber,
      environmentalHash: block.environmentalHash,
      validator: block.validator,
      trustScore: block.trustScore,
    });
  } catch (error) {
    logger.error('Error getting environmental data:', error);
    res.status(500).json({ error: 'Failed to get environmental data' });
  }
});

// 20. Get environmental data range
router.get('/api/v1/environment/range/:start/:end', ensureNodeInitialized, async (req: Request, res: Response) => {
  try {
    const start = parseInt(req.params.start);
    const end = parseInt(req.params.end);

    const blocks = await nodeManager!.getBlocksInRange(start, end);
    const environmentalData = blocks.map(block => ({
      blockNumber: block.number,
      environmentalHash: block.environmentalHash,
      validator: block.validator,
      trustScore: block.trustScore,
    }));

    res.json({
      start,
      end,
      environmentalData,
      count: environmentalData.length,
    });
  } catch (error) {
    logger.error('Error getting environmental data range:', error);
    res.status(500).json({ error: 'Failed to get environmental data' });
  }
});

// ==================== TRUST INTEGRATION ENDPOINTS ====================

// 21. Get trust score for validator
router.get('/api/v1/trust/validator/:address', ensureNodeInitialized, async (req: Request, res: Response) => {
  try {
    const address = req.params.address;
    const status = nodeManager!.getStatus();

    // For now, return the node's trust score
    res.json({
      address,
      trustScore: status.trustScore,
      lastUpdated: status.lastActivity,
    });
  } catch (error) {
    logger.error('Error getting validator trust score:', error);
    res.status(500).json({ error: 'Failed to get validator trust score' });
  }
});

// 22. Get network trust summary
router.get('/api/v1/trust/network', ensureNodeInitialized, (req: Request, res: Response) => {
  try {
    const status = nodeManager!.getStatus();
    const peers = nodeManager!.getPeers();

    const validatorPeers = peers.filter(p => p.isValidator);
    const averageTrustScore = validatorPeers.reduce((sum, peer) => sum + peer.reputation, 0) / Math.max(validatorPeers.length, 1);

    res.json({
      networkTrustScore: averageTrustScore,
      validatorCount: validatorPeers.length,
      totalPeers: peers.length,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error getting network trust summary:', error);
    res.status(500).json({ error: 'Failed to get network trust summary' });
  }
});

// ==================== PERFORMANCE MONITORING ENDPOINTS ====================

// 23. Get performance metrics
router.get('/api/v1/node/performance', ensureNodeInitialized, (req: Request, res: Response) => {
  try {
    const status = nodeManager!.getStatus();
    const stats = nodeManager!.getStats();

    res.json({
      uptime: status.uptime,
      memoryUsage: status.memoryUsage,
      cpuUsage: status.cpuUsage,
      totalBlocks: stats.totalBlocks,
      totalTransactions: stats.totalTransactions,
      averageBlockTime: stats.averageBlockTime,
      networkStats: stats.networkStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error getting performance metrics:', error);
    res.status(500).json({ error: 'Failed to get performance metrics' });
  }
});

// 24. Get node health
router.get('/api/v1/node/health', ensureNodeInitialized, (req: Request, res: Response) => {
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

// ==================== ADMIN ENDPOINTS ====================

// 25. Start synchronization
router.post('/api/v1/node/sync', ensureNodeInitialized, async (req: Request, res: Response) => {
  try {
    await nodeManager!.startSynchronization();

    res.json({
      success: true,
      message: 'Synchronization started',
    });
  } catch (error) {
    logger.error('Error starting synchronization:', error);
    res.status(500).json({ error: 'Failed to start synchronization' });
  }
});

// 26. Shutdown node
router.post('/api/v1/node/shutdown', ensureNodeInitialized, async (req: Request, res: Response) => {
  try {
    await nodeManager!.shutdown();

    res.json({
      success: true,
      message: 'Node shutdown initiated',
    });
  } catch (error) {
    logger.error('Error shutting down node:', error);
    res.status(500).json({ error: 'Failed to shutdown node' });
  }
});

// 27. Get node logs (placeholder)
router.get('/api/v1/node/logs', ensureNodeInitialized, (req: Request, res: Response) => {
  try {
    // TODO: Implement log streaming
    res.json({
      logs: [],
      message: 'Log streaming not implemented yet',
    });
  } catch (error) {
    logger.error('Error getting node logs:', error);
    res.status(500).json({ error: 'Failed to get node logs' });
  }
});

// 28. Broadcast transaction
router.post('/api/v1/node/broadcast/transaction', ensureNodeInitialized, async (req: Request, res: Response) => {
  try {
    const { txHash } = req.body;

    if (!txHash) {
      return res.status(400).json({ error: 'Transaction hash required' });
    }

    await nodeManager!.broadcastTransaction(txHash);

    res.json({
      success: true,
      message: 'Transaction broadcasted',
    });
  } catch (error) {
    logger.error('Error broadcasting transaction:', error);
    res.status(500).json({ error: 'Failed to broadcast transaction' });
  }
});

// 29. Get genesis information
router.get('/api/v1/genesis', ensureNodeInitialized, (req: Request, res: Response) => {
  try {
    const networkStats = nodeManager!.getNetworkStats();

    res.json({
      genesisHash: networkStats.genesisHash,
      networkId: networkStats.networkId,
      chainId: networkStats.chainId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error getting genesis information:', error);
    res.status(500).json({ error: 'Failed to get genesis information' });
  }
});

// 30. Get consensus information
router.get('/api/v1/consensus', ensureNodeInitialized, (req: Request, res: Response) => {
  try {
    const status = nodeManager!.getStatus();
    const networkStats = nodeManager!.getNetworkStats();

    res.json({
      currentBlock: status.latestBlock,
      difficulty: networkStats.difficulty,
      gasLimit: networkStats.gasLimit,
      gasPrice: networkStats.gasPrice,
      validatorCount: nodeManager!.getPeers().filter(p => p.isValidator).length,
      activeValidators: nodeManager!.getPeers().filter(p => p.isValidator && p.reputation > 0.5).length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error getting consensus information:', error);
    res.status(500).json({ error: 'Failed to get consensus information' });
  }
});

// ==================== WEBSOCKET NOTIFICATION ENDPOINTS ====================

// Note: WebSocket endpoints would be implemented in a separate WebSocket server
// These are placeholders for real-time subscriptions

// 31. Subscribe to new blocks (placeholder)
router.get('/api/v1/subscribe/blocks', ensureNodeInitialized, (req: Request, res: Response) => {
  res.json({
    message: 'WebSocket subscription endpoint',
    endpoint: 'ws://localhost:8546',
    subscriptions: ['newBlocks', 'newTransactions', 'peerUpdates'],
  });
});

// 32. Subscribe to new transactions (placeholder)
router.get('/api/v1/subscribe/transactions', ensureNodeInitialized, (req: Request, res: Response) => {
  res.json({
    message: 'WebSocket subscription endpoint',
    endpoint: 'ws://localhost:8546',
    subscriptions: ['newBlocks', 'newTransactions', 'peerUpdates'],
  });
});

// ==================== ERROR HANDLING ====================

// 404 handler
router.use('*', (req: Request, res: Response) => {
  res.status(404).json({ error: 'Node API endpoint not found' });
});

export default router;

