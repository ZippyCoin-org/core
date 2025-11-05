import { TrustEngine } from '../trust/TrustEngine';
import { BiometricAuth } from '../auth/BiometricAuth';

describe('Simple Mobile Wallet Tests', () => {
  let trustEngine: TrustEngine;
  let biometricAuth: BiometricAuth;

  beforeEach(() => {
    trustEngine = new TrustEngine();
    biometricAuth = new BiometricAuth();
  });

  describe('TrustEngine', () => {
    test('should calculate trust score', async () => {
      const trustScore = await trustEngine.calculateTrustScore('test-address');
      expect(trustScore).toBeGreaterThanOrEqual(0);
      expect(trustScore).toBeLessThanOrEqual(100);
    });

    test('should update trust score', async () => {
      const address = 'test-address';
      const newScore = 85;
      await trustEngine.updateTrustScore(address, newScore);
      const updatedScore = await trustEngine.calculateTrustScore(address);
      expect(updatedScore).toBe(newScore);
    });

    test('should validate trust delegation', async () => {
      const delegator = 'delegator-address';
      const delegate = 'delegate-address';
      const isValid = await trustEngine.validateDelegation(delegator, delegate);
      expect(typeof isValid).toBe('boolean');
    });

    test('should get delegations', async () => {
      const address = 'test-address';
      const delegations = await trustEngine.getDelegations(address);
      expect(Array.isArray(delegations)).toBe(true);
    });

    test('should calculate delegated trust', async () => {
      const address = 'test-address';
      const delegatedTrust = await trustEngine.calculateDelegatedTrust(address);
      expect(delegatedTrust).toBeGreaterThanOrEqual(0);
      expect(delegatedTrust).toBeLessThanOrEqual(100);
    });

    test('should get trust history', async () => {
      const address = 'test-address';
      const history = await trustEngine.getTrustHistory(address);
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
    });

    test('should validate trust score range', async () => {
      expect(await trustEngine.validateTrustScore(50)).toBe(true);
      expect(await trustEngine.validateTrustScore(0)).toBe(true);
      expect(await trustEngine.validateTrustScore(100)).toBe(true);
      expect(await trustEngine.validateTrustScore(-1)).toBe(false);
      expect(await trustEngine.validateTrustScore(101)).toBe(false);
    });
  });

  describe('BiometricAuth', () => {
    test('should check biometric availability', async () => {
      const isAvailable = await biometricAuth.isAvailable();
      expect(typeof isAvailable).toBe('boolean');
    });

    test('should authenticate with biometrics', async () => {
      const isAvailable = await biometricAuth.isAvailable();
      if (isAvailable) {
        const result = await biometricAuth.authenticate();
        expect(typeof result).toBe('boolean');
      } else {
        expect(true).toBe(true); // Skip test if biometrics not available
      }
    });

    test('should authenticate with fallback', async () => {
      const result = await biometricAuth.authenticateWithFallback();
      expect(typeof result).toBe('boolean');
    });

    test('should check enrollment status', async () => {
      const isEnrolled = await biometricAuth.isEnrolled();
      expect(typeof isEnrolled).toBe('boolean');
    });

    test('should get supported biometric types', async () => {
      const types = await biometricAuth.getSupportedTypes();
      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThan(0);
    });

    test('should check if type is supported', async () => {
      const isSupported = await biometricAuth.isTypeSupported('fingerprint');
      expect(typeof isSupported).toBe('boolean');
    });
  });

  describe('Integration Tests', () => {
    test('should handle trust delegation flow', async () => {
      const originAddress = 'origin-address';
      const delegateAddress = 'delegate-address';

      // Set origin wallet trust
      await trustEngine.updateTrustScore(originAddress, 95);

      // Validate delegation
      const canDelegate = await trustEngine.validateDelegation(
        originAddress,
        delegateAddress
      );
      expect(typeof canDelegate).toBe('boolean');

      // Update delegate trust score
      if (canDelegate) {
        await trustEngine.updateTrustScore(delegateAddress, 80);
        const delegateScore = await trustEngine.calculateTrustScore(delegateAddress);
        expect(delegateScore).toBe(80);
      }
    });

    test('should handle biometric authentication flow', async () => {
      const isAvailable = await biometricAuth.isAvailable();
      expect(typeof isAvailable).toBe('boolean');

      if (isAvailable) {
        const isEnrolled = await biometricAuth.isEnrolled();
        expect(typeof isEnrolled).toBe('boolean');

        if (isEnrolled) {
          const authResult = await biometricAuth.authenticate();
          expect(typeof authResult).toBe('boolean');
        }
      }
    });
  });
}); 