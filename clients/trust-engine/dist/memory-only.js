"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const memory_cache_1 = require("./memory-cache");
const perf_hooks_1 = require("perf_hooks");
class MemoryOnlyTrustEngine {
    constructor() {
        this.customMetrics = new Map();
        this.coreMetrics = new Map();
        this.customScores = new Map();
        this.cache = new memory_cache_1.MemoryCache();
        this.initializeTestData();
    }
    initializeTestData() {
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
    calculateCoreTrust(metrics) {
        const baseScore = (metrics.transaction_success_rate * 0.15 +
            metrics.validator_uptime * 0.15 +
            metrics.network_participation * 0.12 +
            metrics.stake_consistency * 0.10 +
            metrics.delegation_quality * 0.08 +
            metrics.fraud_prevention_score * 0.15 +
            metrics.security_compliance * 0.10 +
            metrics.governance_participation * 0.08 +
            metrics.community_voting_score * 0.07);
        // Time and environmental bonuses
        const timeBonus = Math.min(metrics.time_on_network / 31536000, 0.1); // Max 10% for 1 year
        const envBonus = metrics.environmental_contributions * 0.05;
        const kycBonus = (metrics.kyc_verification_level / 5) * 0.1;
        return Math.min(baseScore + timeBonus + envBonus + kycBonus, 1.0);
    }
    // Get or create core trust metrics for a wallet
    async getCoreMetrics(walletAddress) {
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
        }
        catch (error) {
            console.error('Error getting core metrics:', error);
            throw error;
        }
    }
    // Register custom trust metrics for an app
    async registerCustomMetrics(appId, developerId, metrics) {
        try {
            this.customMetrics.set(appId, metrics);
            console.log(`✅ Registered custom trust metrics for app: ${appId}`);
        }
        catch (error) {
            console.error('Error registering custom metrics:', error);
            throw error;
        }
    }
    // Calculate composite trust score
    async calculateCompositeTrustScore(walletAddress, appId) {
        try {
            const startTime = perf_hooks_1.performance.now();
            // Get core trust metrics
            const coreMetrics = await this.getCoreMetrics(walletAddress);
            const coreScore = coreMetrics.core_trust_score;
            // Get custom trust metrics
            const customScore = 0.5; // Default for demo
            // Get aggregation rules
            const metrics = this.customMetrics.get(appId);
            const aggregationRules = metrics?.aggregation_rules || {
                method: 'WeightedAverage',
                core_trust_weight: 0.7,
                custom_weight: 0.3
            };
            // Calculate final score
            let finalScore;
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
            const compositeTrustScore = {
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
            const endTime = perf_hooks_1.performance.now();
            console.log(`✅ Calculated composite trust score for ${walletAddress}:${appId} in ${endTime - startTime}ms`);
            return compositeTrustScore;
        }
        catch (error) {
            console.error('Error calculating composite trust score:', error);
            throw error;
        }
    }
    // Update custom trust field
    async updateCustomTrustField(walletAddress, appId, fieldName, value) {
        try {
            const key = `${walletAddress}:${appId}`;
            if (!this.customScores.has(key)) {
                this.customScores.set(key, {});
            }
            this.customScores.get(key)[fieldName] = value;
            // Clear cache
            const cacheKey = `field_value:${walletAddress}:${appId}:${fieldName}`;
            await this.cache.delete(cacheKey);
            console.log(`✅ Updated custom trust field ${fieldName} for ${walletAddress}:${appId}`);
        }
        catch (error) {
            console.error('Error updating custom trust field:', error);
            throw error;
        }
    }
}
// Initialize the trust engine
const trustEngine = new MemoryOnlyTrustEngine();
// Create Express app
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'memory-only-trust-engine',
        timestamp: new Date().toISOString()
    });
});
// Get trust score for a wallet
app.get('/api/v1/trust/score/:walletAddress', async (req, res) => {
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
        const compositScore = await trustEngine.calculateCompositeTrustScore(walletAddress, appId);
        res.json(compositScore);
    }
    catch (error) {
        console.error('Error getting trust score:', error);
        res.status(500).json({ error: 'Failed to get trust score' });
    }
});
// Register custom trust metrics
app.post('/api/v1/trust/custom-metrics', async (req, res) => {
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
    }
    catch (error) {
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
exports.default = app;
//# sourceMappingURL=memory-only.js.map