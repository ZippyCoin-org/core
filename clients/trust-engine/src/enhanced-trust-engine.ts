import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { MemoryCache } from './memory-cache';
import { Client } from 'pg';
import { z } from 'zod';
import { performance } from 'perf_hooks';
import type { ServerResponse } from 'http';
import { logger } from '../shared/utils/logger';

// Enhanced Trust API Types
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

interface TrustDelegation {
  id: string;
  delegator: string;
  delegate: string;
  amount: number;
  timestamp: number;
  isActive: boolean;
  depth: number;
}

interface ReputationMetrics {
  wallet_address: string;
  metric_name: string;
  metric_value: number;
  recorded_at: number;
}

interface AntiGamingDetection {
  suspicious_patterns: SuspiciousPattern[];
  risk_score: number;
  last_analyzed: number;
  recommendations: string[];
}

interface SuspiciousPattern {
  type: 'rapid_changes' | 'circular_delegation' | 'unusual_activity' | 'coordinated_behavior';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: number;
}

interface TrustAnalytics {
  total_wallets: number;
  average_trust_score: number;
  trust_distribution: TrustDistribution;
  top_performers: string[];
  suspicious_activity: number;
}

interface TrustDistribution {
  excellent: number; // 0.8-1.0
  good: number;      // 0.6-0.8
  average: number;   // 0.4-0.6
  poor: number;      // 0.2-0.4
  failing: number;   // 0.0-0.2
}

interface FraudScore {
  wallet_address: string;
  score: number;
  factors: FraudFactor[];
  last_calculated: number;
}

interface FraudFactor {
  factor: string;
  weight: number;
  contribution: number;
}

// Enhanced database schema
const TRUST_ENGINE_SCHEMA = `
  -- Core trust metrics table
  CREATE TABLE IF NOT EXISTS core_trust_metrics (
    wallet_address VARCHAR(255) PRIMARY KEY,
    transaction_success_rate DOUBLE PRECISION DEFAULT 0,
    validator_uptime DOUBLE PRECISION DEFAULT 0,
    network_participation DOUBLE PRECISION DEFAULT 0,
    stake_consistency DOUBLE PRECISION DEFAULT 0,
    delegation_quality DOUBLE PRECISION DEFAULT 0,
    fraud_prevention_score DOUBLE PRECISION DEFAULT 1,
    security_compliance DOUBLE PRECISION DEFAULT 0.5,
    kyc_verification_level INTEGER DEFAULT 0,
    time_on_network BIGINT DEFAULT 0,
    environmental_contributions DOUBLE PRECISION DEFAULT 0,
    governance_participation DOUBLE PRECISION DEFAULT 0,
    community_voting_score DOUBLE PRECISION DEFAULT 0,
    core_trust_score DOUBLE PRECISION DEFAULT 0,
    last_updated BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())
  );

  -- Trust delegations table
  CREATE TABLE IF NOT EXISTS trust_delegations (
    id SERIAL PRIMARY KEY,
    delegator VARCHAR(255) NOT NULL,
    delegate VARCHAR(255) NOT NULL,
    amount DECIMAL(36,18) NOT NULL,
    timestamp BIGINT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    depth INTEGER DEFAULT 0,
    UNIQUE(delegator, delegate)
  );

  -- Reputation metrics table
  CREATE TABLE IF NOT EXISTS reputation_metrics (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(255) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DOUBLE PRECISION NOT NULL,
    recorded_at BIGINT NOT NULL
  );

  -- Anti-gaming detection table
  CREATE TABLE IF NOT EXISTS anti_gaming_detection (
    wallet_address VARCHAR(255) PRIMARY KEY,
    suspicious_patterns JSONB DEFAULT '[]',
    risk_score DOUBLE PRECISION DEFAULT 0,
    last_analyzed BIGINT DEFAULT 0,
    recommendations JSONB DEFAULT '[]'
  );

  -- Fraud scores table
  CREATE TABLE IF NOT EXISTS fraud_scores (
    wallet_address VARCHAR(255) PRIMARY KEY,
    score DOUBLE PRECISION NOT NULL,
    factors JSONB NOT NULL,
    last_calculated BIGINT NOT NULL
  );

  -- Trust analytics table
  CREATE TABLE IF NOT EXISTS trust_analytics (
    id SERIAL PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    total_wallets INTEGER NOT NULL,
    average_trust_score DOUBLE PRECISION NOT NULL,
    trust_distribution JSONB NOT NULL,
    top_performers JSONB NOT NULL,
    suspicious_activity INTEGER DEFAULT 0
  );

  -- Custom trust metrics (existing)
  CREATE TABLE IF NOT EXISTS custom_trust_metrics (
    app_id VARCHAR(255) NOT NULL,
    developer_id VARCHAR(255) NOT NULL,
    metrics_config JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (app_id, developer_id)
  );

  -- Custom trust scores (existing)
  CREATE TABLE IF NOT EXISTS custom_trust_scores (
    wallet_address VARCHAR(255) NOT NULL,
    app_id VARCHAR(255) NOT NULL,
    field_name VARCHAR(255) NOT NULL,
    field_value DOUBLE PRECISION NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (wallet_address, app_id, field_name)
  );

  -- Composite trust scores (existing)
  CREATE TABLE IF NOT EXISTS composite_trust_scores (
    wallet_address VARCHAR(255) NOT NULL,
    app_id VARCHAR(255) NOT NULL,
    core_score DOUBLE PRECISION NOT NULL,
    custom_score DOUBLE PRECISION NOT NULL,
    final_score DOUBLE PRECISION NOT NULL,
    components JSONB NOT NULL,
    calculated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (wallet_address, app_id)
  );

  -- Indexes for performance
  CREATE INDEX IF NOT EXISTS idx_trust_delegations_delegator ON trust_delegations(delegator);
  CREATE INDEX IF NOT EXISTS idx_trust_delegations_delegate ON trust_delegations(delegate);
  CREATE INDEX IF NOT EXISTS idx_trust_delegations_active ON trust_delegations(is_active);
  CREATE INDEX IF NOT EXISTS idx_reputation_metrics_wallet ON reputation_metrics(wallet_address);
  CREATE INDEX IF NOT EXISTS idx_trust_analytics_timestamp ON trust_analytics(timestamp);
`;

class EnhancedTrustEngine {
  private cache: MemoryCache;
  private db: Client;
  private customMetrics: Map<string, any> = new Map();

  constructor() {
    this.cache = new MemoryCache();

    this.db = new Client({
      connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/zippycoin_trust',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'postgres',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
    });

    this.initializeDatabase();
  }

  private async initializeDatabase() {
    try {
      await this.db.connect();

      // Execute enhanced schema
      await this.db.query(TRUST_ENGINE_SCHEMA);

      logger.info('✅ Enhanced Trust Engine database initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize trust database:', error);
      throw error;
    }
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

  // Enhanced anti-gaming detection
  private async detectSuspiciousActivity(walletAddress: string): Promise<AntiGamingDetection> {
    const cacheKey = `anti_gaming:${walletAddress}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const patterns: SuspiciousPattern[] = [];
    let riskScore = 0;

    try {
      // Check for rapid trust score changes
      const recentScores = await this.db.query(
        'SELECT core_trust_score, last_updated FROM core_trust_metrics WHERE wallet_address = $1 ORDER BY last_updated DESC LIMIT 10',
        [walletAddress]
      );

      if (recentScores.rows.length >= 5) {
        const scores = recentScores.rows.map((r: any) => r.core_trust_score);
        const changes = scores.slice(1).map((score: number, i: number) => Math.abs(score - scores[i]));
        const avgChange = changes.reduce((a: number, b: number) => a + b, 0) / changes.length;

        if (avgChange > 0.1) { // More than 10% average change
          patterns.push({
            type: 'rapid_changes',
            severity: avgChange > 0.3 ? 'high' : 'medium',
            description: `Unusual trust score volatility detected (${avgChange.toFixed(3)} average change)`,
            timestamp: Date.now()
          });
          riskScore += avgChange * 100;
        }
      }

      // Check for circular delegation
      const delegations = await this.getDelegationChain(walletAddress);
      if (this.detectCircularDelegation(delegations)) {
        patterns.push({
          type: 'circular_delegation',
          severity: 'critical',
          description: 'Circular trust delegation detected',
          timestamp: Date.now()
        });
        riskScore += 50;
      }

      // Check for unusual activity patterns
      const activityScore = await this.analyzeActivityPatterns(walletAddress);
      if (activityScore > 0.7) {
        patterns.push({
          type: 'unusual_activity',
          severity: activityScore > 0.9 ? 'high' : 'medium',
          description: `Unusual activity pattern detected (score: ${activityScore.toFixed(2)})`,
          timestamp: Date.now()
        });
        riskScore += activityScore * 30;
      }

      const detection: AntiGamingDetection = {
        suspicious_patterns: patterns,
        risk_score: Math.min(riskScore, 100),
        last_analyzed: Date.now(),
        recommendations: this.generateRecommendations(patterns)
      };

      // Store in database
      await this.db.query(`
        INSERT INTO anti_gaming_detection (wallet_address, suspicious_patterns, risk_score, last_analyzed, recommendations)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (wallet_address)
        DO UPDATE SET suspicious_patterns = $2, risk_score = $3, last_analyzed = $4, recommendations = $5
      `, [walletAddress, JSON.stringify(patterns), riskScore, Date.now(), JSON.stringify(detection.recommendations)]);

      // Cache for 1 hour
      await this.cache.set(cacheKey, detection, 3600);

      return detection;
    } catch (error) {
      logger.error('Error in anti-gaming detection:', error);
      return {
        suspicious_patterns: [],
        risk_score: 0,
        last_analyzed: Date.now(),
        recommendations: []
      };
    }
  }

  private detectCircularDelegation(delegations: TrustDelegation[]): boolean {
    // Check if there's a cycle in delegation chain
    const visited = new Set<string>();
    const path = new Set<string>();

    const hasCycle = (current: string): boolean => {
      if (path.has(current)) return true;
      if (visited.has(current)) return false;

      visited.add(current);
      path.add(current);

      const delegates = delegations.filter(d => d.delegator === current && d.isActive);
      for (const delegation of delegates) {
        if (hasCycle(delegation.delegate)) return true;
      }

      path.delete(current);
      return false;
    };

    for (const delegation of delegations) {
      if (hasCycle(delegation.delegator)) return true;
    }
    return false;
  }

  private async analyzeActivityPatterns(walletAddress: string): Promise<number> {
    // Analyze transaction patterns, delegation behavior, etc.
    // This is a simplified implementation
    try {
      const recentActivity = await this.db.query(`
        SELECT COUNT(*) as activity_count,
               AVG(core_trust_score) as avg_score,
               MIN(last_updated) as first_activity,
               MAX(last_updated) as last_activity
        FROM core_trust_metrics
        WHERE wallet_address = $1 AND last_updated > EXTRACT(EPOCH FROM NOW() - INTERVAL '7 days')
      `, [walletAddress]);

      if (recentActivity.rows[0].activity_count > 100) {
        return 0.8; // High activity might indicate bot behavior
      }

      return 0.0; // Normal activity
    } catch {
      return 0.0;
    }
  }

  private generateRecommendations(patterns: SuspiciousPattern[]): string[] {
    const recommendations: string[] = [];

    for (const pattern of patterns) {
      switch (pattern.type) {
        case 'rapid_changes':
          recommendations.push('Monitor trust score changes more frequently');
          recommendations.push('Consider implementing trust score stabilization');
          break;
        case 'circular_delegation':
          recommendations.push('Break circular delegation chains');
          recommendations.push('Implement delegation depth limits');
          break;
        case 'unusual_activity':
          recommendations.push('Review activity patterns');
          recommendations.push('Consider additional verification requirements');
          break;
      }
    }

    return [...new Set(recommendations)];
  }

  // Get delegation chain for a wallet
  async getDelegationChain(walletAddress: string): Promise<TrustDelegation[]> {
    try {
      const result = await this.db.query(`
        SELECT * FROM trust_delegations
        WHERE delegator = $1 OR delegate = $1
        ORDER BY timestamp DESC
      `, [walletAddress]);

      return result.rows.map(row => ({
        id: row.id.toString(),
        delegator: row.delegator,
        delegate: row.delegate,
        amount: parseFloat(row.amount),
        timestamp: parseInt(row.timestamp),
        isActive: row.is_active,
        depth: row.depth
      }));
    } catch (error) {
      logger.error('Error getting delegation chain:', error);
      return [];
    }
  }

  // Calculate fraud score
  async calculateFraudScore(walletAddress: string): Promise<FraudScore> {
    const cacheKey = `fraud_score:${walletAddress}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const antiGaming = await this.detectSuspiciousActivity(walletAddress);
      const coreMetrics = await this.getCoreMetrics(walletAddress);

      const factors: FraudFactor[] = [
        {
          factor: 'suspicious_patterns',
          weight: 0.4,
          contribution: antiGaming.risk_score / 100
        },
        {
          factor: 'trust_volatility',
          weight: 0.3,
          contribution: Math.min(coreMetrics.transaction_success_rate, 0.5) // Lower success rate indicates potential fraud
        },
        {
          factor: 'delegation_behavior',
          weight: 0.3,
          contribution: coreMetrics.delegation_quality < 0.5 ? 0.7 : 0.3
        }
      ];

      const score = factors.reduce((acc, factor) => acc + (factor.contribution * factor.weight), 0);

      const fraudScore: FraudScore = {
        wallet_address: walletAddress,
        score,
        factors,
        last_calculated: Date.now()
      };

      // Store in database
      await this.db.query(`
        INSERT INTO fraud_scores (wallet_address, score, factors, last_calculated)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (wallet_address)
        DO UPDATE SET score = $2, factors = $3, last_calculated = $4
      `, [walletAddress, score, JSON.stringify(factors), Date.now()]);

      // Cache for 30 minutes
      await this.cache.set(cacheKey, fraudScore, 1800);

      return fraudScore;
    } catch (error) {
      logger.error('Error calculating fraud score:', error);
      return {
        wallet_address: walletAddress,
        score: 0,
        factors: [],
        last_calculated: Date.now()
      };
    }
  }

  // Get trust analytics
  async getTrustAnalytics(): Promise<TrustAnalytics> {
    try {
      const result = await this.db.query(`
        SELECT
          COUNT(*) as total_wallets,
          AVG(core_trust_score) as average_score,
          COUNT(CASE WHEN core_trust_score >= 0.8 THEN 1 END) as excellent,
          COUNT(CASE WHEN core_trust_score >= 0.6 AND core_trust_score < 0.8 THEN 1 END) as good,
          COUNT(CASE WHEN core_trust_score >= 0.4 AND core_trust_score < 0.6 THEN 1 END) as average,
          COUNT(CASE WHEN core_trust_score >= 0.2 AND core_trust_score < 0.4 THEN 1 END) as poor,
          COUNT(CASE WHEN core_trust_score < 0.2 THEN 1 END) as failing
        FROM core_trust_metrics
      `);

      const topPerformers = await this.db.query(`
        SELECT wallet_address FROM core_trust_metrics
        ORDER BY core_trust_score DESC LIMIT 10
      `);

      const suspiciousActivity = await this.db.query(`
        SELECT COUNT(*) as count FROM anti_gaming_detection
        WHERE risk_score > 50
      `);

      const row = result.rows[0];
      return {
        total_wallets: parseInt(row.total_wallets),
        average_trust_score: parseFloat(row.average_score) || 0,
        trust_distribution: {
          excellent: parseInt(row.excellent),
          good: parseInt(row.good),
          average: parseInt(row.average),
          poor: parseInt(row.poor),
          failing: parseInt(row.failing)
        },
        top_performers: topPerformers.rows.map((r: any) => r.wallet_address),
        suspicious_activity: parseInt(suspiciousActivity.rows[0].count)
      };
    } catch (error) {
      logger.error('Error getting trust analytics:', error);
      return {
        total_wallets: 0,
        average_trust_score: 0,
        trust_distribution: { excellent: 0, good: 0, average: 0, poor: 0, failing: 0 },
        top_performers: [],
        suspicious_activity: 0
      };
    }
  }

  // Get delegation graph for visualization
  async getDelegationGraph(): Promise<any> {
    try {
      const result = await this.db.query(`
        SELECT delegator, delegate, amount, is_active
        FROM trust_delegations
        WHERE is_active = true
      `);

      const nodes = new Set<string>();
      const links: any[] = [];

      for (const row of result.rows) {
        nodes.add(row.delegator);
        nodes.add(row.delegate);
        links.push({
          source: row.delegator,
          target: row.delegate,
          value: parseFloat(row.amount)
        });
      }

      return {
        nodes: Array.from(nodes).map(id => ({ id })),
        links
      };
    } catch (error) {
      logger.error('Error getting delegation graph:', error);
      return { nodes: [], links: [] };
    }
  }

  // Get or create core trust metrics for a wallet
  async getCoreMetrics(walletAddress: string): Promise<CoreTrustMetrics> {
    try {
      const cacheKey = `core_trust:${walletAddress}`;
      const cached = await this.cache.get(cacheKey);

      if (cached) {
        return cached;
      }

      const result = await this.db.query(
        'SELECT * FROM core_trust_metrics WHERE wallet_address = $1',
        [walletAddress]
      );

      let metrics: CoreTrustMetrics;
      if (result.rows.length === 0) {
        // Create default metrics for new wallet
        metrics = {
          transaction_success_rate: 0.0,
          validator_uptime: 0.0,
          network_participation: 0.0,
          stake_consistency: 0.0,
          delegation_quality: 0.0,
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

        await this.db.query(`
          INSERT INTO core_trust_metrics (wallet_address, core_trust_score, last_updated)
          VALUES ($1, $2, $3)
        `, [walletAddress, metrics.core_trust_score, metrics.last_updated]);
      } else {
        metrics = result.rows[0];
      }

      // Calculate and update core trust score
      metrics.core_trust_score = this.calculateCoreTrust(metrics);

      // Cache for 5 minutes
      await this.cache.set(cacheKey, metrics, 300);

      return metrics;
    } catch (error) {
      logger.error('Error getting core metrics:', error);
      throw error;
    }
  }

  // Delegate trust to another wallet
  async delegateTrust(delegator: string, delegate: string, amount: number): Promise<string> {
    try {
      // Check for circular delegation
      const chain = await this.getDelegationChain(delegator);
      if (chain.some(d => d.delegate === delegator)) {
        throw new Error('Circular delegation detected');
      }

      // Check delegation depth
      const maxDepth = await this.getDelegationDepth(delegator);
      if (maxDepth >= 5) {
        throw new Error('Maximum delegation depth exceeded');
      }

      const result = await this.db.query(`
        INSERT INTO trust_delegations (delegator, delegate, amount, timestamp, depth)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [delegator, delegate, amount, Date.now(), maxDepth + 1]);

      // Clear relevant caches
      await this.cache.delete(`core_trust:${delegator}`);
      await this.cache.delete(`core_trust:${delegate}`);
      await this.cache.delete(`anti_gaming:${delegator}`);
      await this.cache.delete(`anti_gaming:${delegate}`);

      return result.rows[0].id.toString();
    } catch (error) {
      logger.error('Error delegating trust:', error);
      throw error;
    }
  }

  private async getDelegationDepth(walletAddress: string): Promise<number> {
    const result = await this.db.query(`
      SELECT MAX(depth) as max_depth FROM trust_delegations
      WHERE delegator = $1 OR delegate = $1
    `, [walletAddress]);

    return parseInt(result.rows[0]?.max_depth || '0');
  }

  // Revoke trust delegation
  async revokeDelegation(delegationId: string): Promise<void> {
    try {
      await this.db.query(
        'UPDATE trust_delegations SET is_active = false WHERE id = $1',
        [delegationId]
      );

      // Clear caches for affected wallets
      // This would need to track which wallets are affected by the delegation
      logger.info(`Revoked delegation ${delegationId}`);
    } catch (error) {
      logger.error('Error revoking delegation:', error);
      throw error;
    }
  }

  // Get reputation metrics for a wallet
  async getReputationMetrics(walletAddress: string): Promise<ReputationMetrics[]> {
    try {
      const result = await this.db.query(`
        SELECT * FROM reputation_metrics
        WHERE wallet_address = $1
        ORDER BY recorded_at DESC
      `, [walletAddress]);

      return result.rows.map(row => ({
        wallet_address: row.wallet_address,
        metric_name: row.metric_name,
        metric_value: parseFloat(row.metric_value),
        recorded_at: parseInt(row.recorded_at)
      }));
    } catch (error) {
      logger.error('Error getting reputation metrics:', error);
      return [];
    }
  }

  // Record reputation metric
  async recordReputationMetric(walletAddress: string, metricName: string, value: number): Promise<void> {
    try {
      await this.db.query(`
        INSERT INTO reputation_metrics (wallet_address, metric_name, metric_value, recorded_at)
        VALUES ($1, $2, $3, $4)
      `, [walletAddress, metricName, value, Date.now()]);

      logger.debug(`Recorded reputation metric ${metricName}=${value} for ${walletAddress}`);
    } catch (error) {
      logger.error('Error recording reputation metric:', error);
      throw error;
    }
  }

  // Update core trust metrics
  async updateCoreMetrics(walletAddress: string, updates: Partial<CoreTrustMetrics>): Promise<void> {
    try {
      const current = await this.getCoreMetrics(walletAddress);
      const updated = { ...current, ...updates, last_updated: Date.now() };

      // Recalculate core trust score
      updated.core_trust_score = this.calculateCoreTrust(updated);

      await this.db.query(`
        UPDATE core_trust_metrics SET
          transaction_success_rate = $2,
          validator_uptime = $3,
          network_participation = $4,
          stake_consistency = $5,
          delegation_quality = $6,
          fraud_prevention_score = $7,
          security_compliance = $8,
          kyc_verification_level = $9,
          time_on_network = $10,
          environmental_contributions = $11,
          governance_participation = $12,
          community_voting_score = $13,
          core_trust_score = $14,
          last_updated = $15
        WHERE wallet_address = $1
      `, [
        walletAddress,
        updated.transaction_success_rate,
        updated.validator_uptime,
        updated.network_participation,
        updated.stake_consistency,
        updated.delegation_quality,
        updated.fraud_prevention_score,
        updated.security_compliance,
        updated.kyc_verification_level,
        updated.time_on_network,
        updated.environmental_contributions,
        updated.governance_participation,
        updated.community_voting_score,
        updated.core_trust_score,
        updated.last_updated
      ]);

      // Clear cache
      await this.cache.delete(`core_trust:${walletAddress}`);

      logger.info(`Updated core metrics for ${walletAddress}`);
    } catch (error) {
      logger.error('Error updating core metrics:', error);
      throw error;
    }
  }
}

// Initialize the enhanced trust engine
const trustEngine = new EnhancedTrustEngine();

export default trustEngine;

