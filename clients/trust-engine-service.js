#!/usr/bin/env node
/**
 * ZippyCoin Trust Engine Service
 * Manages trust scores, delegation, and environmental data integration
 */

const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class TrustEngineService {
    constructor() {
        this.app = express();
        this.port = process.env.TRUST_ENGINE_PORT || 3002;
        this.trustScores = new Map();
        this.delegations = new Map();
        this.environmentalData = new Map();
        this.dataFile = path.join(__dirname, 'trust-data.json');
        this.setupMiddleware();
        this.setupRoutes();
        this.loadData();
    }

    setupMiddleware() {
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

        // CORS middleware
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
            if (req.method === 'OPTIONS') {
                res.sendStatus(200);
            } else {
                next();
            }
        });

        // Request logging
        this.app.use((req, res, next) => {
            console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
            next();
        });
    }

    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                service: 'trust-engine',
                timestamp: new Date().toISOString(),
                trust_scores_count: this.trustScores.size,
                delegations_count: this.delegations.size
            });
        });

        // Trust score endpoints
        this.app.get('/api/trust/score/:address', this.getTrustScore.bind(this));
        this.app.post('/api/trust/score/:address', this.updateTrustScore.bind(this));
        this.app.get('/api/trust/scores', this.getAllTrustScores.bind(this));

        // Delegation endpoints
        this.app.post('/api/trust/delegate', this.createDelegation.bind(this));
        this.app.get('/api/trust/delegations/:address', this.getDelegations.bind(this));
        this.app.delete('/api/trust/delegation/:delegationId', this.removeDelegation.bind(this));

        // Environmental data endpoints
        this.app.post('/api/environmental/data/:address', this.updateEnvironmentalData.bind(this));
        this.app.get('/api/environmental/data/:address', this.getEnvironmentalData.bind(this));

        // Trust calculation endpoints
        this.app.post('/api/trust/calculate', this.calculateTrustScore.bind(this));
        this.app.post('/api/trust/validate', this.validateTrustAction.bind(this));

        // Bulk operations
        this.app.post('/api/trust/bulk-update', this.bulkUpdateTrustScores.bind(this));
    }

    async loadData() {
        try {
            const data = await fs.readFile(this.dataFile, 'utf8');
            const parsed = JSON.parse(data);
            this.trustScores = new Map(Object.entries(parsed.trustScores || {}));
            this.delegations = new Map(Object.entries(parsed.delegations || {}));
            this.environmentalData = new Map(Object.entries(parsed.environmentalData || {}));
            console.log('Trust data loaded successfully');
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('Error loading trust data:', error);
            }
            console.log('No existing trust data found, starting fresh');
        }
    }

    async saveData() {
        try {
            const data = {
                trustScores: Object.fromEntries(this.trustScores),
                delegations: Object.fromEntries(this.delegations),
                environmentalData: Object.fromEntries(this.environmentalData),
                lastUpdated: new Date().toISOString()
            };
            await fs.writeFile(this.dataFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Error saving trust data:', error);
        }
    }

    // Trust score methods
    async getTrustScore(req, res) {
        try {
            const { address } = req.params;
            const score = this.trustScores.get(address) || this.calculateInitialTrustScore(address);

            res.json({
                address,
                trustScore: score,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async updateTrustScore(req, res) {
        try {
            const { address } = req.params;
            const { score, action, environmentalFactor } = req.body;

            if (typeof score !== 'number' || score < 0 || score > 1) {
                return res.status(400).json({ error: 'Invalid trust score' });
            }

            // Apply environmental factor if provided
            let finalScore = score;
            if (environmentalFactor && typeof environmentalFactor === 'number') {
                finalScore = this.applyEnvironmentalFactor(score, environmentalFactor);
            }

            this.trustScores.set(address, finalScore);

            // Log the update
            console.log(`Trust score updated for ${address}: ${finalScore}`);

            await this.saveData();

            res.json({
                address,
                trustScore: finalScore,
                action: action || 'manual_update',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getAllTrustScores(req, res) {
        try {
            const scores = Array.from(this.trustScores.entries()).map(([address, score]) => ({
                address,
                trustScore: score,
                timestamp: new Date().toISOString()
            }));

            res.json({
                total: scores.length,
                trustScores: scores
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Delegation methods
    async createDelegation(req, res) {
        try {
            const { fromAddress, toAddress, amount, maxDepth = 3 } = req.body;

            if (!fromAddress || !toAddress || typeof amount !== 'number') {
                return res.status(400).json({ error: 'Invalid delegation parameters' });
            }

            if (amount <= 0 || amount > 1) {
                return res.status(400).json({ error: 'Delegation amount must be between 0 and 1' });
            }

            const delegationId = this.generateDelegationId(fromAddress, toAddress);
            const delegation = {
                id: delegationId,
                fromAddress,
                toAddress,
                amount,
                maxDepth,
                createdAt: new Date().toISOString(),
                isActive: true
            };

            this.delegations.set(delegationId, delegation);

            // Update trust scores with delegation
            await this.updateDelegatedTrustScores();

            await this.saveData();

            res.json({
                success: true,
                delegation,
                message: 'Delegation created successfully'
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getDelegations(req, res) {
        try {
            const { address } = req.params;
            const userDelegations = Array.from(this.delegations.values())
                .filter(d => d.fromAddress === address || d.toAddress === address);

            res.json({
                address,
                delegations: userDelegations,
                total: userDelegations.length
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async removeDelegation(req, res) {
        try {
            const { delegationId } = req.params;

            if (!this.delegations.has(delegationId)) {
                return res.status(404).json({ error: 'Delegation not found' });
            }

            this.delegations.delete(delegationId);

            // Update trust scores after delegation removal
            await this.updateDelegatedTrustScores();

            await this.saveData();

            res.json({
                success: true,
                message: 'Delegation removed successfully'
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Environmental data methods
    async updateEnvironmentalData(req, res) {
        try {
            const { address } = req.params;
            const { data, source, timestamp } = req.body;

            const envData = {
                address,
                data,
                source,
                timestamp: timestamp || new Date().toISOString(),
                validated: this.validateEnvironmentalData(data)
            };

            this.environmentalData.set(`${address}_${source}`, envData);

            // Update trust score with environmental factor
            if (envData.validated) {
                await this.applyEnvironmentalTrustBonus(address, data);
            }

            await this.saveData();

            res.json({
                success: true,
                environmentalData: envData,
                trustBonusApplied: envData.validated
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getEnvironmentalData(req, res) {
        try {
            const { address } = req.params;
            const userEnvData = Array.from(this.environmentalData.values())
                .filter(d => d.address === address);

            res.json({
                address,
                environmentalData: userEnvData,
                total: userEnvData.length
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Trust calculation methods
    async calculateTrustScore(req, res) {
        try {
            const { address, actions, environmentalData } = req.body;

            let score = this.calculateInitialTrustScore(address);

            // Apply action-based scoring
            if (actions && Array.isArray(actions)) {
                score = this.applyActionScoring(score, actions);
            }

            // Apply environmental factors
            if (environmentalData) {
                score = this.applyEnvironmentalFactor(score, environmentalData);
            }

            // Apply delegation factors
            score = await this.applyDelegationFactors(address, score);

            // Ensure score stays within bounds
            score = Math.max(0, Math.min(1, score));

            res.json({
                address,
                calculatedScore: score,
                factors: {
                    baseScore: this.calculateInitialTrustScore(address),
                    actionsApplied: actions ? actions.length : 0,
                    environmentalApplied: !!environmentalData,
                    delegationApplied: true
                }
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async validateTrustAction(req, res) {
        try {
            const { address, action, amount } = req.body;

            const currentScore = this.trustScores.get(address) || this.calculateInitialTrustScore(address);
            const actionRisk = this.calculateActionRisk(action, amount);
            const isValid = currentScore >= actionRisk;

            res.json({
                address,
                action,
                amount,
                currentTrustScore: currentScore,
                actionRisk,
                isValid,
                recommendation: isValid ? 'approved' : 'requires_additional_trust'
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async bulkUpdateTrustScores(req, res) {
        try {
            const { updates } = req.body;

            if (!Array.isArray(updates)) {
                return res.status(400).json({ error: 'Updates must be an array' });
            }

            const results = [];
            for (const update of updates) {
                const { address, score, action } = update;
                this.trustScores.set(address, Math.max(0, Math.min(1, score)));
                results.push({ address, newScore: score, action });
            }

            await this.saveData();

            res.json({
                success: true,
                updated: results.length,
                results
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Helper methods
    calculateInitialTrustScore(address) {
        // Create a deterministic but varied initial score based on address
        const hash = crypto.createHash('md5').update(address).digest('hex');
        const score = (parseInt(hash.substring(0, 8), 16) % 60 + 20) / 100; // 0.2 to 0.8 range
        return score;
    }

    applyActionScoring(score, actions) {
        for (const action of actions) {
            switch (action.type) {
                case 'successful_transaction':
                    score += 0.01;
                    break;
                case 'failed_transaction':
                    score -= 0.02;
                    break;
                case 'environmental_contribution':
                    score += 0.005;
                    break;
                case 'community_participation':
                    score += 0.003;
                    break;
            }
        }
        return score;
    }

    applyEnvironmentalFactor(score, factor) {
        // Environmental factors can boost trust by up to 20%
        const boost = factor * 0.2;
        return Math.min(1, score + boost);
    }

    async applyDelegationFactors(address, score) {
        const delegations = Array.from(this.delegations.values())
            .filter(d => d.toAddress === address && d.isActive);

        for (const delegation of delegations) {
            const delegatorScore = this.trustScores.get(delegation.fromAddress) || this.calculateInitialTrustScore(delegation.fromAddress);
            const delegationBoost = delegatorScore * delegation.amount * 0.1; // Max 10% boost per delegation
            score += delegationBoost;
        }

        return Math.min(1, score);
    }

    async updateDelegatedTrustScores() {
        // Recalculate all trust scores affected by delegations
        const allAddresses = new Set([
            ...Array.from(this.trustScores.keys()),
            ...Array.from(this.delegations.values()).flatMap(d => [d.fromAddress, d.toAddress])
        ]);

        for (const address of allAddresses) {
            const currentScore = this.trustScores.get(address) || this.calculateInitialTrustScore(address);
            const newScore = await this.applyDelegationFactors(address, currentScore);
            this.trustScores.set(address, newScore);
        }
    }

    validateEnvironmentalData(data) {
        // Basic validation - ensure data is reasonable
        if (typeof data !== 'object') return false;
        if (typeof data.value !== 'number' || data.value < 0 || data.value > 1) return false;
        if (!data.source || typeof data.source !== 'string') return false;
        return true;
    }

    async applyEnvironmentalTrustBonus(address, data) {
        const currentScore = this.trustScores.get(address) || this.calculateInitialTrustScore(address);
        const bonus = data.value * 0.05; // Up to 5% bonus for environmental contribution
        const newScore = Math.min(1, currentScore + bonus);
        this.trustScores.set(address, newScore);
    }

    calculateActionRisk(action, amount) {
        const riskLevels = {
            'low_value_transaction': 0.1,
            'high_value_transaction': 0.3,
            'governance_vote': 0.2,
            'contract_deployment': 0.4,
            'large_transfer': 0.5
        };
        return riskLevels[action] || 0.2;
    }

    generateDelegationId(fromAddress, toAddress) {
        const timestamp = Date.now();
        const hash = crypto.createHash('md5').update(`${fromAddress}_${toAddress}_${timestamp}`).digest('hex');
        return `del_${hash.substring(0, 16)}`;
    }

    start() {
        this.app.listen(this.port, () => {
            console.log(`🚀 Trust Engine Service running on port ${this.port}`);
            console.log(`📊 Loaded ${this.trustScores.size} trust scores`);
            console.log(`🔗 Loaded ${this.delegations.size} delegations`);
        });
    }
}

// Start the service if this file is run directly
if (require.main === module) {
    const service = new TrustEngineService();
    service.start();
}

module.exports = TrustEngineService;


