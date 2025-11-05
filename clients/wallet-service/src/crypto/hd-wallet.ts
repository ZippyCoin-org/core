import * as bip32 from 'bip32';
import * as bip39 from 'bip39';
import * as crypto from 'crypto';
import { logger } from '../utils/logger';

export interface HDWalletConfig {
  coinType: number;
  account: number;
  change: number;
  addressIndex: number;
}

export class HDWallet {
  private root: bip32.BIP32Interface;
  private config: HDWalletConfig;

  constructor(seed: Buffer, config: Partial<HDWalletConfig> = {}) {
    this.config = {
      coinType: 0x80000000, // ZippyCoin coin type
      account: 0x80000000, // Account 0
      change: 0, // External chain
      addressIndex: 0, // First address
      ...config,
    };

    this.root = bip32.fromSeed(seed);
  }

  /**
   * Create HD wallet from mnemonic
   */
  static async fromMnemonic(mnemonic: string): Promise<HDWallet> {
    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic phrase');
    }

    const seed = await bip39.mnemonicToSeed(mnemonic);
    return new HDWallet(seed);
  }

  /**
   * Generate new mnemonic phrase
   */
  static generateMnemonic(strength: 128 | 256 = 256): string {
    return bip39.generateMnemonic(strength);
  }

  /**
   * Derive child key at path
   */
  derivePath(path: string): Buffer {
    const child = this.root.derivePath(path);
    return child.privateKey!;
  }

  /**
   * Get derivation path for address
   */
  getDerivationPath(addressIndex?: number): string {
    const index = addressIndex ?? this.config.addressIndex;
    return `m/44'/${this.config.coinType}'/${this.config.account}'/${this.config.change}/${index}`;
  }

  /**
   * Generate new address
   */
  generateAddress(index?: number): { address: string; path: string; publicKey: Buffer } {
    const derivationIndex = index ?? this.config.addressIndex;
    const path = this.getDerivationPath(derivationIndex);
    const privateKey = this.derivePath(path);

    // Generate ZippyCoin address from public key
    const publicKey = crypto.createPublicKey({
      key: privateKey,
      format: 'der',
      type: 'pkcs8'
    });

    const publicKeyBuffer = Buffer.from(publicKey.export({ format: 'der', type: 'spki' }));
    const address = this.generateZippyCoinAddress(publicKeyBuffer.slice(-65)); // Remove DER header

    return {
      address,
      path,
      publicKey: publicKeyBuffer,
    };
  }

  /**
   * Generate multiple addresses
   */
  generateMultipleAddresses(count: number, startIndex: number = 0): Array<{ address: string; path: string; publicKey: Buffer }> {
    const addresses = [];

    for (let i = 0; i < count; i++) {
      const index = startIndex + i;
      addresses.push(this.generateAddress(index));
    }

    return addresses;
  }

  /**
   * Generate ZippyCoin address from public key
   */
  private generateZippyCoinAddress(publicKey: Buffer): string {
    // Use Keccak-256 hash of public key
    const keccak = crypto.createHash('keccak256');
    keccak.update(publicKey);
    const hash = keccak.digest();

    // Take last 20 bytes and add zpc1 prefix
    const addressBytes = hash.slice(-20);
    const addressHex = addressBytes.toString('hex');

    return `zpc1${addressHex}`;
  }

  /**
   * Get wallet configuration
   */
  getConfig(): HDWalletConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<HDWalletConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Export root extended private key (xprv)
   */
  exportRootXPrv(): string {
    return this.root.toBase58();
  }

  /**
   * Import from root extended private key
   */
  static fromXPrv(xprv: string): HDWallet {
    const root = bip32.fromBase58(xprv);
    return new HDWallet(root.privateKey!);
  }
}

