import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';
import { ethers } from 'ethers';
import { TrustEngine } from '../../shared/src/trust-sdk';
import { ComplianceEngine } from './compliance-engine';
import { AuditLogger } from './audit-logger';
import { RegulatoryReporter } from './regulatory-reporter';
import { RiskAnalyzer } from './risk-analyzer';

const app = express();
const PORT = process.env.PORT || 3004;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Initialize services
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const trustEngine = new TrustEngine();
const complianceEngine = new ComplianceEngine(supabase, trustEngine);
const auditLogger = new AuditLogger(supabase);
const regulatoryReporter = new RegulatoryReporter(supabase, complianceEngine);
const riskAnalyzer = new RiskAnalyzer(supabase, trustEngine);

// ============ COMPLIANCE MONITORING ROUTES ============

/**
 * @route GET /api/v1/compliance/status
 * @desc Get overall compliance status
 */
app.get('/api/v1/compliance/status', async (req, res) => {
  try {
    const status = await complianceEngine.getComplianceStatus();
    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get compliance status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/v1/compliance/kyc
 * @desc Submit KYC information
 */
app.post('/api/v1/compliance/kyc', async (req, res) => {
  try {
    const { userId, kycData, level } = req.body;
    
    // Validate KYC data
    if (!userId || !kycData || !level) {
      return res.status(400).json({
        success: false,
        error: 'Missing required KYC data'
      });
    }
    
    const kycResult = await complianceEngine.submitKYC(userId, kycData, level);
    
    // Log audit trail
    await auditLogger.logEvent('kyc_submission', {
      userId,
      level,
      status: kycResult.status,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      data: kycResult,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to submit KYC',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/v1/compliance/kyc/:userId
 * @desc Get KYC status for a user
 */
app.get('/api/v1/compliance/kyc/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const kycStatus = await complianceEngine.getKYCStatus(userId);
    
    res.json({
      success: true,
      data: kycStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get KYC status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/v1/compliance/aml/check
 * @desc Perform AML check on transaction
 */
app.post('/api/v1/compliance/aml/check', async (req, res) => {
  try {
    const { transaction, userId, amount, destination } = req.body;
    
    const amlResult = await complianceEngine.performAMLCheck({
      transaction,
      userId,
      amount,
      destination,
      timestamp: new Date().toISOString()
    });
    
    // Log audit trail
    await auditLogger.logEvent('aml_check', {
      transaction,
      userId,
      amount,
      destination,
      result: amlResult.status,
      riskScore: amlResult.riskScore,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      data: amlResult,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to perform AML check',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/v1/compliance/audit-trail
 * @desc Get audit trail with filters
 */
app.get('/api/v1/compliance/audit-trail', async (req, res) => {
  try {
    const { 
      userId, 
      eventType, 
      startDate, 
      endDate, 
      limit = 100,
      offset = 0 
    } = req.query;
    
    const auditTrail = await auditLogger.getAuditTrail({
      userId: userId as string,
      eventType: eventType as string,
      startDate: startDate as string,
      endDate: endDate as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
    
    res.json({
      success: true,
      data: auditTrail,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get audit trail',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/v1/compliance/regulatory-report
 * @desc Generate regulatory report
 */
app.post('/api/v1/compliance/regulatory-report', async (req, res) => {
  try {
    const { 
      reportType, 
      jurisdiction, 
      startDate, 
      endDate,
      format = 'json' 
    } = req.body;
    
    const report = await regulatoryReporter.generateReport({
      reportType,
      jurisdiction,
      startDate,
      endDate,
      format
    });
    
    // Log audit trail
    await auditLogger.logEvent('regulatory_report_generated', {
      reportType,
      jurisdiction,
      startDate,
      endDate,
      format,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      data: report,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate regulatory report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/v1/compliance/risk-analysis
 * @desc Get risk analysis for user or transaction
 */
app.get('/api/v1/compliance/risk-analysis', async (req, res) => {
  try {
    const { userId, transactionId, riskType } = req.query;
    
    const riskAnalysis = await riskAnalyzer.analyzeRisk({
      userId: userId as string,
      transactionId: transactionId as string,
      riskType: riskType as string
    });
    
    res.json({
      success: true,
      data: riskAnalysis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to analyze risk',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/v1/compliance/selective-disclosure
 * @desc Create selective disclosure proof
 */
app.post('/api/v1/compliance/selective-disclosure', async (req, res) => {
  try {
    const { userId, disclosureType, requiredFields, proofData } = req.body;
    
    const disclosure = await complianceEngine.createSelectiveDisclosure({
      userId,
      disclosureType,
      requiredFields,
      proofData
    });
    
    // Log audit trail
    await auditLogger.logEvent('selective_disclosure_created', {
      userId,
      disclosureType,
      requiredFields,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      data: disclosure,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create selective disclosure',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/v1/compliance/metrics
 * @desc Get compliance metrics dashboard
 */
app.get('/api/v1/compliance/metrics', async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    const metrics = await complianceEngine.getComplianceMetrics(timeframe as string);
    
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get compliance metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============ HEALTH CHECK ============

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'compliance-monitor',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// ============ ERROR HANDLING ============

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Compliance Monitor Error:', err);
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// ============ START SERVER ============

app.listen(PORT, () => {
  console.log(`🚀 Compliance Monitor running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 API docs: http://localhost:${PORT}/api/v1/compliance/status`);
});

export default app;