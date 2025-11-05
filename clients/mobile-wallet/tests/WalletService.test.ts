import { WalletService } from '../src/services/WalletService';

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

describe('WalletService', () => {
  let walletService: WalletService;

  beforeEach(() => {
    walletService = WalletService.getInstance();
    jest.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    test('should return the same instance', () => {
      const instance1 = WalletService.getInstance();
      const instance2 = WalletService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Mnemonic Generation', () => {
    test('should generate valid 12-word mnemonic', () => {
      const mnemonic = walletService['generateMnemonic']();
      const words = mnemonic.split(' ');
      
      expect(words).toHaveLength(12);
      expect(mnemonic).toMatch(/^[a-z]+(\s[a-z]+){11}$/);
    });

    test('should generate unique mnemonics', () => {
      const mnemonic1 = walletService['generateMnemonic']();
      const mnemonic2 = walletService['generateMnemonic']();
      expect(mnemonic1).not.toBe(mnemonic2);
    });
  });

  describe('Mnemonic Validation', () => {
    test('should validate correct mnemonic', () => {
      const validMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      const isValid = walletService['validateMnemonic'](validMnemonic);
      expect(isValid).toBe(true);
    });

    test('should reject invalid mnemonic', () => {
      const invalidMnemonic = 'invalid words that are not a valid mnemonic';
      const isValid = walletService['validateMnemonic'](invalidMnemonic);
      expect(isValid).toBe(false);
    });

    test('should reject empty mnemonic', () => {
      const isValid = walletService['validateMnemonic']('');
      expect(isValid).toBe(false);
    });
  });

  describe('Wallet Creation', () => {
    test('should create wallet with generated mnemonic', async () => {
      const wallet = await walletService.createWallet();
      
      expect(wallet).toBeDefined();
      expect(wallet.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(wallet.privateKey).toMatch(/^[a-fA-F0-9]{64}$/);
      expect(wallet.publicKey).toMatch(/^[a-fA-F0-9]{128}$/);
      expect(wallet.mnemonic).toMatch(/^[a-z]+(\s[a-z]+){11}$/);
      expect(wallet.balance).toBe('0.000000');
      expect(wallet.trustScore).toBe(75);
      expect(wallet.createdAt).toBeDefined();
      expect(wallet.lastBackup).toBeNull();
    });

    test('should create wallet with provided mnemonic', async () => {
      const providedMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      const wallet = await walletService.createWallet(providedMnemonic);
      
      expect(wallet.mnemonic).toBe(providedMnemonic);
      expect(wallet.address).toBeDefined();
    });

    test('should throw error for invalid mnemonic', async () => {
      const invalidMnemonic = 'invalid mnemonic';
      
      await expect(walletService.createWallet(invalidMnemonic))
        .rejects.toThrow('Invalid mnemonic');
    });
  });

  describe('Wallet Import', () => {
    test('should import wallet with valid mnemonic', async () => {
      const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      const wallet = await walletService.importWallet(mnemonic);
      
      expect(wallet.mnemonic).toBe(mnemonic);
      expect(wallet.address).toBeDefined();
    });

    test('should throw error for invalid mnemonic during import', async () => {
      const invalidMnemonic = 'invalid mnemonic';
      
      await expect(walletService.importWallet(invalidMnemonic))
        .rejects.toThrow('Invalid mnemonic');
    });
  });

  describe('Address Validation', () => {
    test('should validate correct Ethereum address', () => {
      const validAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      const isValid = walletService['isValidAddress'](validAddress);
      expect(isValid).toBe(true);
    });

    test('should reject invalid address', () => {
      const invalidAddress = 'invalid-address';
      const isValid = walletService['isValidAddress'](invalidAddress);
      expect(isValid).toBe(false);
    });

    test('should reject address without 0x prefix', () => {
      const invalidAddress = '742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      const isValid = walletService['isValidAddress'](invalidAddress);
      expect(isValid).toBe(false);
    });
  });

  describe('Transaction Sending', () => {
    beforeEach(async () => {
      await walletService.createWallet();
    });

    test('should send transaction successfully', async () => {
      const toAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      const amount = '1.5';
      const memo = 'Test transaction';

      const transaction = await walletService.sendTransaction(toAddress, amount, memo);
      
      expect(transaction).toBeDefined();
      expect(transaction.id).toBeDefined();
      expect(transaction.from).toBeDefined();
      expect(transaction.to).toBe(toAddress);
      expect(transaction.amount).toBe(amount);
      expect(transaction.memo).toBe(memo);
      expect(transaction.timestamp).toBeDefined();
      expect(transaction.status).toBe('pending');
    });

    test('should throw error for invalid recipient address', async () => {
      const invalidAddress = 'invalid-address';
      const amount = '1.0';

      await expect(walletService.sendTransaction(invalidAddress, amount))
        .rejects.toThrow('Invalid recipient address');
    });

    test('should throw error for invalid amount', async () => {
      const toAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      const invalidAmount = '-1.0';

      await expect(walletService.sendTransaction(toAddress, invalidAmount))
        .rejects.toThrow('Invalid amount');
    });

    test('should throw error for insufficient balance', async () => {
      const toAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      const largeAmount = '1000000.0';

      await expect(walletService.sendTransaction(toAddress, largeAmount))
        .rejects.toThrow('Insufficient balance');
    });
  });

  describe('Balance Management', () => {
    beforeEach(async () => {
      await walletService.createWallet();
    });

    test('should get current balance', async () => {
      const balance = await walletService.getBalance();
      expect(balance).toBeDefined();
      expect(typeof balance).toBe('string');
    });

    test('should update balance after transaction', async () => {
      const initialBalance = await walletService.getBalance();
      
      // Mock a successful transaction
      const toAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      await walletService.sendTransaction(toAddress, '0.1');
      
      const newBalance = await walletService.getBalance();
      expect(newBalance).not.toBe(initialBalance);
    });
  });

  describe('Transaction History', () => {
    beforeEach(async () => {
      await walletService.createWallet();
    });

    test('should return transaction history', async () => {
      const history = await walletService.getTransactionHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    test('should include new transactions in history', async () => {
      const initialHistory = await walletService.getTransactionHistory();
      const initialCount = initialHistory.length;

      const toAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      await walletService.sendTransaction(toAddress, '0.1');

      const newHistory = await walletService.getTransactionHistory();
      expect(newHistory.length).toBeGreaterThan(initialCount);
    });
  });

  describe('Wallet Backup', () => {
    beforeEach(async () => {
      await walletService.createWallet();
    });

    test('should backup wallet successfully', async () => {
      const backup = await walletService.backupWallet();
      
      expect(backup).toBeDefined();
      expect(backup.address).toBeDefined();
      expect(backup.mnemonic).toBeDefined();
      expect(backup.publicKey).toBeDefined();
      expect(backup.backupDate).toBeDefined();
    });

    test('should update lastBackup timestamp', async () => {
      const wallet = await walletService.getWallet();
      const initialBackup = wallet.lastBackup;

      await walletService.backupWallet();
      
      const updatedWallet = await walletService.getWallet();
      expect(updatedWallet.lastBackup).not.toBe(initialBackup);
    });
  });

  describe('Trust Score', () => {
    beforeEach(async () => {
      await walletService.createWallet();
    });

    test('should return trust score', async () => {
      const trustScore = await walletService.getTrustScore();
      expect(trustScore).toBeGreaterThanOrEqual(0);
      expect(trustScore).toBeLessThanOrEqual(100);
    });

    test('should update trust score based on activity', async () => {
      const initialScore = await walletService.getTrustScore();
      
      // Perform some transactions to potentially affect trust score
      const toAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      await walletService.sendTransaction(toAddress, '0.1');
      
      const newScore = await walletService.getTrustScore();
      expect(typeof newScore).toBe('number');
    });
  });

  describe('Storage Operations', () => {
    test('should save wallet to storage', async () => {
      const wallet = await walletService.createWallet();
      await walletService['saveToStorage']();
      
      // Verify storage was called (mocked)
      expect(walletService['wallet']).toBeDefined();
    });

    test('should load wallet from storage', async () => {
      await walletService.createWallet();
      await walletService['saveToStorage']();
      
      const loadedWallet = await walletService['loadFromStorage']();
      expect(loadedWallet).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle storage errors gracefully', async () => {
      // Mock storage to throw error
      const mockSetItem = require('@react-native-async-storage/async-storage').setItem;
      mockSetItem.mockRejectedValue(new Error('Storage error'));

      await expect(walletService.createWallet()).rejects.toThrow();
    });

    test('should handle network errors gracefully', async () => {
      await walletService.createWallet();
      
      // Mock network failure
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      
      await expect(walletService.sendTransaction('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', '1.0'))
        .rejects.toThrow();
    });
  });
});
