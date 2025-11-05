// Mock React Native modules
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios),
  },
  NativeModules: {
    BiometricAuth: {
      isAvailable: jest.fn(() => Promise.resolve(true)),
      authenticate: jest.fn(() => Promise.resolve(true)),
    },
  },
  Alert: {
    alert: jest.fn(),
  },
}));

// Mock ethers v6
jest.mock('ethers', () => {
  const validMnemonic = 'test test test test test test test test test test test ball';
  
  // Simple mock implementations
  const parseEther = jest.fn((value) => BigInt(value) * BigInt(10 ** 18));
  const keccak256 = jest.fn((data) => '0x' + 'a'.repeat(64));
  const toUtf8Bytes = jest.fn((data) => new Uint8Array(Buffer.from(data, 'utf8')));
  const getBytes = jest.fn((data) => new Uint8Array(Buffer.from(data, 'utf8')));
  
  const mockWallet = {
    createRandom: jest.fn(() => ({
      address: '0x1234567890123456789012345678901234567890',
      publicKey: '0xabcdef1234567890abcdef1234567890abcdef12',
      privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12',
      mnemonic: {
        phrase: validMnemonic
      }
    })),
    fromPhrase: jest.fn((mnemonic) => {
      if (mnemonic !== validMnemonic) throw new Error('invalid mnemonic');
      return {
        address: '0x1234567890123456789012345678901234567890',
        publicKey: '0xabcdef1234567890abcdef1234567890abcdef12',
        privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12'
      };
    }),
  };

  // Create a constructor function for Wallet
  const WalletConstructor = jest.fn((privateKey) => ({
    address: '0x1234567890123456789012345678901234567890',
    publicKey: '0xabcdef1234567890abcdef1234567890abcdef12',
    privateKey: privateKey,
    signTransaction: jest.fn(() => Promise.resolve('0xsignedtx')),
    signMessage: jest.fn(() => Promise.resolve('0xsignedmessage')),
  }));

  // Add static methods to the constructor
  WalletConstructor.createRandom = mockWallet.createRandom;
  WalletConstructor.fromPhrase = mockWallet.fromPhrase;
  
  return {
    ethers: {
      Wallet: WalletConstructor,
      isAddress: jest.fn(() => true),
      parseEther,
      keccak256,
      toUtf8Bytes,
      getBytes,
      verifyMessage: jest.fn(() => '0x1234567890123456789012345678901234567890'),
      computeAddress: jest.fn(() => '0x1234567890123456789012345678901234567890'),
      hexlify: jest.fn((bytes) => '0x' + bytes.toString('hex')),
      randomBytes: jest.fn((length) => new Uint8Array(length)),
    },
    Wallet: WalletConstructor,
    isAddress: jest.fn(() => true),
    parseEther,
    keccak256,
    toUtf8Bytes,
    getBytes,
    verifyMessage: jest.fn(() => '0x1234567890123456789012345678901234567890'),
    computeAddress: jest.fn(() => '0x1234567890123456789012345678901234567890'),
    hexlify: jest.fn((bytes) => '0x' + bytes.toString('hex')),
    randomBytes: jest.fn((length) => new Uint8Array(length)),
    __esModule: true,
  };
});

// Mock crypto
global.crypto = {
  getRandomValues: jest.fn((array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }),
};

// Mock Buffer
global.Buffer = Buffer; 