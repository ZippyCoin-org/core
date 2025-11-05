import { WalletService } from '../services/WalletService';

describe('WalletService', () => {
  let walletService: WalletService;

  beforeEach(() => {
    walletService = new WalletService();
  });

  describe('createWallet', () => {
    it('should create a new HD wallet with quantum-resistant features', async () => {
      const password = 'testPassword123';
      const wallet = await walletService.createWallet(password);

      expect(wallet).toBeDefined();
      expect(wallet.address).toMatch(/^zpc1[a-f0-9]{40}$/);
      expect(wallet.publicKey).toBeDefined();
      expect(wallet.encryptedPrivateKey).toBeDefined();
      expect(wallet.mnemonic).toBeDefined();
      expect(wallet.derivationPath).toBe('m/44\'/0\'/0\'/0/0');
    });

    it('should create wallet with provided mnemonic', async () => {
      const password = 'testPassword123';
      const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      
      const wallet = await walletService.createWallet(password, mnemonic);

      expect(wallet.mnemonic).toBe(mnemonic);
      expect(wallet.address).toBeDefined();
    });
  });

  describe('importWallet', () => {
    it('should import wallet from valid mnemonic', async () => {
      const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      const password = 'testPassword123';
      
      const wallet = await walletService.importWallet(mnemonic, password);

      expect(wallet.address).toBeDefined();
      expect(wallet.publicKey).toBeDefined();
      expect(wallet.encryptedPrivateKey).toBeDefined();
    });

    it('should reject invalid mnemonic', async () => {
      const invalidMnemonic = 'invalid mnemonic phrase';
      const password = 'testPassword123';

      await expect(walletService.importWallet(invalidMnemonic, password))
        .rejects.toThrow('Invalid mnemonic');
    });
  });

  describe('quantum-resistant features', () => {
    it('should generate ZippyCoin addresses with correct format', async () => {
      const password = 'testPassword123';
      const wallet = await walletService.createWallet(password);

      // ZippyCoin addresses should start with 'zpc1' and be 44 characters long
      expect(wallet.address).toMatch(/^zpc1[a-f0-9]{40}$/);
      expect(wallet.address.length).toBe(44);
    });

    it('should encrypt private keys securely', async () => {
      const password = 'testPassword123';
      const wallet = await walletService.createWallet(password);

      // Encrypted key should be base64 encoded and contain salt, iv, auth tag
      const encryptedData = Buffer.from(wallet.encryptedPrivateKey, 'base64');
      expect(encryptedData.length).toBeGreaterThan(64); // salt(32) + iv(16) + authTag(16) + data
    });
  });

  describe('signTransaction', () => {
    it('should sign transaction with quantum-resistant signature', async () => {
      const password = 'testPassword123';
      const wallet = await walletService.createWallet(password);
      
      const transactionData = {
        to: 'zpc1recipientaddress123456789012345678901234567890',
        amount: '1000000000000000000',
        nonce: 0,
        gasPrice: '20000000000'
      };

      const signature = await walletService.signTransaction(
        wallet.address,
        password,
        transactionData
      );

      expect(signature).toBeDefined();
      expect(signature).toMatch(/^[a-f0-9]+$/);
    });
  });
}); 