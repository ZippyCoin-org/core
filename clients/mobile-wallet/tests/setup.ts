// Jest setup file for mobile wallet tests

// Global fetch mock
global.fetch = jest.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock AsyncStorage globally
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock react-native-keychain globally
jest.mock('react-native-keychain', () => ({
  setInternetCredentials: jest.fn(),
  getInternetCredentials: jest.fn(),
  resetInternetCredentials: jest.fn(),
}));

// Mock expo-local-authentication globally
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  supportedAuthenticationTypesAsync: jest.fn(),
  authenticateAsync: jest.fn(),
}));

// Mock crypto module for consistent testing
jest.mock('crypto', () => ({
  randomBytes: jest.fn(),
  createHash: jest.fn(),
  createHmac: jest.fn(),
  randomInt: jest.fn(),
}));

// Setup crypto mocks with proper typing
const crypto = require('crypto') as any;
crypto.randomBytes.mockReturnValue(Buffer.from('test-bytes-123456789012345678901234567890'));
crypto.randomInt.mockReturnValue(12345);

const mockHash = {
  update: jest.fn().mockReturnThis(),
  digest: jest.fn().mockReturnValue('mocked-hash-value'),
};
crypto.createHash.mockReturnValue(mockHash);

const mockHmac = {
  update: jest.fn().mockReturnThis(),
  digest: jest.fn().mockReturnValue('mocked-hmac-value'),
};
crypto.createHmac.mockReturnValue(mockHmac);

// Mock React Native modules that might be used
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
  },
}));

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    push: jest.fn(),
    pop: jest.fn(),
  })),
  useRoute: jest.fn(() => ({
    params: {},
  })),
}));

// Mock useColorScheme
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  default: jest.fn(() => 'light'),
}));

// Setup test environment
beforeEach(() => {
  jest.clearAllMocks();
  
  // Reset fetch mock
  (global.fetch as jest.Mock).mockReset();
  
  // Reset console mocks
  jest.clearAllMocks();
});

// Cleanup after tests
afterEach(() => {
  jest.clearAllMocks();
});

// Global test utilities
global.testUtils = {
  mockFetchResponse: (data: any, status = 200) => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: jest.fn().mockResolvedValue(data),
      text: jest.fn().mockResolvedValue(JSON.stringify(data)),
    });
  },
  
  mockFetchError: (error: string) => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error(error));
  },
  
  mockAsyncStorage: (key: string, value: any) => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    AsyncStorage.getItem.mockImplementation((k: string) => {
      if (k === key) {
        return Promise.resolve(typeof value === 'string' ? value : JSON.stringify(value));
      }
      return Promise.resolve(null);
    });
  },
  
  mockKeychain: (username: string, password: string) => {
    const Keychain = require('react-native-keychain');
    Keychain.getInternetCredentials.mockResolvedValue({
      username,
      password,
    });
  },
  
  mockBiometric: (success = true) => {
    const LocalAuthentication = require('expo-local-authentication');
    LocalAuthentication.hasHardwareAsync.mockResolvedValue(true);
    LocalAuthentication.isEnrolledAsync.mockResolvedValue(true);
    LocalAuthentication.authenticateAsync.mockResolvedValue({ success });
  },
};

// Type definitions for global test utilities
declare global {
  namespace NodeJS {
    interface Global {
      testUtils: {
        mockFetchResponse: (data: any, status?: number) => void;
        mockFetchError: (error: string) => void;
        mockAsyncStorage: (key: string, value: any) => void;
        mockKeychain: (username: string, password: string) => void;
        mockBiometric: (success?: boolean) => void;
      };
    }
  }
}
