import { Router } from 'express';
import { collectEnvironmentalData, computeEnvironmentalHash, collectAndHashEnvironmentalData } from '@zippycoin/shared';
import { EnvironmentalData } from '@zippycoin/shared';
import os from 'os';
import { networkInterfaces } from 'os';

export const environmentRoutes = Router();

/**
 * GET /api/v1/environment/hash
 * Returns a fresh environmental data snapshot and its hash
 */
environmentRoutes.get('/hash', (req, res) => {
  try {
    const { data, result } = collectAndHashEnvironmentalData();
    res.json({
      data,
      hash: result.hashHex,
      canonical: result.canonicalJson,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to compute environmental hash' });
  }
});

/**
 * GET /api/v1/environment/data
 * Returns just the environmental data snapshot without hash
 */
environmentRoutes.get('/data', (req, res) => {
  try {
    const data = collectEnvironmentalData();
    res.json({
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to collect environmental data' });
  }
});

/**
 * GET /api/v1/environment/extended
 * Returns extended environmental data with additional system metrics
 */
environmentRoutes.get('/extended', (req, res) => {
  try {
    // Collect base environmental data
    const baseData = collectEnvironmentalData();
    
    // Add extended metrics
    const extendedData = {
      ...baseData,
      system: {
        // CPU load averages (1, 5, 15 minutes)
        loadAvg: os.loadavg(),
        // System uptime in seconds
        uptime: os.uptime(),
        // Memory usage
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          usedPercent: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2)
        },
        // Network interfaces (excluding internal/loopback)
        network: Object.entries(networkInterfaces())
          .filter(([name]) => !name.includes('lo') && !name.includes('Loopback'))
          .map(([name, interfaces]) => ({
            name,
            interfaces: interfaces?.map(iface => ({
              address: iface.address,
              family: iface.family,
              internal: iface.internal
            })) || []
          }))
      }
    };
    
    // Compute hash for the extended data
    const extendedHash = computeEnvironmentalHash(baseData);
    
    res.json({
      data: extendedData,
      hash: extendedHash.hashHex,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to collect extended environmental data' });
  }
});

/**
 * POST /api/v1/environment/verify
 * Verifies if a provided hash matches the current environment
 */
environmentRoutes.post('/verify', (req, res) => {
  try {
    const { hash, data } = req.body;
    
    if (!hash && !data) {
      return res.status(400).json({ error: 'Either hash or data must be provided' });
    }
    
    // If hash is provided, compare with current environment hash
    if (hash) {
      const { result } = collectAndHashEnvironmentalData();
      const matches = result.hashHex === hash;
      
      return res.json({
        verified: matches,
        currentHash: result.hashHex,
        providedHash: hash,
        timestamp: new Date().toISOString()
      });
    }
    
    // If data is provided, compute hash from it and compare with its hash
    if (data) {
      // Ensure data has the correct structure
      const environmentalData = data as EnvironmentalData;
      const result = computeEnvironmentalHash(environmentalData);
      const currentResult = computeEnvironmentalHash(collectEnvironmentalData());
      
      return res.json({
        verified: result.hashHex === currentResult.hashHex,
        dataHash: result.hashHex,
        currentHash: currentResult.hashHex,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to verify environmental hash' });
  }
});

