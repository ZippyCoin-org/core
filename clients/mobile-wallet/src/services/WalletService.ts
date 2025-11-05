import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Keychain from 'react-native-keychain';
import { WalletInfo, Transaction, SendTransactionRequest, ReceiveTransaction, BackupInfo } from '../types/wallet';

export class WalletService {
  private static instance: WalletService;
  private wallet: WalletInfo | null = null;
  private isInitialized = false;

  static getInstance(): WalletService {
    if (!WalletService.instance) {
      WalletService.instance = new WalletService();
    }
    return WalletService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Load existing wallet from secure storage
      const storedWallet = await this.loadFromStorage();
      if (storedWallet) {
        this.wallet = storedWallet;
      }
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize wallet service:', error);
      throw error;
    }
  }

  async createWallet(mnemonic?: string): Promise<WalletInfo> {
    try {
      // Generate or use provided mnemonic
      const seedPhrase = mnemonic || this.generateMnemonic();
      const seed = this.mnemonicToSeed(seedPhrase);
      const privateKey = this.derivePrivateKey(seed);

      this.wallet = {
        address: this.deriveAddressFromPrivateKey(privateKey),
        privateKey: privateKey.toString('hex'),
        publicKey: this.derivePublicKeyFromPrivateKey(privateKey),
        mnemonic: seedPhrase,
        balance: '0.000000',
        trustScore: 75,
        createdAt: new Date().toISOString(),
        lastBackup: null
      };

      // Save to secure storage
      await this.saveToStorage();
      
      return this.wallet;
    } catch (error) {
      console.error('Failed to create wallet:', error);
      throw new Error(`Failed to create wallet: ${error}`);
    }
  }

  async importWallet(mnemonic: string): Promise<WalletInfo> {
    try {
      if (!this.validateMnemonic(mnemonic)) {
        throw new Error('Invalid mnemonic phrase');
      }

      const seed = this.mnemonicToSeed(mnemonic);
      const privateKey = this.derivePrivateKey(seed);

      this.wallet = {
        address: this.deriveAddressFromPrivateKey(privateKey),
        privateKey: privateKey.toString('hex'),
        publicKey: this.derivePublicKeyFromPrivateKey(privateKey),
        mnemonic: mnemonic,
        balance: '0.000000',
        trustScore: 75,
        createdAt: new Date().toISOString(),
        lastBackup: null
      };

      // Save to secure storage
      await this.saveToStorage();
      
      return this.wallet;
    } catch (error) {
      console.error('Failed to import wallet:', error);
      throw new Error(`Failed to import wallet: ${error}`);
    }
  }

  async getWallet(): Promise<WalletInfo | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.wallet;
  }

  async getBalance(): Promise<string> {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }

    try {
      // In a real implementation, this would fetch from the network
      // For now, return stored balance or fetch from mock API
      const balance = await this.getBalanceFromNetwork(this.wallet.address);
      this.wallet.balance = balance.toString();
      await this.saveToStorage();
      return this.wallet.balance;
    } catch (error) {
      console.error('Failed to get balance:', error);
      return this.wallet.balance || '0.000000';
    }
  }

  async sendTransaction(toAddress: string, amount: string, memo?: string): Promise<Transaction> {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }

    try {
      const transaction: Transaction = {
        id: this.generateTransactionHash(),
        type: 'Send',
        from: this.wallet.address,
        to: toAddress,
        amount: amount,
        memo: memo || '',
        timestamp: new Date().toISOString(),
        status: 'pending',
        fee: '0.000001',
        confirmations: 0
      };

      // In a real implementation, this would broadcast to the network
      // For now, simulate the transaction
      await this.simulateTransaction(transaction);
      
      // Update balance
      const currentBalance = parseFloat(this.wallet.balance);
      const sendAmount = parseFloat(amount);
      this.wallet.balance = (currentBalance - sendAmount - 0.000001).toFixed(6);
      await this.saveToStorage();

      return transaction;
    } catch (error) {
      console.error('Failed to send transaction:', error);
      throw new Error(`Failed to send transaction: ${error}`);
    }
  }

  async getTransactionHistory(limit: number = 10): Promise<Transaction[]> {
    if (!this.wallet) {
      return [];
    }

    try {
      // In a real implementation, this would fetch from the network
      // For now, return mock transaction history
      return this.getMockTransactionHistory(limit);
    } catch (error) {
      console.error('Failed to get transaction history:', error);
      return [];
    }
  }

  async backupWallet(): Promise<BackupInfo> {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }

    try {
      const backupData = {
        address: this.wallet.address,
        mnemonic: this.wallet.mnemonic,
        publicKey: this.wallet.publicKey,
        balance: this.wallet.balance,
        trustScore: this.wallet.trustScore,
        createdAt: this.wallet.createdAt,
        backupDate: new Date().toISOString()
      };

      this.wallet.lastBackup = new Date().toISOString();
      await this.saveToStorage();

      return {
        data: backupData,
        filename: `zippycoin-wallet-backup-${Date.now()}.json`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to backup wallet:', error);
      throw new Error(`Failed to backup wallet: ${error}`);
    }
  }

  async getTrustScore(): Promise<number> {
    if (!this.wallet) {
      return 0;
    }

    try {
      // In a real implementation, this would calculate based on network activity
      // For now, return stored trust score
      return this.wallet.trustScore;
    } catch (error) {
      console.error('Failed to get trust score:', error);
      return this.wallet?.trustScore || 0;
    }
  }

  // Private helper methods
  private generateMnemonic(): string {
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

  private validateMnemonic(mnemonic: string): boolean {
    const words = mnemonic.split(' ');
    return words.length === 12 || words.length === 24;
  }

  private mnemonicToSeed(mnemonic: string): Buffer {
    // Simplified seed derivation - in production, use proper BIP39
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(mnemonic).digest();
  }

  private derivePrivateKey(seed: Buffer): Buffer {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(seed).digest();
  }

  private deriveAddressFromPrivateKey(privateKey: Buffer): string {
    const crypto = require('crypto');
    const publicKey = this.derivePublicKeyFromPrivateKey(privateKey);
    const hash = crypto.createHash('sha256').update(publicKey).digest();
    return 'zip' + hash.toString('hex').substring(0, 40);
  }

  private derivePublicKeyFromPrivateKey(privateKey: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(privateKey).digest('hex');
  }

  private generateTransactionHash(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  private async getBalanceFromNetwork(address: string): Promise<number> {
    // Mock network call - in production, this would call the actual blockchain
    return Math.random() * 1000;
  }

  private async simulateTransaction(transaction: Transaction): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    transaction.status = 'confirmed';
    transaction.confirmations = 1;
  }

  private getMockTransactionHistory(limit: number): Transaction[] {
    const mockTransactions: Transaction[] = [
      {
        id: 'tx1',
        type: 'Receive',
        from: 'zip1234567890abcdef1234567890abcdef12345678',
        to: this.wallet?.address || '',
        amount: '1.000000',
        memo: 'Welcome to ZippyCoin!',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        status: 'confirmed',
        fee: '0.000001',
        confirmations: 1
      },
      {
        id: 'tx2',
        type: 'Send',
        from: this.wallet?.address || '',
        to: 'zipabcdef1234567890abcdef1234567890abcdef12',
        amount: '0.500000',
        memo: 'Test transaction',
        timestamp: new Date(Date.now() - 172800000).toISOString(),
        status: 'confirmed',
        fee: '0.000001',
        confirmations: 1
      }
    ];

    return mockTransactions.slice(0, limit);
  }

  private async saveToStorage(): Promise<void> {
    if (!this.wallet) return;

    try {
      if (Platform.OS === 'ios') {
        await Keychain.setInternetCredentials(
          'zippycoin-wallet',
          'wallet-data',
          JSON.stringify(this.wallet)
        );
      } else {
        await AsyncStorage.setItem('zippycoin-wallet', JSON.stringify(this.wallet));
      }
    } catch (error) {
      console.error('Failed to save wallet to storage:', error);
      throw error;
    }
  }

  private async loadFromStorage(): Promise<WalletInfo | null> {
    try {
      let walletData: string | null = null;

      if (Platform.OS === 'ios') {
        const credentials = await Keychain.getInternetCredentials('zippycoin-wallet');
        walletData = credentials?.password || null;
      } else {
        walletData = await AsyncStorage.getItem('zippycoin-wallet');
      }

      if (walletData) {
        return JSON.parse(walletData);
      }
      return null;
    } catch (error) {
      console.error('Failed to load wallet from storage:', error);
      return null;
    }
  }
} 