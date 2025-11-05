import { BiometricService } from '../src/services/BiometricService';

// Mock expo-local-authentication
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  supportedAuthenticationTypesAsync: jest.fn(),
  authenticateAsync: jest.fn(),
}));

// Mock AsyncStorage and react-native-keychain
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

jest.mock('react-native-keychain', () => ({
  setInternetCredentials: jest.fn(),
  getInternetCredentials: jest.fn(),
  resetInternetCredentials: jest.fn(),
}));

describe('BiometricService', () => {
  let biometricService: BiometricService;
  let mockLocalAuth: any;

  beforeEach(() => {
    biometricService = BiometricService.getInstance();
    mockLocalAuth = require('expo-local-authentication');
    jest.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    test('should return the same instance', () => {
      const instance1 = BiometricService.getInstance();
      const instance2 = BiometricService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Initialization', () => {
    test('should initialize service successfully', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([1, 2]); // FINGERPRINT, FACIAL_RECOGNITION

      await biometricService.initialize();

      expect(mockLocalAuth.hasHardwareAsync).toHaveBeenCalled();
      expect(mockLocalAuth.isEnrolledAsync).toHaveBeenCalled();
      expect(mockLocalAuth.supportedAuthenticationTypesAsync).toHaveBeenCalled();
    });

    test('should handle hardware not available', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(false);

      await biometricService.initialize();

      expect(biometricService['hardwareAvailable']).toBe(false);
    });

    test('should handle no biometric enrollment', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(false);

      await biometricService.initialize();

      expect(biometricService['biometricEnrolled']).toBe(false);
    });
  });

  describe('Biometric Availability', () => {
    test('should check if biometric is available', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);

      await biometricService.initialize();
      const isAvailable = await biometricService.isBiometricAvailable();

      expect(isAvailable).toBe(true);
    });

    test('should return false when hardware not available', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(false);

      await biometricService.initialize();
      const isAvailable = await biometricService.isBiometricAvailable();

      expect(isAvailable).toBe(false);
    });

    test('should return false when not enrolled', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(false);

      await biometricService.initialize();
      const isAvailable = await biometricService.isBiometricAvailable();

      expect(isAvailable).toBe(false);
    });
  });

  describe('Supported Biometric Types', () => {
    test('should return supported biometric types', async () => {
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([1, 2]);

      await biometricService.initialize();
      const types = await biometricService.getSupportedBiometricTypes();

      expect(types).toContain('fingerprint');
      expect(types).toContain('facial_recognition');
    });

    test('should handle no supported types', async () => {
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([]);

      await biometricService.initialize();
      const types = await biometricService.getSupportedBiometricTypes();

      expect(types).toEqual([]);
    });
  });

  describe('Authentication', () => {
    beforeEach(async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
      await biometricService.initialize();
    });

    test('should authenticate successfully', async () => {
      mockLocalAuth.authenticateAsync.mockResolvedValue({ success: true });

      const result = await biometricService.authenticate('Test authentication');

      expect(result).toBe(true);
      expect(mockLocalAuth.authenticateAsync).toHaveBeenCalledWith({
        promptMessage: 'Test authentication',
        fallbackLabel: undefined,
        disableDeviceFallback: true,
        cancelLabel: 'Cancel'
      });
    });

    test('should fail authentication', async () => {
      mockLocalAuth.authenticateAsync.mockResolvedValue({ success: false });

      const result = await biometricService.authenticate('Test authentication');

      expect(result).toBe(false);
    });

    test('should skip authentication when disabled', async () => {
      await biometricService.disableBiometric();

      const result = await biometricService.authenticate('Test authentication');

      expect(result).toBe(true); // Should skip and return true
      expect(mockLocalAuth.authenticateAsync).not.toHaveBeenCalled();
    });

    test('should handle authentication errors', async () => {
      mockLocalAuth.authenticateAsync.mockRejectedValue(new Error('Authentication error'));

      const result = await biometricService.authenticate('Test authentication');

      expect(result).toBe(false);
    });

    test('should use fallback when enabled', async () => {
      await biometricService.setFallbackConfig({ enabled: true, type: 'pin' });
      mockLocalAuth.authenticateAsync.mockResolvedValue({ success: true });

      await biometricService.authenticate('Test authentication');

      expect(mockLocalAuth.authenticateAsync).toHaveBeenCalledWith({
        promptMessage: 'Test authentication',
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: false,
        cancelLabel: 'Cancel'
      });
    });
  });

  describe('Biometric Configuration', () => {
    test('should enable biometric authentication', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);

      await biometricService.initialize();
      const success = await biometricService.enableBiometric();

      expect(success).toBe(true);
      expect(biometricService['config'].enabled).toBe(true);
    });

    test('should fail to enable when hardware not available', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(false);

      await biometricService.initialize();
      const success = await biometricService.enableBiometric();

      expect(success).toBe(false);
    });

    test('should disable biometric authentication', async () => {
      await biometricService.disableBiometric();

      expect(biometricService['config'].enabled).toBe(false);
    });

    test('should check if biometric is enabled', async () => {
      await biometricService.enableBiometric();
      const isEnabled = await biometricService.isEnabled();

      expect(isEnabled).toBe(true);
    });

    test('should set fallback configuration', async () => {
      const fallbackConfig = {
        enabled: true,
        type: 'password',
        maxAttempts: 3
      };

      await biometricService.setFallbackConfig(fallbackConfig);
      const config = await biometricService.getConfig();

      expect(config.fallback).toEqual(fallbackConfig);
    });
  });

  describe('PIN Management', () => {
    test('should set PIN successfully', async () => {
      const pin = '1234';
      await biometricService.setPin(pin);

      const isValid = await biometricService.validatePin(pin);
      expect(isValid).toBe(true);
    });

    test('should validate correct PIN', async () => {
      const pin = '5678';
      await biometricService.setPin(pin);

      const isValid = await biometricService.validatePin(pin);
      expect(isValid).toBe(true);
    });

    test('should reject incorrect PIN', async () => {
      const pin = '1234';
      await biometricService.setPin(pin);

      const isValid = await biometricService.validatePin('5678');
      expect(isValid).toBe(false);
    });

    test('should handle PIN validation errors', async () => {
      const mockGetItem = require('@react-native-async-storage/async-storage').getItem;
      mockGetItem.mockRejectedValue(new Error('Storage error'));

      const isValid = await biometricService.validatePin('1234');
      expect(isValid).toBe(false);
    });
  });

  describe('Password Management', () => {
    test('should set password successfully', async () => {
      const password = 'securePassword123';
      await biometricService.setPassword(password);

      const isValid = await biometricService.validatePassword(password);
      expect(isValid).toBe(true);
    });

    test('should validate correct password', async () => {
      const password = 'mySecurePassword';
      await biometricService.setPassword(password);

      const isValid = await biometricService.validatePassword(password);
      expect(isValid).toBe(true);
    });

    test('should reject incorrect password', async () => {
      const password = 'correctPassword';
      await biometricService.setPassword(password);

      const isValid = await biometricService.validatePassword('wrongPassword');
      expect(isValid).toBe(false);
    });

    test('should handle password validation errors', async () => {
      const mockGetCredentials = require('react-native-keychain').getInternetCredentials;
      mockGetCredentials.mockRejectedValue(new Error('Keychain error'));

      const isValid = await biometricService.validatePassword('testPassword');
      expect(isValid).toBe(false);
    });
  });

  describe('Configuration Management', () => {
    test('should get current configuration', async () => {
      const config = await biometricService.getConfig();

      expect(config).toBeDefined();
      expect(config.enabled).toBeDefined();
      expect(config.fallback).toBeDefined();
    });

    test('should load configuration from storage', async () => {
      const mockGetItem = require('@react-native-async-storage/async-storage').getItem;
      mockGetItem.mockResolvedValue(JSON.stringify({
        enabled: true,
        fallback: { enabled: true, type: 'pin' }
      }));

      await biometricService['loadConfig']();
      const config = await biometricService.getConfig();

      expect(config.enabled).toBe(true);
      expect(config.fallback.enabled).toBe(true);
    });

    test('should save configuration to storage', async () => {
      const mockSetItem = require('@react-native-async-storage/async-storage').setItem;
      mockSetItem.mockResolvedValue(undefined);

      await biometricService.enableBiometric();
      await biometricService['saveConfig']();

      expect(mockSetItem).toHaveBeenCalled();
    });

    test('should handle configuration load errors', async () => {
      const mockGetItem = require('@react-native-async-storage/async-storage').getItem;
      mockGetItem.mockRejectedValue(new Error('Storage error'));

      await biometricService['loadConfig']();
      const config = await biometricService.getConfig();

      // Should use default configuration
      expect(config.enabled).toBe(false);
    });
  });

  describe('Storage Operations', () => {
    test('should store PIN securely', async () => {
      const mockSetItem = require('@react-native-async-storage/async-storage').setItem;
      mockSetItem.mockResolvedValue(undefined);

      await biometricService['storePin']('1234');

      expect(mockSetItem).toHaveBeenCalledWith('biometric_pin', expect.any(String));
    });

    test('should retrieve stored PIN', async () => {
      const mockGetItem = require('@react-native-async-storage/async-storage').getItem;
      mockGetItem.mockResolvedValue('hashed_pin_data');

      const storedPin = await biometricService['getStoredPin']();

      expect(storedPin).toBe('hashed_pin_data');
    });

    test('should store password in keychain', async () => {
      const mockSetCredentials = require('react-native-keychain').setInternetCredentials;
      mockSetCredentials.mockResolvedValue(undefined);

      await biometricService['storePassword']('securePassword');

      expect(mockSetCredentials).toHaveBeenCalledWith(
        'biometric_password',
        'zippycoin_wallet',
        expect.any(String)
      );
    });

    test('should retrieve stored password', async () => {
      const mockGetCredentials = require('react-native-keychain').getInternetCredentials;
      mockGetCredentials.mockResolvedValue({ password: 'encrypted_password' });

      const storedPassword = await biometricService['getStoredPassword']();

      expect(storedPassword).toBe('encrypted_password');
    });
  });

  describe('Error Handling', () => {
    test('should handle initialization errors gracefully', async () => {
      mockLocalAuth.hasHardwareAsync.mockRejectedValue(new Error('Hardware check failed'));

      await expect(biometricService.initialize()).resolves.not.toThrow();
    });

    test('should handle authentication errors gracefully', async () => {
      mockLocalAuth.authenticateAsync.mockRejectedValue(new Error('Authentication failed'));

      const result = await biometricService.authenticate('Test');
      expect(result).toBe(false);
    });

    test('should handle storage errors gracefully', async () => {
      const mockSetItem = require('@react-native-async-storage/async-storage').setItem;
      mockSetItem.mockRejectedValue(new Error('Storage failed'));

      await expect(biometricService.enableBiometric()).resolves.not.toThrow();
    });

    test('should handle keychain errors gracefully', async () => {
      const mockSetCredentials = require('react-native-keychain').setInternetCredentials;
      mockSetCredentials.mockRejectedValue(new Error('Keychain failed'));

      await expect(biometricService.setPassword('test')).resolves.not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    test('should complete full authentication flow', async () => {
      // Setup
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
      mockLocalAuth.authenticateAsync.mockResolvedValue({ success: true });

      // Initialize
      await biometricService.initialize();
      expect(await biometricService.isBiometricAvailable()).toBe(true);

      // Enable biometric
      const enableSuccess = await biometricService.enableBiometric();
      expect(enableSuccess).toBe(true);

      // Set fallback
      await biometricService.setFallbackConfig({ enabled: true, type: 'pin' });
      await biometricService.setPin('1234');

      // Authenticate
      const authResult = await biometricService.authenticate('Test flow');
      expect(authResult).toBe(true);

      // Verify configuration
      const config = await biometricService.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.fallback.enabled).toBe(true);
    });

    test('should handle fallback authentication flow', async () => {
      // Setup with fallback
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
      mockLocalAuth.authenticateAsync.mockResolvedValue({ success: false }); // Biometric fails

      await biometricService.initialize();
      await biometricService.enableBiometric();
      await biometricService.setFallbackConfig({ enabled: true, type: 'pin' });
      await biometricService.setPin('5678');

      // Authentication should fail (biometric fails, no fallback handling in mock)
      const result = await biometricService.authenticate('Test fallback');
      expect(result).toBe(false);
    });
  });
});
