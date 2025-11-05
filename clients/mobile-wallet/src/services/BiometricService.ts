import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface BiometricConfig {
  enabled: boolean;
  type: 'fingerprint' | 'faceid' | 'both';
  fallbackEnabled: boolean;
  fallbackType: 'pin' | 'password';
}

export class BiometricService {
  private static instance: BiometricService;
  private config: BiometricConfig = {
    enabled: false,
    type: 'both',
    fallbackEnabled: true,
    fallbackType: 'pin'
  };

  static getInstance(): BiometricService {
    if (!BiometricService.instance) {
      BiometricService.instance = new BiometricService();
    }
    return BiometricService.instance;
  }

  async initialize(): Promise<void> {
    try {
      await this.loadConfig();
    } catch (error) {
      console.error('Failed to initialize biometric service:', error);
    }
  }

  async isBiometricAvailable(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return false;
    }
  }

  async getSupportedBiometricTypes(): Promise<string[]> {
    try {
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const typeNames = supportedTypes.map(type => {
        switch (type) {
          case LocalAuthentication.AuthenticationType.FINGERPRINT:
            return 'fingerprint';
          case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
            return 'faceid';
          case LocalAuthentication.AuthenticationType.IRIS:
            return 'iris';
          default:
            return 'unknown';
        }
      });
      return typeNames.filter(name => name !== 'unknown');
    } catch (error) {
      console.error('Error getting supported biometric types:', error);
      return [];
    }
  }

  async authenticate(reason: string = 'Authenticate to access your wallet'): Promise<boolean> {
    try {
      if (!this.config.enabled) {
        return true; // Skip authentication if not enabled
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        fallbackLabel: this.config.fallbackEnabled ? 'Use PIN' : undefined,
        disableDeviceFallback: !this.config.fallbackEnabled,
        cancelLabel: 'Cancel'
      });

      return result.success;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return false;
    }
  }

  async enableBiometric(type: 'fingerprint' | 'faceid' | 'both' = 'both'): Promise<boolean> {
    try {
      const isAvailable = await this.isBiometricAvailable();
      if (!isAvailable) {
        throw new Error('Biometric authentication not available on this device');
      }

      // Test authentication first
      const authenticated = await this.authenticate('Set up biometric authentication');
      if (!authenticated) {
        return false;
      }

      this.config.enabled = true;
      this.config.type = type;
      await this.saveConfig();

      return true;
    } catch (error) {
      console.error('Failed to enable biometric:', error);
      return false;
    }
  }

  async disableBiometric(): Promise<void> {
    try {
      this.config.enabled = false;
      await this.saveConfig();
    } catch (error) {
      console.error('Failed to disable biometric:', error);
      throw error;
    }
  }

  async setFallbackConfig(enabled: boolean, type: 'pin' | 'password' = 'pin'): Promise<void> {
    try {
      this.config.fallbackEnabled = enabled;
      this.config.fallbackType = type;
      await this.saveConfig();
    } catch (error) {
      console.error('Failed to set fallback config:', error);
      throw error;
    }
  }

  async getConfig(): Promise<BiometricConfig> {
    return { ...this.config };
  }

  async isEnabled(): Promise<boolean> {
    return this.config.enabled;
  }

  async validatePin(pin: string): Promise<boolean> {
    try {
      const storedPin = await this.getStoredPin();
      return storedPin === pin;
    } catch (error) {
      console.error('Failed to validate PIN:', error);
      return false;
    }
  }

  async setPin(pin: string): Promise<void> {
    try {
      await this.storePin(pin);
    } catch (error) {
      console.error('Failed to set PIN:', error);
      throw error;
    }
  }

  async validatePassword(password: string): Promise<boolean> {
    try {
      const storedPassword = await this.getStoredPassword();
      return storedPassword === password;
    } catch (error) {
      console.error('Failed to validate password:', error);
      return false;
    }
  }

  async setPassword(password: string): Promise<void> {
    try {
      await this.storePassword(password);
    } catch (error) {
      console.error('Failed to set password:', error);
      throw error;
    }
  }

  // Private helper methods
  private async loadConfig(): Promise<void> {
    try {
      const configData = await AsyncStorage.getItem('biometric-config');
      if (configData) {
        this.config = { ...this.config, ...JSON.parse(configData) };
      }
    } catch (error) {
      console.error('Failed to load biometric config:', error);
    }
  }

  private async saveConfig(): Promise<void> {
    try {
      await AsyncStorage.setItem('biometric-config', JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save biometric config:', error);
      throw error;
    }
  }

  private async storePin(pin: string): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        await Keychain.setInternetCredentials('zippycoin-pin', 'pin', pin);
      } else {
        await AsyncStorage.setItem('zippycoin-pin', pin);
      }
    } catch (error) {
      console.error('Failed to store PIN:', error);
      throw error;
    }
  }

  private async getStoredPin(): Promise<string | null> {
    try {
      if (Platform.OS === 'ios') {
        const credentials = await Keychain.getInternetCredentials('zippycoin-pin');
        return credentials?.password || null;
      } else {
        return await AsyncStorage.getItem('zippycoin-pin');
      }
    } catch (error) {
      console.error('Failed to get stored PIN:', error);
      return null;
    }
  }

  private async storePassword(password: string): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        await Keychain.setInternetCredentials('zippycoin-password', 'password', password);
      } else {
        await AsyncStorage.setItem('zippycoin-password', password);
      }
    } catch (error) {
      console.error('Failed to store password:', error);
      throw error;
    }
  }

  private async getStoredPassword(): Promise<string | null> {
    try {
      if (Platform.OS === 'ios') {
        const credentials = await Keychain.getInternetCredentials('zippycoin-password');
        return credentials?.password || null;
      } else {
        return await AsyncStorage.getItem('zippycoin-password');
      }
    } catch (error) {
      console.error('Failed to get stored password:', error);
      return null;
    }
  }
} 