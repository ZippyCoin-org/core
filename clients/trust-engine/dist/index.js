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
const pg_1 = require("pg");
const zod_1 = require("zod");
const perf_hooks_1 = require("perf_hooks");
// Validation schemas
const trustFieldSchema = zod_1.z.object({
    field_name: zod_1.z.string(),
    field_type: zod_1.z.enum(['Numeric', 'Boolean', 'Categorical', 'TimeSeries', 'CompoundMetric']),
    weight: zod_1.z.number().min(0).max(1),
    data_source: zod_1.z.object({
        type: zod_1.z.enum(['OnChain', 'OffChain', 'UserInput', 'CoreTrust', 'CrossReference']),
        contract_address: zod_1.z.string().optional(),
        api_endpoint: zod_1.z.string().optional(),
        ref_field: zod_1.z.string().optional(),
    }),
    validation_method: zod_1.z.enum(['Range', 'Cryptographic', 'Peer', 'Historical', 'Performance', 'AI', 'Custom']),
    decay_rate: zod_1.z.number().optional(),
    min_value: zod_1.z.number(),
    max_value: zod_1.z.number(),
    default_value: zod_1.z.number(),
});
const customTrustMetricsSchema = zod_1.z.object({
    app_id: zod_1.z.string(),
    developer_id: zod_1.z.string(),
    custom_fields: zod_1.z.record(trustFieldSchema),
    aggregation_rules: zod_1.z.object({
        method: zod_1.z.enum(['WeightedAverage', 'WeightedSum', 'Minimum', 'Maximum', 'Custom']),
        core_trust_weight: zod_1.z.number().min(0).max(1),
        custom_weight: zod_1.z.number().min(0).max(1),
    }),
    validation_rules: zod_1.z.object({
        required_fields: zod_1.z.array(zod_1.z.string()),
        min_core_score: zod_1.z.number().min(0).max(1),
        max_decay_rate: zod_1.z.number().min(0).max(1),
    }),
});
class EnhancedTrustEngine {
    constructor() {
        this.customMetrics = new Map();
        this.trustCalculators = new Map();
        // Initialize memory cache
        this.cache = new memory_cache_1.MemoryCache();
        // Initialize PostgreSQL connection
        this.db = new pg_1.Client({
            connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/zippycoin_trust',
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_NAME || 'postgres',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'password',
        });
        this.initializeDatabase();
    }
    async initializeDatabase() {
        try {
            await this.db.connect();
            // Create tables if they don't exist
            await this.db.query(`
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
      `);
            await this.db.query(`
        CREATE TABLE IF NOT EXISTS custom_trust_metrics (
          app_id VARCHAR(255) NOT NULL,
          developer_id VARCHAR(255) NOT NULL,
          metrics_config JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          PRIMARY KEY (app_id, developer_id)
        );
      `);
            await this.db.query(`
        CREATE TABLE IF NOT EXISTS custom_trust_scores (
          wallet_address VARCHAR(255) NOT NULL,
          app_id VARCHAR(255) NOT NULL,
          field_name VARCHAR(255) NOT NULL,
          field_value DOUBLE PRECISION NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW(),
          PRIMARY KEY (wallet_address, app_id, field_name)
        );
      `);
            await this.db.query(`
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
      `);
            console.log('✅ Trust database initialized successfully');
        }
        catch (error) {
            console.error('❌ Failed to initialize trust database:', error);
            throw error;
        }
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
            const result = await this.db.query('SELECT * FROM core_trust_metrics WHERE wallet_address = $1', [walletAddress]);
            let metrics;
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
            }
            else {
                metrics = result.rows[0];
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
            // Validate metrics
            customTrustMetricsSchema.parse(metrics);
            // Store in database
            await this.db.query(`
        INSERT INTO custom_trust_metrics (app_id, developer_id, metrics_config)
        VALUES ($1, $2, $3)
        ON CONFLICT (app_id, developer_id) 
        DO UPDATE SET metrics_config = $3, updated_at = NOW()
      `, [appId, developerId, JSON.stringify(metrics)]);
            // Store in memory cache
            this.customMetrics.set(appId, metrics);
            console.log(`✅ Registered custom trust metrics for app: ${appId}`);
        }
        catch (error) {
            console.error('Error registering custom metrics:', error);
            throw error;
        }
    }
    // Calculate custom trust score for an app
    async calculateCustomScore(walletAddress, appId) {
        try {
            const metrics = this.customMetrics.get(appId);
            if (!metrics) {
                return 0.0;
            }
            let totalScore = 0.0;
            let totalWeight = 0.0;
            for (const [fieldName, field] of Object.entries(metrics.custom_fields)) {
                const fieldValue = await this.getFieldValue(walletAddress, appId, fieldName, field);
                const normalizedValue = this.normalizeFieldValue(fieldValue, field);
                // Apply decay if configured
                let decayedValue = normalizedValue;
                if (field.decay_rate) {
                    const timeSinceUpdate = Date.now();
                    const decayFactor = Math.pow(1.0 - field.decay_rate, timeSinceUpdate / 2592000000); // Monthly decay
                    decayedValue = normalizedValue * decayFactor;
                }
                totalScore += decayedValue * field.weight;
                totalWeight += field.weight;
            }
            return totalWeight > 0 ? totalScore / totalWeight : 0.0;
        }
        catch (error) {
            console.error('Error calculating custom score:', error);
            return 0.0;
        }
    }
    // Get field value from data source
    async getFieldValue(walletAddress, appId, fieldName, field) {
        try {
            // Check cache first
            const cacheKey = `field_value:${walletAddress}:${appId}:${fieldName}`;
            const cached = await this.cache.get(cacheKey);
            if (cached) {
                return parseFloat(cached);
            }
            let value = field.default_value;
            switch (field.data_source.type) {
                case 'OnChain':
                    // TODO: Implement smart contract call
                    value = field.default_value;
                    break;
                case 'OffChain':
                    try {
                        const resp = await fetch(field.data_source.api_endpoint);
                        if (resp.ok) {
                            const body = await resp.json().catch(() => ({}));
                            // Try common shapes: { value }, number, or { data: { value } }
                            const candidate = typeof body === 'number' ? body : (body?.value ?? body?.data?.value);
                            const num = Number(candidate);
                            value = Number.isFinite(num) ? num : field.default_value;
                        }
                        else {
                            value = field.default_value;
                        }
                    }
                    catch {
                        value = field.default_value;
                    }
                    break;
                case 'UserInput':
                    // Get from database
                    const result = await this.db.query('SELECT field_value FROM custom_trust_scores WHERE wallet_address = $1 AND app_id = $2 AND field_name = $3', [walletAddress, appId, fieldName]);
                    if (result.rows.length > 0) {
                        value = result.rows[0].field_value;
                    }
                    break;
                case 'CoreTrust':
                    // Get from core trust metrics
                    const coreMetrics = await this.getCoreMetrics(walletAddress);
                    value = coreMetrics.core_trust_score;
                    break;
                case 'CrossReference':
                    try {
                        if (field.data_source.ref_field === 'core_trust') {
                            const core = await this.getCoreMetrics(walletAddress);
                            value = core.core_trust_score;
                        }
                        else {
                            const result = await this.db.query('SELECT field_value FROM custom_trust_scores WHERE wallet_address = $1 AND app_id = $2 AND field_name = $3', [walletAddress, appId, field.data_source.ref_field]);
                            if (result.rows.length > 0) {
                                const n = Number(result.rows[0].field_value);
                                value = Number.isFinite(n) ? n : field.default_value;
                            }
                            else {
                                value = field.default_value;
                            }
                        }
                    }
                    catch {
                        value = field.default_value;
                    }
                    break;
            }
            // Cache for 1 minute
            await this.cache.set(cacheKey, value.toString(), 60);
            return value;
        }
        catch (error) {
            console.error('Error getting field value:', error);
            return field.default_value;
        }
    }
    // Normalize field value to 0.0-1.0 range
    normalizeFieldValue(value, field) {
        switch (field.field_type) {
            case 'Numeric':
                const normalized = (value - field.min_value) / (field.max_value - field.min_value);
                return Math.max(0, Math.min(1, normalized));
            case 'Boolean':
                return value > 0.5 ? 1.0 : 0.0;
            default:
                return value;
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
            const customScore = await this.calculateCustomScore(walletAddress, appId);
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
                case 'Custom':
                    // TODO: Implement custom formula evaluation
                    finalScore = (coreScore + customScore) / 2;
                    break;
                default:
                    finalScore = (coreScore + customScore) / 2;
            }
            finalScore = Math.max(0, Math.min(1, finalScore));
            // Get score components
            const components = {};
            if (metrics) {
                for (const [fieldName, field] of Object.entries(metrics.custom_fields)) {
                    const fieldValue = await this.getFieldValue(walletAddress, appId, fieldName, field);
                    components[fieldName] = this.normalizeFieldValue(fieldValue, field);
                }
            }
            const compositeTrustScore = {
                wallet_address: walletAddress,
                app_id: appId,
                core_score: coreScore,
                custom_score: customScore,
                final_score: finalScore,
                components,
                timestamp: Date.now()
            };
            // Store in database
            await this.db.query(`
        INSERT INTO composite_trust_scores (wallet_address, app_id, core_score, custom_score, final_score, components)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (wallet_address, app_id)
        DO UPDATE SET core_score = $3, custom_score = $4, final_score = $5, components = $6, calculated_at = NOW()
      `, [walletAddress, appId, coreScore, customScore, finalScore, JSON.stringify(components)]);
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
            await this.db.query(`
        INSERT INTO custom_trust_scores (wallet_address, app_id, field_name, field_value)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (wallet_address, app_id, field_name)
        DO UPDATE SET field_value = $4, updated_at = NOW()
      `, [walletAddress, appId, fieldName, value]);
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
    // Load custom metrics from database
    async loadCustomMetrics() {
        try {
            const result = await this.db.query('SELECT * FROM custom_trust_metrics');
            for (const row of result.rows) {
                const metrics = JSON.parse(row.metrics_config);
                this.customMetrics.set(row.app_id, metrics);
            }
            console.log(`✅ Loaded ${result.rows.length} custom trust metrics configurations`);
        }
        catch (error) {
            console.error('Error loading custom metrics:', error);
            throw error;
        }
    }
}
// Initialize the enhanced trust engine
const trustEngine = new EnhancedTrustEngine();
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
        service: 'enhanced-trust-engine',
        timestamp: new Date().toISOString()
    });
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
// Update custom trust field
app.put('/api/v1/trust/custom-field', async (req, res) => {
    try {
        const { appId, walletAddress, fieldName, value } = req.body;
        if (!appId || !walletAddress || !fieldName || value === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        await trustEngine.updateCustomTrustField(walletAddress, appId, fieldName, value);
        res.json({
            success: true,
            message: 'Custom trust field updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating custom trust field:', error);
        res.status(500).json({ error: 'Failed to update custom trust field' });
    }
});
// Verify trust requirement
app.post('/api/v1/trust/verify', async (req, res) => {
    try {
        const { appId, walletAddress, requirements } = req.body;
        if (!appId || !walletAddress || !requirements) {
            return res.status(400).json({ error: 'Missing required fields' });
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
    }
    catch (error) {
        console.error('Error verifying trust requirement:', error);
        res.status(500).json({ error: 'Failed to verify trust requirement' });
    }
});
// Get trust metrics for an app
app.get('/api/v1/trust/metrics/:appId', async (req, res) => {
    try {
        const { appId } = req.params;
        const metrics = trustEngine['customMetrics'].get(appId);
        if (!metrics) {
            return res.status(404).json({ error: 'App not found' });
        }
        res.json(metrics);
    }
    catch (error) {
        console.error('Error getting trust metrics:', error);
        res.status(500).json({ error: 'Failed to get trust metrics' });
    }
});
// Start server
app.listen(PORT, async () => {
    console.log(`🚀 Enhanced Trust Engine API running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 Trust scores: http://localhost:${PORT}/api/v1/trust/score/:walletAddress`);
    // Load existing custom metrics
    await trustEngine.loadCustomMetrics();
});
exports.default = app;
// --- Server-Sent Events (SSE) for real-time trust updates ---
// Endpoint: /api/v1/trust/subscribe?walletAddress=...&appId=...
app.get('/api/v1/trust/subscribe', async (req, res) => {
    try {
        const walletAddress = req.query.walletAddress || '';
        const appId = req.query.appId || '';
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
        const sendEvent = (event, data) => {
            try {
                res.write(`event: ${event}\n`);
                res.write(`data: ${JSON.stringify(data)}\n\n`);
            }
            catch (_) {
                stopped = true;
            }
        };
        // Initial push
        try {
            const score = await trustEngine.calculateCompositeTrustScore(walletAddress, appId);
            sendEvent('score', score);
        }
        catch (e) {
            sendEvent('error', { message: 'initial calculation failed' });
        }
        // Heartbeat to keep connection alive
        const heartbeat = setInterval(() => {
            if (stopped)
                return;
            sendEvent('ping', { t: Date.now() });
        }, 15000);
        // Periodic updates
        const ticker = setInterval(async () => {
            if (stopped)
                return;
            try {
                const score = await trustEngine.calculateCompositeTrustScore(walletAddress, appId);
                sendEvent('score', score);
            }
            catch (e) {
                sendEvent('error', { message: 'calculation failed' });
            }
        }, intervalMs);
        // Cleanup on close
        const clean = () => {
            clearInterval(heartbeat);
            clearInterval(ticker);
            try {
                res.end();
            }
            catch { }
        };
        req.on('close', clean);
    }
    catch (error) {
        console.error('SSE subscribe error:', error);
        res.status(500).json({ error: 'Failed to subscribe' });
    }
});
//# sourceMappingURL=index.js.map