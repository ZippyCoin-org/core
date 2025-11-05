#!/usr/bin/env node
/**
 * ZippyCoin Transaction Service
 * Handles transaction creation, validation, and processing
 */

const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');

class TransactionService {
    constructor() {
        this.app = express();
        this.port = process.env.TRANSACTION_PORT || 3003;
        this.transactions = new Map();
        this.pendingTransactions = new Map();
        this.trustEngineUrl = process.env.TRUST_ENGINE_URL || 'http://localhost:3002';
        this.dataFile = path.join(__dirname, 'transaction-data.json');
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
                service: 'transaction-service',
                timestamp: new Date().toISOString(),
                pending_transactions: this.pendingTransactions.size,
                total_transactions: this.transactions.size
            });
        });

        // Transaction endpoints
        this.app.post('/api/transaction/create', this.createTransaction.bind(this));
        this.app.get('/api/transaction/:id', this.getTransaction.bind(this));
        this.app.get('/api/transactions/:address', this.getAddressTransactions.bind(this));
        this.app.post('/api/transaction/:id/process', this.processTransaction.bind(this));
        this.app.get('/api/transactions/pending', this.getPendingTransactions.bind(this));

        // Fee calculation endpoints
        this.app.post('/api/transaction/calculate-fee', this.calculateFee.bind(this));
        this.app.get('/api/fees', this.getFeeStructure.bind(this));

        // Batch transaction endpoints
        this.app.post('/api/transaction/batch', this.createBatchTransaction.bind(this));
        this.app.post('/api/transaction/batch/process', this.processBatchTransactions.bind(this));
    }

    async loadData() {
        try {
            const data = await fs.readFile(this.dataFile, 'utf8');
            const parsed = JSON.parse(data);
            this.transactions = new Map(Object.entries(parsed.transactions || {}));
            this.pendingTransactions = new Map(Object.entries(parsed.pendingTransactions || {}));
            console.log('Transaction data loaded successfully');
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('Error loading transaction data:', error);
            }
            console.log('No existing transaction data found, starting fresh');
        }
    }

    async saveData() {
        try {
            const data = {
                transactions: Object.fromEntries(this.transactions),
                pendingTransactions: Object.fromEntries(this.pendingTransactions),
                lastUpdated: new Date().toISOString()
            };
            await fs.writeFile(this.dataFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Error saving transaction data:', error);
        }
    }

    // Transaction creation methods
    async createTransaction(req, res) {
        try {
            const { fromAddress, toAddress, amount, transactionType = 'standard', data } = req.body;

            if (!fromAddress || !toAddress || typeof amount !== 'number') {
                return res.status(400).json({ error: 'Invalid transaction parameters' });
            }

            if (amount <= 0) {
                return res.status(400).json({ error: 'Transaction amount must be positive' });
            }

            // Get trust score for fee calculation
            const trustScore = await this.getTrustScore(fromAddress);

            // Calculate fee based on transaction type and trust score
            const fee = this.calculateTransactionFee(amount, transactionType, trustScore);

            // Validate transaction with trust engine
            const trustValidation = await this.validateWithTrustEngine(fromAddress, transactionType, amount);

            if (!trustValidation.isValid) {
                return res.status(403).json({
                    error: 'Transaction blocked by trust validation',
                    reason: trustValidation.recommendation,
                    requiredTrustScore: trustValidation.actionRisk
                });
            }

            const transaction = {
                id: this.generateTransactionId(),
                fromAddress,
                toAddress,
                amount,
                fee,
                transactionType,
                data: data || {},
                trustScore,
                status: 'pending',
                createdAt: new Date().toISOString(),
                trustValidation
            };

            this.pendingTransactions.set(transaction.id, transaction);

            await this.saveData();

            res.json({
                success: true,
                transaction,
                message: 'Transaction created successfully'
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getTransaction(req, res) {
        try {
            const { id } = req.params;

            const transaction = this.transactions.get(id) || this.pendingTransactions.get(id);

            if (!transaction) {
                return res.status(404).json({ error: 'Transaction not found' });
            }

            res.json({ transaction });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getAddressTransactions(req, res) {
        try {
            const { address } = req.params;
            const { status = 'all', limit = 50 } = req.query;

            let transactions = [];

            if (status === 'all' || status === 'confirmed') {
                const confirmed = Array.from(this.transactions.values())
                    .filter(tx => tx.fromAddress === address || tx.toAddress === address);
                transactions.push(...confirmed);
            }

            if (status === 'all' || status === 'pending') {
                const pending = Array.from(this.pendingTransactions.values())
                    .filter(tx => tx.fromAddress === address || tx.toAddress === address);
                transactions.push(...pending);
            }

            // Sort by creation date (newest first) and limit
            transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            transactions = transactions.slice(0, parseInt(limit));

            res.json({
                address,
                transactions,
                total: transactions.length
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async processTransaction(req, res) {
        try {
            const { id } = req.params;
            const { force = false } = req.body;

            const transaction = this.pendingTransactions.get(id);
            if (!transaction) {
                return res.status(404).json({ error: 'Transaction not found or already processed' });
            }

            // Simulate transaction processing
            const processingResult = await this.simulateTransactionProcessing(transaction);

            if (processingResult.success || force) {
                // Move to confirmed transactions
                transaction.status = 'confirmed';
                transaction.processedAt = new Date().toISOString();
                transaction.blockHash = processingResult.blockHash;
                transaction.confirmations = 1;

                this.transactions.set(id, transaction);
                this.pendingTransactions.delete(id);

                await this.saveData();

                res.json({
                    success: true,
                    transaction,
                    processingResult
                });
            } else {
                res.status(400).json({
                    error: 'Transaction processing failed',
                    reason: processingResult.error
                });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getPendingTransactions(req, res) {
        try {
            const transactions = Array.from(this.pendingTransactions.values());

            res.json({
                pending: transactions.length,
                transactions
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Fee calculation methods
    async calculateFee(req, res) {
        try {
            const { fromAddress, amount, transactionType = 'standard' } = req.body;

            if (!fromAddress || typeof amount !== 'number') {
                return res.status(400).json({ error: 'Invalid parameters' });
            }

            const trustScore = await this.getTrustScore(fromAddress);
            const fee = this.calculateTransactionFee(amount, transactionType, trustScore);

            res.json({
                fromAddress,
                amount,
                transactionType,
                trustScore,
                calculatedFee: fee,
                feeDiscount: this.calculateFeeDiscount(trustScore)
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    getFeeStructure(req, res) {
        try {
            const feeStructure = {
                micro: {
                    baseFee: 10,
                    description: 'Microtransactions (edge network)',
                    maxAmount: 10000
                },
                standard: {
                    baseFee: 100,
                    description: 'Standard transactions (main chain)',
                    minAmount: 10000
                },
                priority: {
                    baseFee: 500,
                    description: 'High-priority transactions',
                    processingTime: '< 30 seconds'
                },
                trustDiscounts: {
                    '0.0-0.3': '0% discount',
                    '0.3-0.6': '20% discount',
                    '0.6-0.8': '40% discount',
                    '0.8-1.0': '60% discount'
                }
            };

            res.json({ feeStructure });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Batch transaction methods
    async createBatchTransaction(req, res) {
        try {
            const { transactions } = req.body;

            if (!Array.isArray(transactions) || transactions.length === 0) {
                return res.status(400).json({ error: 'Invalid batch transaction data' });
            }

            if (transactions.length > 100) {
                return res.status(400).json({ error: 'Batch size cannot exceed 100 transactions' });
            }

            const batchId = this.generateBatchId();
            const batchTransactions = [];

            for (const txData of transactions) {
                const transaction = {
                    id: this.generateTransactionId(),
                    batchId,
                    ...txData,
                    status: 'pending',
                    createdAt: new Date().toISOString()
                };
                batchTransactions.push(transaction);
                this.pendingTransactions.set(transaction.id, transaction);
            }

            await this.saveData();

            res.json({
                success: true,
                batchId,
                transactions: batchTransactions,
                total: batchTransactions.length
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async processBatchTransactions(req, res) {
        try {
            const { batchId } = req.body;

            const batchTransactions = Array.from(this.pendingTransactions.values())
                .filter(tx => tx.batchId === batchId);

            if (batchTransactions.length === 0) {
                return res.status(404).json({ error: 'No transactions found for this batch' });
            }

            const results = [];
            let successCount = 0;

            for (const transaction of batchTransactions) {
                try {
                    const processingResult = await this.simulateTransactionProcessing(transaction);

                    if (processingResult.success) {
                        transaction.status = 'confirmed';
                        transaction.processedAt = new Date().toISOString();
                        transaction.blockHash = processingResult.blockHash;
                        transaction.confirmations = 1;

                        this.transactions.set(transaction.id, transaction);
                        this.pendingTransactions.delete(transaction.id);
                        successCount++;
                    }

                    results.push({
                        transactionId: transaction.id,
                        success: processingResult.success,
                        error: processingResult.error
                    });
                } catch (error) {
                    results.push({
                        transactionId: transaction.id,
                        success: false,
                        error: error.message
                    });
                }
            }

            await this.saveData();

            res.json({
                success: true,
                batchId,
                processed: results.length,
                successful: successCount,
                failed: results.length - successCount,
                results
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Helper methods
    async getTrustScore(address) {
        try {
            const response = await axios.get(`${this.trustEngineUrl}/api/trust/score/${address}`, {
                timeout: 5000
            });
            return response.data.trustScore || 0.5;
        } catch (error) {
            console.warn(`Failed to get trust score for ${address}:`, error.message);
            return 0.5; // Default trust score
        }
    }

    async validateWithTrustEngine(address, action, amount) {
        try {
            const response = await axios.post(`${this.trustEngineUrl}/api/trust/validate`, {
                address,
                action,
                amount
            }, {
                timeout: 5000
            });
            return response.data;
        } catch (error) {
            console.warn(`Trust validation failed for ${address}:`, error.message);
            return { isValid: true, actionRisk: 0.2 }; // Default to valid
        }
    }

    calculateTransactionFee(amount, transactionType, trustScore) {
        const baseFees = {
            micro: 10,
            standard: 100,
            priority: 500
        };

        const baseFee = baseFees[transactionType] || baseFees.standard;

        // Apply trust-based discount
        const discount = this.calculateFeeDiscount(trustScore);
        const discountedFee = baseFee * (1 - discount);

        // Apply amount-based scaling for large transactions
        const amountMultiplier = Math.max(1, Math.log10(amount / 1000));

        return Math.ceil(discountedFee * amountMultiplier);
    }

    calculateFeeDiscount(trustScore) {
        if (trustScore >= 0.8) return 0.6;
        if (trustScore >= 0.6) return 0.4;
        if (trustScore >= 0.3) return 0.2;
        return 0;
    }

    async simulateTransactionProcessing(transaction) {
        // Simulate network latency and processing
        await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100));

        // Simulate occasional failures (5% failure rate)
        if (Math.random() < 0.05) {
            return {
                success: false,
                error: 'Network congestion',
                blockHash: null
            };
        }

        return {
            success: true,
            blockHash: `0x${crypto.randomBytes(32).toString('hex')}`,
            processingTime: Math.random() * 5000 + 1000
        };
    }

    generateTransactionId() {
        const timestamp = Date.now();
        const random = crypto.randomBytes(8).toString('hex');
        return `tx_${timestamp}_${random}`;
    }

    generateBatchId() {
        const timestamp = Date.now();
        const random = crypto.randomBytes(4).toString('hex');
        return `batch_${timestamp}_${random}`;
    }

    start() {
        this.app.listen(this.port, () => {
            console.log(`🚀 Transaction Service running on port ${this.port}`);
            console.log(`📊 Loaded ${this.transactions.size} transactions`);
            console.log(`⏳ ${this.pendingTransactions.size} pending transactions`);
        });
    }
}

// Start the service if this file is run directly
if (require.main === module) {
    const service = new TransactionService();
    service.start();
}

module.exports = TransactionService;


