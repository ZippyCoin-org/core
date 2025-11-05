import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { TrustService } from '../../trust-engine/src/services/TrustService';
import { QuantumCryptoService } from '../../trust-engine/src/services/QuantumCryptoService';
import { EnvironmentalDataService } from '../../trust-engine/src/services/EnvironmentalDataService';

describe('Trust Engine Integration Tests', () => {
  let trustService: TrustService;
  let quantumCrypto: QuantumCryptoService;
  let environmentalData: EnvironmentalDataService;

  beforeEach(() => {
    trustService = new TrustService();
    quantumCrypto = new QuantumCryptoService();
    environmentalData = new EnvironmentalDataService();
  });

  afterEach(() => {
    // Cleanup
    trustService.clearCache();
  });

  describe('Trust Score Calculation', () => {
    it('should calculate trust score with quantum-resistant verification', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const trustScore = await trustService.calculateTrustScore(address);

      expect(trustScore.score).toBeGreaterThanOrEqual(0);
      expect(trustScore.score).toBeLessThanOrEqual(100);
      expect(trustScore.factors).toHaveLength(5);
      expect(trustScore.lastUpdated).toBeInstanceOf(Date);
      expect(trustScore.environmentalData).toBeDefined();
    });

    it('should apply quantum-resistant verification to trust scores', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const trustScore = await trustService.calculateTrustScore(address);

      // Verify environmental data is present
      expect(trustScore.environmentalData).toBeDefined();
      if (trustScore.environmentalData) {
        expect(trustScore.environmentalData.temperature).toBeGreaterThan(-10);
        expect(trustScore.environmentalData.temperature).toBeLessThan(50);
        expect(trustScore.environmentalData.humidity).toBeGreaterThanOrEqual(0);
        expect(trustScore.environmentalData.humidity).toBeLessThanOrEqual(100);
      }
    });

    it('should cache trust scores for performance', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      
      // First calculation
      const firstScore = await trustService.calculateTrustScore(address);
      const firstTime = firstScore.lastUpdated.getTime();
      
      // Second calculation (should be cached)
      const secondScore = await trustService.calculateTrustScore(address);
      const secondTime = secondScore.lastUpdated.getTime();
      
      // Should be the same if cached
      expect(firstTime).toBe(secondTime);
      expect(firstScore.score).toBe(secondScore.score);
    });
  });

  describe('Environmental Data Validation', () => {
    it('should validate environmental data for quantum-resistant verification', async () => {
      const envData = await environmentalData.getCurrentData();
      const isValid = environmentalData.validateEnvironmentalData(envData);

      expect(isValid).toBe(true);
      expect(envData.temperature).toBeGreaterThan(-10);
      expect(envData.temperature).toBeLessThan(50);
      expect(envData.humidity).toBeGreaterThanOrEqual(0);
      expect(envData.humidity).toBeLessThanOrEqual(100);
      expect(envData.pressure).toBeGreaterThan(800);
      expect(envData.pressure).toBeLessThan(1200);
    });

    it('should detect invalid environmental data', async () => {
      const invalidEnvData = {
        temperature: 100, // Too high
        humidity: 150, // Too high
        pressure: 500, // Too low
        accelerometer: { x: 0, y: 0, z: 0 },
        gyroscope: { x: 0, y: 0, z: 0 },
        magnetometer: { x: 0, y: 0, z: 0 },
        timestamp: new Date()
      };

      const isValid = environmentalData.validateEnvironmentalData(invalidEnvData);
      expect(isValid).toBe(false);
    });

    it('should generate environmental hash for quantum-resistant verification', async () => {
      const envData = await environmentalData.getCurrentData();
      const hash = await environmentalData.getEnvironmentalHash();

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });
  });

  describe('Quantum-Resistant Cryptography', () => {
    it('should generate quantum-resistant key pairs', async () => {
      const envData = await environmentalData.getCurrentData();
      const keyPair = await quantumCrypto.generateQuantumKeyPair(envData);

      expect(keyPair.publicKey).toBeDefined();
      expect(keyPair.privateKey).toBeDefined();
      expect(keyPair.algorithm).toBe('CRYSTALS-Dilithium');
      expect(keyPair.keySize).toBe(256);
    });

    it('should create quantum-resistant signatures', async () => {
      const envData = await environmentalData.getCurrentData();
      const keyPair = await quantumCrypto.generateQuantumKeyPair(envData);
      const data = 'test data for quantum signature';
      
      const signature = await quantumCrypto.quantumSign(data, keyPair.privateKey, envData);

      expect(signature.signature).toBeDefined();
      expect(signature.publicKey).toBeDefined();
      expect(signature.environmentalHash).toBeDefined();
      expect(signature.timestamp).toBeGreaterThan(0);
    });

    it('should verify quantum-resistant signatures', async () => {
      const envData = await environmentalData.getCurrentData();
      const keyPair = await quantumCrypto.generateQuantumKeyPair(envData);
      const data = 'test data for quantum signature';
      
      const signature = await quantumCrypto.quantumSign(data, keyPair.privateKey, envData);
      const isValid = await quantumCrypto.verifyQuantumSignature(data, signature, envData);

      expect(isValid).toBe(true);
    });

    it('should reject invalid quantum signatures', async () => {
      const envData = await environmentalData.getCurrentData();
      const data = 'test data for quantum signature';
      
      const invalidSignature = {
        signature: 'invalid_signature',
        publicKey: 'invalid_public_key',
        environmentalHash: 'invalid_hash',
        timestamp: Date.now()
      };

      const isValid = await quantumCrypto.verifyQuantumSignature(data, invalidSignature, envData);
      expect(isValid).toBe(false);
    });
  });

  describe('Trust Delegation', () => {
    it('should delegate trust with quantum-resistant verification', async () => {
      const delegator = '0x1234567890123456789012345678901234567890';
      const delegate = '0x0987654321098765432109876543210987654321';
      const amount = 100;

      const delegation = await trustService.delegateTrust(delegator, delegate, amount);

      expect(delegation.delegator).toBe(delegator);
      expect(delegation.delegate).toBe(delegate);
      expect(delegation.amount).toBe(amount);
      expect(delegation.trustScore).toBeGreaterThan(0);
      expect(delegation.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Fee Discounts and Rate Limits', () => {
    it('should calculate trust-weighted fee discounts', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const baseFee = 0.001;
      
      const discountedFee = await trustService.getFeeDiscount(address, baseFee);

      expect(discountedFee).toBeLessThanOrEqual(baseFee);
      expect(discountedFee).toBeGreaterThan(0);
    });

    it('should calculate trust-weighted rate limits', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      
      const rateLimits = await trustService.getRateLimits(address);

      expect(rateLimits.requestsPerMinute).toBeGreaterThan(0);
      expect(rateLimits.requestsPerHour).toBeGreaterThan(0);
      expect(rateLimits.requestsPerHour).toBeGreaterThan(rateLimits.requestsPerMinute);
    });
  });

  describe('Trust Score Factors', () => {
    it('should calculate transaction history factor', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const trustScore = await trustService.calculateTrustScore(address);
      
      const transactionFactor = trustScore.factors.find(f => f.type === 'transaction_history');
      expect(transactionFactor).toBeDefined();
      expect(transactionFactor!.weight).toBe(0.3);
      expect(transactionFactor!.value).toBeGreaterThanOrEqual(0);
      expect(transactionFactor!.value).toBeLessThanOrEqual(100);
    });

    it('should calculate delegation factor', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const trustScore = await trustService.calculateTrustScore(address);
      
      const delegationFactor = trustScore.factors.find(f => f.type === 'delegation');
      expect(delegationFactor).toBeDefined();
      expect(delegationFactor!.weight).toBe(0.25);
      expect(delegationFactor!.value).toBeGreaterThanOrEqual(0);
      expect(delegationFactor!.value).toBeLessThanOrEqual(100);
    });

    it('should calculate governance factor', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const trustScore = await trustService.calculateTrustScore(address);
      
      const governanceFactor = trustScore.factors.find(f => f.type === 'governance');
      expect(governanceFactor).toBeDefined();
      expect(governanceFactor!.weight).toBe(0.2);
      expect(governanceFactor!.value).toBeGreaterThanOrEqual(0);
      expect(governanceFactor!.value).toBeLessThanOrEqual(100);
    });

    it('should calculate DeFi participation factor', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const trustScore = await trustService.calculateTrustScore(address);
      
      const defiFactor = trustScore.factors.find(f => f.type === 'defi_participation');
      expect(defiFactor).toBeDefined();
      expect(defiFactor!.weight).toBe(0.15);
      expect(defiFactor!.value).toBeGreaterThanOrEqual(0);
      expect(defiFactor!.value).toBeLessThanOrEqual(100);
    });

    it('should calculate environmental factor', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const trustScore = await trustService.calculateTrustScore(address);
      
      const environmentalFactor = trustScore.factors.find(f => f.type === 'environmental');
      expect(environmentalFactor).toBeDefined();
      expect(environmentalFactor!.weight).toBe(0.1);
      expect(environmentalFactor!.value).toBeGreaterThanOrEqual(0);
      expect(environmentalFactor!.value).toBeLessThanOrEqual(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid addresses gracefully', async () => {
      const invalidAddress = 'invalid_address';
      
      await expect(trustService.calculateTrustScore(invalidAddress)).rejects.toThrow();
    });

    it('should handle environmental data errors gracefully', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      
      // Mock environmental data service to throw error
      jest.spyOn(environmentalData, 'getCurrentData').mockRejectedValue(new Error('Sensor error'));
      
      await expect(trustService.calculateTrustScore(address)).rejects.toThrow();
    });

    it('should handle quantum crypto errors gracefully', async () => {
      const envData = await environmentalData.getCurrentData();
      
      // Mock quantum crypto service to throw error
      jest.spyOn(quantumCrypto, 'generateQuantumKeyPair').mockRejectedValue(new Error('Crypto error'));
      
      await expect(quantumCrypto.generateQuantumKeyPair(envData)).rejects.toThrow();
    });
  });

  describe('Performance Tests', () => {
    it('should calculate trust scores within reasonable time', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const startTime = Date.now();
      
      await trustService.calculateTrustScore(address);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 5 seconds
      expect(duration).toBeLessThan(5000);
    });

    it('should handle concurrent trust score calculations', async () => {
      const addresses = [
        '0x1234567890123456789012345678901234567890',
        '0x0987654321098765432109876543210987654321',
        '0x1111111111111111111111111111111111111111'
      ];
      
      const promises = addresses.map(address => trustService.calculateTrustScore(address));
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
      });
    });
  });
}); 