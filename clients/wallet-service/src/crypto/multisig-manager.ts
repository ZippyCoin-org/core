import * as crypto from 'crypto';
import { QuantumCrypto } from './quantum-crypto';
import { logger } from '../utils/logger';

export interface MultisigWallet {
  id: string;
  name: string;
  requiredSignatures: number;
  totalSigners: number;
  signers: string[];
  threshold: number; // M in M-of-N
  createdAt: Date;
  isActive: boolean;
}

export interface MultisigTransaction {
  id: string;
  walletId: string;
  to: string;
  value: string;
  data?: string;
  gasLimit?: string;
  gasPrice?: string;
  nonce: number;
  signatures: Map<string, Buffer>; // signer address -> signature
  status: 'pending' | 'executed' | 'failed' | 'expired';
  createdAt: Date;
  executedAt?: Date;
  txHash?: string;
}

export interface SignatureRequest {
  walletId: string;
  transactionId: string;
  signer: string;
  messageHash: Buffer;
  signature?: Buffer;
}

export class MultisigManager {
  private wallets: Map<string, MultisigWallet> = new Map();
  private transactions: Map<string, MultisigTransaction> = new Map();
  private signatureRequests: Map<string, SignatureRequest> = new Map();

  /**
   * Create a new multisig wallet
   */
  async createMultisigWallet(
    name: string,
    signers: string[],
    requiredSignatures: number
  ): Promise<MultisigWallet> {
    try {
      if (requiredSignatures < 1 || requiredSignatures > signers.length) {
        throw new Error('Invalid required signatures count');
      }

      const walletId = crypto.randomUUID();
      const wallet: MultisigWallet = {
        id: walletId,
        name,
        requiredSignatures,
        totalSigners: signers.length,
        signers: [...signers],
        threshold: requiredSignatures,
        createdAt: new Date(),
        isActive: true,
      };

      this.wallets.set(walletId, wallet);

      logger.info(`Created multisig wallet ${walletId} with ${signers.length} signers, requiring ${requiredSignatures} signatures`);

      return wallet;
    } catch (error) {
      logger.error('Error creating multisig wallet:', error);
      throw new Error('Failed to create multisig wallet');
    }
  }

  /**
   * Create a multisig transaction
   */
  async createMultisigTransaction(
    walletId: string,
    to: string,
    value: string,
    data?: string,
    gasLimit?: string,
    gasPrice?: string
  ): Promise<MultisigTransaction> {
    try {
      const wallet = this.wallets.get(walletId);
      if (!wallet) {
        throw new Error('Multisig wallet not found');
      }

      if (!wallet.isActive) {
        throw new Error('Multisig wallet is not active');
      }

      const transactionId = crypto.randomUUID();
      const transaction: MultisigTransaction = {
        id: transactionId,
        walletId,
        to,
        value,
        data,
        gasLimit,
        gasPrice,
        nonce: await this.getNextNonce(walletId),
        signatures: new Map(),
        status: 'pending',
        createdAt: new Date(),
      };

      this.transactions.set(transactionId, transaction);

      logger.info(`Created multisig transaction ${transactionId} for wallet ${walletId}`);

      return transaction;
    } catch (error) {
      logger.error('Error creating multisig transaction:', error);
      throw new Error('Failed to create multisig transaction');
    }
  }

  /**
   * Sign a multisig transaction
   */
  async signMultisigTransaction(
    transactionId: string,
    signer: string,
    signature: Buffer
  ): Promise<void> {
    try {
      const transaction = this.transactions.get(transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      const wallet = this.wallets.get(transaction.walletId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      if (!wallet.signers.includes(signer)) {
        throw new Error('Signer not authorized for this wallet');
      }

      if (transaction.signatures.has(signer)) {
        throw new Error('Transaction already signed by this signer');
      }

      // Verify signature (simplified - in production would verify against message hash)
      transaction.signatures.set(signer, signature);

      // Check if we have enough signatures
      if (transaction.signatures.size >= wallet.requiredSignatures) {
        await this.executeMultisigTransaction(transactionId);
      }

      logger.info(`Transaction ${transactionId} signed by ${signer} (${transaction.signatures.size}/${wallet.requiredSignatures} signatures)`);
    } catch (error) {
      logger.error('Error signing multisig transaction:', error);
      throw new Error('Failed to sign multisig transaction');
    }
  }

  /**
   * Execute a multisig transaction
   */
  private async executeMultisigTransaction(transactionId: string): Promise<void> {
    try {
      const transaction = this.transactions.get(transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Create transaction message for signing verification
      const message = this.createTransactionMessage(transaction);
      const messageHash = QuantumCrypto.hash(message);

      // Verify all signatures
      for (const [signer, signature] of transaction.signatures) {
        const wallet = this.wallets.get(transaction.walletId);
        if (!wallet) continue;

        // In production, would verify signature against public key
        // For now, just check that we have the required number of signatures
      }

      // Execute transaction (would submit to blockchain)
      transaction.status = 'executed';
      transaction.executedAt = new Date();
      transaction.txHash = `0x${crypto.randomBytes(32).toString('hex')}`;

      logger.info(`Executed multisig transaction ${transactionId} with hash ${transaction.txHash}`);
    } catch (error) {
      logger.error('Error executing multisig transaction:', error);
      const transaction = this.transactions.get(transactionId);
      if (transaction) {
        transaction.status = 'failed';
      }
      throw error;
    }
  }

  /**
   * Create transaction message for signing
   */
  private createTransactionMessage(transaction: MultisigTransaction): Buffer {
    const message = JSON.stringify({
      walletId: transaction.walletId,
      to: transaction.to,
      value: transaction.value,
      data: transaction.data,
      gasLimit: transaction.gasLimit,
      gasPrice: transaction.gasPrice,
      nonce: transaction.nonce,
      timestamp: transaction.createdAt.getTime(),
    });

    return Buffer.from(message, 'utf8');
  }

  /**
   * Get next nonce for wallet
   */
  private async getNextNonce(walletId: string): Promise<number> {
    // In production, would query blockchain for current nonce
    // For now, return a simple counter
    const transactions = Array.from(this.transactions.values())
      .filter(tx => tx.walletId === walletId && tx.status === 'executed');

    return transactions.length;
  }

  /**
   * Get multisig wallet by ID
   */
  getMultisigWallet(walletId: string): MultisigWallet | undefined {
    return this.wallets.get(walletId);
  }

  /**
   * Get multisig transaction by ID
   */
  getMultisigTransaction(transactionId: string): MultisigTransaction | undefined {
    return this.transactions.get(transactionId);
  }

  /**
   * List all multisig wallets
   */
  listMultisigWallets(): MultisigWallet[] {
    return Array.from(this.wallets.values());
  }

  /**
   * List pending multisig transactions
   */
  listPendingTransactions(walletId?: string): MultisigTransaction[] {
    const transactions = Array.from(this.transactions.values())
      .filter(tx => tx.status === 'pending');

    if (walletId) {
      return transactions.filter(tx => tx.walletId === walletId);
    }

    return transactions;
  }

  /**
   * Update multisig wallet configuration
   */
  async updateMultisigWallet(
    walletId: string,
    updates: Partial<Pick<MultisigWallet, 'name' | 'requiredSignatures' | 'isActive'>>
  ): Promise<void> {
    try {
      const wallet = this.wallets.get(walletId);
      if (!wallet) {
        throw new Error('Multisig wallet not found');
      }

      if (updates.requiredSignatures !== undefined) {
        if (updates.requiredSignatures < 1 || updates.requiredSignatures > wallet.totalSigners) {
          throw new Error('Invalid required signatures count');
        }
        wallet.requiredSignatures = updates.requiredSignatures;
        wallet.threshold = updates.requiredSignatures;
      }

      if (updates.name !== undefined) {
        wallet.name = updates.name;
      }

      if (updates.isActive !== undefined) {
        wallet.isActive = updates.isActive;
      }

      logger.info(`Updated multisig wallet ${walletId}`);
    } catch (error) {
      logger.error('Error updating multisig wallet:', error);
      throw new Error('Failed to update multisig wallet');
    }
  }

  /**
   * Remove signer from multisig wallet
   */
  async removeSigner(walletId: string, signer: string): Promise<void> {
    try {
      const wallet = this.wallets.get(walletId);
      if (!wallet) {
        throw new Error('Multisig wallet not found');
      }

      const signerIndex = wallet.signers.indexOf(signer);
      if (signerIndex === -1) {
        throw new Error('Signer not found in wallet');
      }

      wallet.signers.splice(signerIndex, 1);
      wallet.totalSigners = wallet.signers.length;

      // Adjust required signatures if necessary
      if (wallet.requiredSignatures > wallet.totalSigners) {
        wallet.requiredSignatures = wallet.totalSigners;
        wallet.threshold = wallet.totalSigners;
      }

      logger.info(`Removed signer ${signer} from multisig wallet ${walletId}`);
    } catch (error) {
      logger.error('Error removing signer:', error);
      throw new Error('Failed to remove signer');
    }
  }

  /**
   * Add signer to multisig wallet
   */
  async addSigner(walletId: string, signer: string): Promise<void> {
    try {
      const wallet = this.wallets.get(walletId);
      if (!wallet) {
        throw new Error('Multisig wallet not found');
      }

      if (wallet.signers.includes(signer)) {
        throw new Error('Signer already exists in wallet');
      }

      wallet.signers.push(signer);
      wallet.totalSigners = wallet.signers.length;

      logger.info(`Added signer ${signer} to multisig wallet ${walletId}`);
    } catch (error) {
      logger.error('Error adding signer:', error);
      throw new Error('Failed to add signer');
    }
  }
}

