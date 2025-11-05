import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../shared/utils/logger';

export interface NFT {
  id: string;
  tokenId: string;
  contractAddress: string;
  owner: string;
  creator: string;
  name: string;
  description: string;
  imageUrl: string;
  metadata: any;
  trustScore: number;
  credentialType?: 'identity' | 'achievement' | 'membership' | 'certification';
  verified: boolean;
  verifiedAt?: Date;
  mintedAt: Date;
  transferredAt?: Date;
}

export interface NFTCollection {
  id: string;
  name: string;
  symbol: string;
  description: string;
  contractAddress: string;
  creator: string;
  totalSupply: number;
  trustScore: number;
  verified: boolean;
  createdAt: Date;
}

export interface CredentialVerification {
  id: string;
  nftId: string;
  verifier: string;
  verificationType: 'identity' | 'achievement' | 'membership' | 'certification';
  verificationData: any;
  trustScore: number;
  verified: boolean;
  verifiedAt?: Date;
  signature: string;
}

export class NFTManager {
  private nfts: Map<string, NFT> = new Map();
  private collections: Map<string, NFTCollection> = new Map();
  private verifications: Map<string, CredentialVerification> = new Map();
  private isInitialized: boolean = false;

  constructor() {
    this.initializeDefaultCollections();
  }

  /**
   * Initialize NFT system
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing NFT system...');
      
      // TODO: Connect to blockchain
      // TODO: Load existing NFTs and collections
      // TODO: Initialize IPFS connection
      // TODO: Set up verification monitoring
      
      this.isInitialized = true;
      logger.info('NFT system initialized successfully');
    } catch (error) {
      logger.error('Error initializing NFT system:', error);
      throw error;
    }
  }

  /**
   * Initialize default collections
   */
  private initializeDefaultCollections(): void {
    const defaultCollections: NFTCollection[] = [
      {
        id: 'trust-credentials',
        name: 'Trust Credentials',
        symbol: 'TRUST',
        description: 'Official trust credentials for the ZippyCoin ecosystem',
        contractAddress: '0x1234567890123456789012345678901234567890',
        creator: 'zpc1trustfoundation',
        totalSupply: 0,
        trustScore: 100,
        verified: true,
        createdAt: new Date()
      },
      {
        id: 'achievement-badges',
        name: 'Achievement Badges',
        symbol: 'BADGE',
        description: 'Achievement badges for DeFi participation and trust building',
        contractAddress: '0x9876543210987654321098765432109876543210',
        creator: 'zpc1defiinnovator',
        totalSupply: 0,
        trustScore: 85,
        verified: true,
        createdAt: new Date()
      }
    ];

    defaultCollections.forEach(collection => {
      this.collections.set(collection.id, collection);
    });
  }

  /**
   * Create new NFT collection
   */
  async createCollection(collectionData: Omit<NFTCollection, 'id' | 'totalSupply' | 'createdAt'>): Promise<NFTCollection> {
    try {
      const collectionId = `collection-${uuidv4().substr(0, 8)}`;
      const collection: NFTCollection = {
        id: collectionId,
        ...collectionData,
        totalSupply: 0,
        createdAt: new Date()
      };

      this.collections.set(collectionId, collection);
      logger.info(`New collection created: ${collectionId}`);

      return collection;
    } catch (error) {
      logger.error('Error creating collection:', error);
      throw error;
    }
  }

  /**
   * Get all collections
   */
  getCollections(): NFTCollection[] {
    return Array.from(this.collections.values());
  }

  /**
   * Get collection by ID
   */
  getCollection(collectionId: string): NFTCollection | null {
    return this.collections.get(collectionId) || null;
  }

  /**
   * Mint new NFT
   */
  async mintNFT(
    collectionId: string,
    owner: string,
    creator: string,
    name: string,
    description: string,
    imageUrl: string,
    metadata: any,
    trustScore: number,
    credentialType?: NFT['credentialType']
  ): Promise<NFT> {
    try {
      const collection = this.getCollection(collectionId);
      if (!collection) {
        throw new Error('Collection not found');
      }

      const tokenId = `token-${uuidv4().substr(0, 8)}`;
      const nftId = `${collectionId}-${tokenId}`;

      const nft: NFT = {
        id: nftId,
        tokenId,
        contractAddress: collection.contractAddress,
        owner,
        creator,
        name,
        description,
        imageUrl,
        metadata,
        trustScore,
        credentialType,
        verified: false,
        mintedAt: new Date()
      };

      this.nfts.set(nftId, nft);

      // Update collection total supply
      collection.totalSupply += 1;

      logger.info(`NFT minted: ${nftId}`);
      return nft;
    } catch (error) {
      logger.error('Error minting NFT:', error);
      throw error;
    }
  }

  /**
   * Get NFT by ID
   */
  getNFT(nftId: string): NFT | null {
    return this.nfts.get(nftId) || null;
  }

  /**
   * Get NFTs by owner
   */
  getNFTsByOwner(owner: string): NFT[] {
    return Array.from(this.nfts.values())
      .filter(nft => nft.owner === owner);
  }

  /**
   * Get NFTs by collection
   */
  getNFTsByCollection(collectionId: string): NFT[] {
    return Array.from(this.nfts.values())
      .filter(nft => nft.id.startsWith(collectionId));
  }

  /**
   * Transfer NFT
   */
  async transferNFT(
    nftId: string,
    fromAddress: string,
    toAddress: string,
    trustScore: number
  ): Promise<boolean> {
    try {
      const nft = this.getNFT(nftId);
      if (!nft) {
        throw new Error('NFT not found');
      }

      if (nft.owner !== fromAddress) {
        throw new Error('Only owner can transfer NFT');
      }

      // Check if transfer is allowed based on trust score
      if (!this.isTransferAllowed(nft, trustScore)) {
        throw new Error('Transfer not allowed - insufficient trust score');
      }

      nft.owner = toAddress;
      nft.transferredAt = new Date();

      logger.info(`NFT transferred: ${nftId} from ${fromAddress} to ${toAddress}`);
      return true;
    } catch (error) {
      logger.error('Error transferring NFT:', error);
      return false;
    }
  }

  /**
   * Verify credential NFT
   */
  async verifyCredential(
    nftId: string,
    verifier: string,
    verificationType: CredentialVerification['verificationType'],
    verificationData: any,
    trustScore: number,
    signature: string
  ): Promise<CredentialVerification> {
    try {
      const nft = this.getNFT(nftId);
      if (!nft) {
        throw new Error('NFT not found');
      }

      if (nft.credentialType !== verificationType) {
        throw new Error('Verification type does not match NFT credential type');
      }

      const verificationId = `verification-${uuidv4().substr(0, 8)}`;
      const verification: CredentialVerification = {
        id: verificationId,
        nftId,
        verifier,
        verificationType,
        verificationData,
        trustScore,
        verified: false,
        signature
      };

      // TODO: Implement actual verification logic
      // - Verify cryptographic signature
      // - Check verification data
      // - Validate against external sources

      verification.verified = true;
      verification.verifiedAt = new Date();

      this.verifications.set(verificationId, verification);

      // Update NFT verification status
      nft.verified = true;
      nft.verifiedAt = new Date();

      logger.info(`Credential verified: ${verificationId}`);
      return verification;
    } catch (error) {
      logger.error('Error verifying credential:', error);
      throw error;
    }
  }

  /**
   * Get verifications for NFT
   */
  getNFTVerifications(nftId: string): CredentialVerification[] {
    return Array.from(this.verifications.values())
      .filter(verification => verification.nftId === nftId);
  }

  /**
   * Get verified credentials by owner
   */
  getVerifiedCredentials(owner: string): NFT[] {
    return Array.from(this.nfts.values())
      .filter(nft => nft.owner === owner && nft.verified);
  }

  /**
   * Check if transfer is allowed based on trust score
   */
  private isTransferAllowed(nft: NFT, trustScore: number): boolean {
    // High-value credentials require higher trust scores
    if (nft.credentialType === 'identity' && trustScore < 80) {
      return false;
    }

    if (nft.credentialType === 'certification' && trustScore < 70) {
      return false;
    }

    // Regular NFTs have no restrictions
    return true;
  }

  /**
   * Get NFT statistics
   */
  getStats(): any {
    const totalNFTs = this.nfts.size;
    const verifiedNFTs = Array.from(this.nfts.values())
      .filter(nft => nft.verified).length;
    const totalCollections = this.collections.size;
    const totalVerifications = this.verifications.size;

    const credentialTypes = Array.from(this.nfts.values())
      .filter(nft => nft.credentialType)
      .reduce((acc, nft) => {
        const type = nft.credentialType!;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return {
      totalNFTs,
      verifiedNFTs,
      totalCollections,
      totalVerifications,
      credentialTypes,
      averageTrustScore: totalNFTs > 0 
        ? Array.from(this.nfts.values())
            .reduce((sum, nft) => sum + nft.trustScore, 0) / totalNFTs
        : 0
    };
  }

  /**
   * Search NFTs
   */
  searchNFTs(query: string): NFT[] {
    const searchTerm = query.toLowerCase();
    return Array.from(this.nfts.values())
      .filter(nft => 
        nft.name.toLowerCase().includes(searchTerm) ||
        nft.description.toLowerCase().includes(searchTerm) ||
        nft.owner.toLowerCase().includes(searchTerm) ||
        nft.creator.toLowerCase().includes(searchTerm)
      );
  }

  /**
   * Get NFTs by credential type
   */
  getNFTsByCredentialType(credentialType: NFT['credentialType']): NFT[] {
    return Array.from(this.nfts.values())
      .filter(nft => nft.credentialType === credentialType);
  }

  /**
   * Burn NFT (only by owner or creator)
   */
  async burnNFT(nftId: string, burner: string): Promise<boolean> {
    try {
      const nft = this.getNFT(nftId);
      if (!nft) {
        throw new Error('NFT not found');
      }

      if (nft.owner !== burner && nft.creator !== burner) {
        throw new Error('Only owner or creator can burn NFT');
      }

      // Remove NFT
      this.nfts.delete(nftId);

      // Update collection total supply
      const collection = this.getCollection(nft.id.split('-')[0]);
      if (collection) {
        collection.totalSupply = Math.max(0, collection.totalSupply - 1);
      }

      logger.info(`NFT burned: ${nftId} by ${burner}`);
      return true;
    } catch (error) {
      logger.error('Error burning NFT:', error);
      return false;
    }
  }
} 