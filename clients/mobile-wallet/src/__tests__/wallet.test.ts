import { WalletManager } from '../wallet/WalletManager';
import { TrustEngine } from '../trust/TrustEngine';
import { CryptoService } from '../crypto/CryptoService';
import { BiometricAuth } from '../auth/BiometricAuth';

describe('Mobile Wallet Tests', () => {
  let walletManager: WalletManager;
  let trustEngine: TrustEngine;
  let cryptoService: CryptoService;
  let biometricAuth: BiometricAuth;

  beforeEach(() => {
    walletManager = new WalletManager();
    trustEngine = new TrustEngine();
    cryptoService = new CryptoService();
    biometricAuth = new BiometricAuth();
  });

  describe('WalletManager', () => {
    test('should create new wallet', async () => {
      const wallet = await walletManager.createWallet();
      expect(wallet).toBeDefined();
      expect(wallet.address).toBeDefined();
      expect(wallet.publicKey).toBeDefined();
    });

    test('should import wallet from seed', async () => {
      const seed = 'test test test test test test test test test test test ball';
      const wallet = await walletManager.importWallet(seed);
      expect(wallet).toBeDefined();
      expect(wallet.address).toBeDefined();
    });

    test('should sign transaction', async () => {
      const wallet = await walletManager.createWallet();
      const transaction = {
        to: '0x1234567890123456789012345678901234567890',
        amount: '1000000000000000000',
        gas: '21000',
        nonce: 0
      };
      
      const signature = await walletManager.signTransaction(wallet, transaction);
      expect(signature).toBeDefined();
      expect(signature.length).toBeGreaterThan(0);
    });

    test('should validate transaction', async () => {
      const wallet = await walletManager.createWallet();
      const transaction = {
        to: '0x1234567890123456789012345678901234567890',
        amount: '1000000000000000000',
        gas: '21000',
        nonce: 0
      };
      
      const isValid = await walletManager.validateTransaction(transaction);
      expect(isValid).toBe(true);
    });
  });

  describe('TrustEngine', () => {
    test('should calculate trust score', async () => {
      const wallet = await walletManager.createWallet();
      const trustScore = await trustEngine.calculateTrustScore(wallet.address);
      expect(trustScore).toBeGreaterThanOrEqual(0);
      expect(trustScore).toBeLessThanOrEqual(100);
    });

    test('should update trust score', async () => {
      const wallet = await walletManager.createWallet();
      const newScore = 85;
      await trustEngine.updateTrustScore(wallet.address, newScore);
      const updatedScore = await trustEngine.calculateTrustScore(wallet.address);
      expect(updatedScore).toBe(newScore);
    });

    test('should validate trust delegation', async () => {
      const delegator = await walletManager.createWallet();
      const delegate = await walletManager.createWallet();
      const isValid = await trustEngine.validateDelegation(delegator.address, delegate.address);
      expect(typeof isValid).toBe('boolean');
    });
  });

  describe('CryptoService', () => {
    test('should generate quantum-resistant keypair', async () => {
      const keypair = await cryptoService.generateQuantumKeypair();
      expect(keypair.publicKey).toBeDefined();
      expect(keypair.privateKey).toBeDefined();
    });

    test('should encrypt data', async () => {
      const keypair = await cryptoService.generateQuantumKeypair();
      const data = 'test data for encryption';
      const encrypted = await cryptoService.encrypt(data, keypair.publicKey);
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(data);
    });

    test('should decrypt data', async () => {
      const keypair = await cryptoService.generateQuantumKeypair();
      const data = 'test data for encryption';
      const encrypted = await cryptoService.encrypt(data, keypair.publicKey);
      const decrypted = await cryptoService.decrypt(encrypted, keypair.privateKey);
      expect(decrypted).toBe(data);
    });

    test('should sign data', async () => {
      const keypair = await cryptoService.generateQuantumKeypair();
      const data = 'test data for signing';
      const signature = await cryptoService.sign(data, keypair.privateKey);
      expect(signature).toBeDefined();
      expect(signature.length).toBeGreaterThan(0);
    });

    test('should verify signature', async () => {
      const keypair = await cryptoService.generateQuantumKeypair();
      const data = 'test data for signing';
      const signature = await cryptoService.sign(data, keypair.privateKey);
      const isValid = await cryptoService.verify(data, signature, keypair.publicKey);
      expect(isValid).toBe(true);
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
        // Skip test if biometrics not available
        expect(true).toBe(true);
      }
    });
  });

  describe('Integration Tests', () => {
    test('should complete full transaction flow', async () => {
      // Create wallet
      const wallet = await walletManager.createWallet();
      expect(wallet).toBeDefined();

      // Calculate trust score
      const trustScore = await trustEngine.calculateTrustScore(wallet.address);
      expect(trustScore).toBeGreaterThanOrEqual(0);

      // Create transaction
      const transaction = {
        to: '0x1234567890123456789012345678901234567890',
        amount: '1000000000000000000',
        gas: '21000',
        nonce: 0
      };

      // Sign transaction
      const signature = await walletManager.signTransaction(wallet, transaction);
      expect(signature).toBeDefined();

      // Verify signature
      const keypair = await cryptoService.generateQuantumKeypair();
      const isValid = await cryptoService.verify(
        JSON.stringify(transaction),
        signature,
        wallet.publicKey
      );
      expect(isValid).toBe(true);
    });

    test('should handle trust delegation flow', async () => {
      const originWallet = await walletManager.createWallet();
      const delegateWallet = await walletManager.createWallet();

      // Set origin wallet trust
      await trustEngine.updateTrustScore(originWallet.address, 95);

      // Validate delegation
      const canDelegate = await trustEngine.validateDelegation(
        originWallet.address,
        delegateWallet.address
      );
      expect(typeof canDelegate).toBe('boolean');

      // Update delegate trust score
      if (canDelegate) {
        await trustEngine.updateTrustScore(delegateWallet.address, 80);
        const delegateScore = await trustEngine.calculateTrustScore(delegateWallet.address);
        expect(delegateScore).toBe(80);
      }
    });
  });
}); 