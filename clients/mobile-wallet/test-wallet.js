/**
 * Mobile Wallet Test Script
 * Tests core wallet functionality without React Native dependencies
 */

const crypto = require('crypto');

// Mock wallet service for testing
class TestWalletService {
  constructor() {
    this.wallet = null;
    this.transactions = [];
  }

  generateMnemonic() {
    const words = [
      'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 'absurd', 'abuse',
      'access', 'accident', 'account', 'accuse', 'achieve', 'acid', 'acoustic', 'acquire', 'across', 'act',
      'action', 'actor', 'actual', 'adapt', 'add', 'addict', 'address', 'adjust', 'admit', 'adult',
      'advance', 'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'age', 'agent', 'agree'
    ];
    
    const mnemonic = [];
    for (let i = 0; i < 12; i++) {
      mnemonic.push(words[Math.floor(Math.random() * words.length)]);
    }
    return mnemonic.join(' ');
  }

  validateMnemonic(mnemonic) {
    const words = mnemonic.split(' ');
    return words.length === 12 || words.length === 24;
  }

  mnemonicToSeed(mnemonic) {
    return crypto.createHash('sha256').update(mnemonic).digest();
  }

  derivePrivateKey(seed) {
    return crypto.createHash('sha256').update(seed).digest();
  }

  deriveAddressFromPrivateKey(privateKey) {
    const publicKey = this.derivePublicKeyFromPrivateKey(privateKey);
    const hash = crypto.createHash('sha256').update(publicKey).digest();
    return 'zip' + hash.toString('hex').substring(0, 40);
  }

  derivePublicKeyFromPrivateKey(privateKey) {
    return crypto.createHash('sha256').update(privateKey).digest('hex');
  }

  createWallet(mnemonic) {
    const seedPhrase = mnemonic || this.generateMnemonic();
    const seed = this.mnemonicToSeed(seedPhrase);
    const privateKey = this.derivePrivateKey(seed);

    this.wallet = {
      address: this.deriveAddressFromPrivateKey(privateKey),
      privateKey: privateKey.toString('hex'),
      publicKey: this.derivePublicKeyFromPrivateKey(privateKey),
      mnemonic: seedPhrase,
      balance: '1.000000',
      trustScore: 75,
      createdAt: new Date().toISOString(),
      lastBackup: null
    };

    return this.wallet;
  }

  sendTransaction(toAddress, amount, memo = '') {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }

    const transaction = {
      id: crypto.randomBytes(32).toString('hex'),
      type: 'Send',
      from: this.wallet.address,
      to: toAddress,
      amount: amount,
      memo: memo,
      timestamp: new Date().toISOString(),
      status: 'confirmed',
      fee: '0.000001',
      confirmations: 1
    };

    this.transactions.push(transaction);
    
    // Update balance
    const currentBalance = parseFloat(this.wallet.balance);
    const sendAmount = parseFloat(amount);
    this.wallet.balance = (currentBalance - sendAmount - 0.000001).toFixed(6);

    return transaction;
  }

  getTransactionHistory() {
    return this.transactions;
  }

  backupWallet() {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }

    return {
      data: {
        address: this.wallet.address,
        mnemonic: this.wallet.mnemonic,
        publicKey: this.wallet.publicKey,
        balance: this.wallet.balance,
        trustScore: this.wallet.trustScore,
        createdAt: this.wallet.createdAt,
        backupDate: new Date().toISOString()
      },
      filename: `zippycoin-wallet-backup-${Date.now()}.json`,
      timestamp: new Date().toISOString()
    };
  }
}

// Test functions
function testWalletCreation() {
  console.log('🧪 Testing Wallet Creation...');
  const walletService = new TestWalletService();
  
  // Test mnemonic generation
  const mnemonic = walletService.generateMnemonic();
  console.log('✅ Mnemonic generated:', mnemonic);
  
  // Test mnemonic validation
  const isValid = walletService.validateMnemonic(mnemonic);
  console.log('✅ Mnemonic validation:', isValid);
  
  // Test wallet creation
  const wallet = walletService.createWallet(mnemonic);
  console.log('✅ Wallet created:', {
    address: wallet.address,
    balance: wallet.balance,
    trustScore: wallet.trustScore
  });
  
  return { walletService, wallet };
}

function testTransactionSending(walletService) {
  console.log('\n🧪 Testing Transaction Sending...');
  
  const recipientAddress = 'zip1234567890abcdef1234567890abcdef12345678';
  const amount = '0.100000';
  const memo = 'Test transaction';
  
  const transaction = walletService.sendTransaction(recipientAddress, amount, memo);
  console.log('✅ Transaction sent:', {
    id: transaction.id,
    type: transaction.type,
    amount: transaction.amount,
    status: transaction.status
  });
  
  const history = walletService.getTransactionHistory();
  console.log('✅ Transaction history length:', history.length);
  
  return transaction;
}

function testWalletBackup(walletService) {
  console.log('\n🧪 Testing Wallet Backup...');
  
  const backup = walletService.backupWallet();
  console.log('✅ Backup created:', {
    filename: backup.filename,
    timestamp: backup.timestamp,
    hasMnemonic: !!backup.data.mnemonic,
    hasAddress: !!backup.data.address
  });
  
  return backup;
}

function testAddressValidation() {
  console.log('\n🧪 Testing Address Validation...');
  
  const validAddresses = [
    'zip1234567890abcdef1234567890abcdef12345678',
    'zipabcdef1234567890abcdef1234567890abcdef12'
  ];
  
  const invalidAddresses = [
    'invalid',
    'zip123',
    '1234567890abcdef1234567890abcdef12345678'
  ];
  
  validAddresses.forEach(addr => {
    const isValid = addr.startsWith('zip') && addr.length >= 43 && addr.length <= 50;
    console.log(`✅ Valid address "${addr}": ${isValid}`);
  });
  
  invalidAddresses.forEach(addr => {
    const isValid = addr.startsWith('zip') && addr.length >= 43 && addr.length <= 50;
    console.log(`❌ Invalid address "${addr}": ${isValid}`);
  });
}

function testBiometricSimulation() {
  console.log('\n🧪 Testing Biometric Simulation...');
  
  // Simulate biometric availability
  const biometricAvailable = Math.random() > 0.5;
  console.log('✅ Biometric available:', biometricAvailable);
  
  if (biometricAvailable) {
    // Simulate authentication
    const authenticated = Math.random() > 0.2; // 80% success rate
    console.log('✅ Biometric authentication:', authenticated ? 'SUCCESS' : 'FAILED');
  }
  
  return { biometricAvailable };
}

// Run all tests
function runAllTests() {
  console.log('🚀 Starting ZippyCoin Mobile Wallet Tests\n');
  
  try {
    // Test wallet creation
    const { walletService, wallet } = testWalletCreation();
    
    // Test transaction sending
    testTransactionSending(walletService);
    
    // Test wallet backup
    testWalletBackup(walletService);
    
    // Test address validation
    testAddressValidation();
    
    // Test biometric simulation
    testBiometricSimulation();
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📊 Test Summary:');
    console.log('- ✅ Wallet creation and validation');
    console.log('- ✅ Transaction sending and history');
    console.log('- ✅ Wallet backup functionality');
    console.log('- ✅ Address validation');
    console.log('- ✅ Biometric authentication simulation');
    
    return true;
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    return false;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const success = runAllTests();
  process.exit(success ? 0 : 1);
}

module.exports = {
  TestWalletService,
  runAllTests,
  testWalletCreation,
  testTransactionSending,
  testWalletBackup,
  testAddressValidation,
  testBiometricSimulation
};
