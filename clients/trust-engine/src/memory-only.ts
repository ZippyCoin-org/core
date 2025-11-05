import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { MemoryCache } from './memory-cache';
import { z } from 'zod';
import { performance } from 'perf_hooks';

// Trust API Types
interface CoreTrustMetrics {
  transaction_success_rate: number;
  validator_uptime: number;
  network_participation: number;
  stake_consistency: number;
  delegation_quality: number;
  fraud_prevention_score: number;
  security_compliance: number;
  kyc_verification_level: number;
  time_on_network: number;
  environmental_contributions: number;
  governance_participation: number;
  community_voting_score: number;
  core_trust_score: number;
  last_updated: number;
}

interface TrustField {
  field_name: string;
  field_type: 'Numeric' | 'Boolean' | 'Categorical' | 'TimeSeries' | 'CompoundMetric';
  weight: number;
  data_source: DataSource;
  validation_method: ValidationMethod;
  decay_rate?: number;
  min_value: number;
  max_value: number;
  default_value: number;
}

interface CustomTrustMetrics {
  app_id: string;
  developer_id: string;
  custom_fields: Record<string, TrustField>;
  aggregation_rules: AggregationRules;
  validation_rules: ValidationRules;
}

interface CompositeTrustScore {
  wallet_address: string;
  app_id: string;
  core_score: number;
  custom_score: number;
  final_score: number;
  components: Record<string, number>;
  timestamp: number;
}

type DataSource = 
  | { type: 'OnChain'; contract_address: string }
  | { type: 'OffChain'; api_endpoint: string }
  | { type: 'UserInput' }
  | { type: 'CoreTrust' }
  | { type: 'CrossReference'; ref_field: string };

type ValidationMethod = 'Range' | 'Cryptographic' | 'Peer' | 'Historical' | 'Performance' | 'AI' | 'Custom';

interface AggregationRules {
  method: 'WeightedAverage' | 'WeightedSum' | 'Minimum' | 'Maximum' | 'Custom';
  core_trust_weight: number;
  custom_weight: number;
}

interface ValidationRules {
  required_fields: string[];
  min_core_score: number;
  max_decay_rate: number;
}

class MemoryOnlyTrustEngine {
  private cache: MemoryCache;
  private customMetrics: Map<string, CustomTrustMetrics> = new Map();
  private coreMetrics: Map<string, CoreTrustMetrics> = new Map();
  private customScores: Map<string, Record<string, number>> = new Map();

  constructor() {
    this.cache = new MemoryCache();
    this.initializeTestData();
  }

  private initializeTestData() {
    // Initialize some test data
    const testWallet = '0x1234567890123456789012345678901234567890';
    this.coreMetrics.set(testWallet, {
      transaction_success_rate: 0.95,
      validator_uptime: 0.99,
      network_participation: 0.85,
      stake_consistency: 0.90,
      delegation_quality: 0.88,
      fraud_prevention_score: 1.0,
      security_compliance: 0.92,
      kyc_verification_level: 3,
      time_on_network: 31536000, // 1 year
      environmental_contributions: 0.75,
      governance_participation: 0.80,
      community_voting_score: 0.85,
      core_trust_score: 0.0,
      last_updated: Date.now()
    });
  }

  // Core trust calculation using immutable formula
  private calculateCoreTrust(metrics: CoreTrustMetrics): number {
    const baseScore = (
      metrics.transaction_success_rate * 0.15 +
      metrics.validator_uptime * 0.15 +
      metrics.network_participation * 0.12 +
      metrics.stake_consistency * 0.10 +
      metrics.delegation_quality * 0.08 +
      metrics.fraud_prevention_score * 0.15 +
      metrics.security_compliance * 0.10 +
      metrics.governance_participation * 0.08 +
      metrics.community_voting_score * 0.07
    );

    // Time and environmental bonuses
    const timeBonus = Math.min(metrics.time_on_network / 31536000, 0.1); // Max 10% for 1 year
    const envBonus = metrics.environmental_contributions * 0.05;
    const kycBonus = (metrics.kyc_verification_level / 5) * 0.1;

    return Math.min(baseScore + timeBonus + envBonus + kycBonus, 1.0);
  }

  // Get or create core trust metrics for a wallet
  async getCoreMetrics(walletAddress: string): Promise<CoreTrustMetrics> {
    try {
      const cacheKey = `core_trust:${walletAddress}`;
      const cached = await this.cache.get(cacheKey);
      
      if (cached) {
        return cached;
      }

      let metrics = this.coreMetrics.get(walletAddress);
      if (!metrics) {
        // Create default metrics for new wallet
        metrics = {
          transaction_success_rate: 0.5,
          validator_uptime: 0.5,
          network_participation: 0.5,
          stake_consistency: 0.5,
          delegation_quality: 0.5,
          fraud_prevention_score: 1.0,
          security_compliance: 0.5,
          kyc_verification_level: 0,
          time_on_network: 0,
          environmental_contributions: 0.0,
          governance_participation: 0.0,
          community_voting_score: 0.0,
          core_trust_score: 0.0,
          last_updated: Date.now()
        };
        this.coreMetrics.set(walletAddress, metrics);
      }

      // Calculate and update core trust score
      metrics.core_trust_score = this.calculateCoreTrust(metrics);

      // Cache for 5 minutes
      await this.cache.set(cacheKey, metrics, 300);

      return metrics;
    } catch (error) {
      console.error('Error getting core metrics:', error);
      throw error;
    }
  }

  // Register custom trust metrics for an app
  async registerCustomMetrics(appId: string, developerId: string, metrics: CustomTrustMetrics): Promise<void> {
    try {
      this.customMetrics.set(appId, metrics);
      console.log(`✅ Registered custom trust metrics for app: ${appId}`);
    } catch (error) {
      console.error('Error registering custom metrics:', error);
      throw error;
    }
  }

  // Calculate composite trust score
  async calculateCompositeTrustScore(walletAddress: string, appId: string): Promise<CompositeTrustScore> {
    try {
      const startTime = performance.now();

      // Get core trust metrics
      const coreMetrics = await this.getCoreMetrics(walletAddress);
      const coreScore = coreMetrics.core_trust_score;

      // Get custom trust metrics
      const customScore = 0.5; // Default for demo

      // Get aggregation rules
      const metrics = this.customMetrics.get(appId);
      const aggregationRules = metrics?.aggregation_rules || {
        method: 'WeightedAverage' as const,
        core_trust_weight: 0.7,
        custom_weight: 0.3
      };

      // Calculate final score
      let finalScore: number;
      switch (aggregationRules.method) {
        case 'WeightedAverage':
          finalScore = (coreScore * aggregationRules.core_trust_weight) + 
                      (customScore * aggregationRules.custom_weight);
          break;
        case 'WeightedSum':
          finalScore = (coreScore * aggregationRules.core_trust_weight) + customScore;
          break;
        case 'Minimum':
          finalScore = Math.min(coreScore, customScore);
          break;
        case 'Maximum':
          finalScore = Math.max(coreScore, customScore);
          break;
        default:
          finalScore = (coreScore + customScore) / 2;
      }

      finalScore = Math.max(0, Math.min(1, finalScore));

      const compositeTrustScore: CompositeTrustScore = {
        wallet_address: walletAddress,
        app_id: appId,
        core_score: coreScore,
        custom_score: customScore,
        final_score: finalScore,
        components: {
          transaction_success: coreMetrics.transaction_success_rate,
          validator_uptime: coreMetrics.validator_uptime,
          network_participation: coreMetrics.network_participation
        },
        timestamp: Date.now()
      };

      const endTime = performance.now();
      console.log(`✅ Calculated composite trust score for ${walletAddress}:${appId} in ${endTime - startTime}ms`);

      return compositeTrustScore;
    } catch (error) {
      console.error('Error calculating composite trust score:', error);
      throw error;
    }
  }

  // Update custom trust field
  async updateCustomTrustField(walletAddress: string, appId: string, fieldName: string, value: number): Promise<void> {
    try {
      const key = `${walletAddress}:${appId}`;
      if (!this.customScores.has(key)) {
        this.customScores.set(key, {});
      }
      this.customScores.get(key)![fieldName] = value;

      // Clear cache
      const cacheKey = `field_value:${walletAddress}:${appId}:${fieldName}`;
      await this.cache.delete(cacheKey);

      console.log(`✅ Updated custom trust field ${fieldName} for ${walletAddress}:${appId}`);
    } catch (error) {
      console.error('Error updating custom trust field:', error);
      throw error;
    }
  }
}

// Initialize the trust engine
const trustEngine = new MemoryOnlyTrustEngine();

// Create Express app
const app = express();
const PORT = process.env.PORT || 4947;

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
    service: 'memory-only-trust-engine',
    timestamp: new Date().toISOString()
  });
});

// Get trust score for a wallet
app.get('/api/v1/trust/score/:walletAddress', async (req: Request, res: Response) => {
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
    console.error('Error getting trust score:', error);
    res.status(500).json({ error: 'Failed to get trust score' });
  }
});

// Register custom trust metrics
app.post('/api/v1/trust/custom-metrics', async (req: Request, res: Response) => {
  try {
    const { appId, developerId, metrics } = req.body;
    
    if (!appId || !developerId || !metrics) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await trustEngine.registerCustomMetrics(appId, developerId, metrics);
    
    res.json({ 
      success: true, 
      message: 'Custom trust metrics registered successfully',
      appId 
    });
  } catch (error) {
    console.error('Error registering custom metrics:', error);
    res.status(500).json({ error: 'Failed to register custom metrics' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Memory-Only Trust Engine API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Trust scores: http://localhost:${PORT}/api/v1/trust/score/:walletAddress`);
});

export default app;
