import { DataSource } from 'typeorm';
import { Wallet } from '../entities/Wallet';
import { DeFiPosition } from '../entities/DeFiPosition';
import { GovernanceProposal } from '../entities/GovernanceProposal';
import { GovernanceVote } from '../entities/GovernanceVote';
import { BridgeTransfer } from '../entities/BridgeTransfer';
import { NFT } from '../entities/NFT';
import dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'zippycoin',
  password: process.env.DB_PASSWORD || 'zippycoin',
  database: process.env.DB_NAME || 'zippycoin',
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
  entities: [
    Wallet,
    DeFiPosition,
    GovernanceProposal,
    GovernanceVote,
    BridgeTransfer,
    NFT
  ],
  migrations: ['src/migrations/*.ts'],
  subscribers: ['src/subscribers/*.ts'],
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  poolSize: 10,
  extra: {
    max: 20,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  }
});

export const initializeDatabase = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    console.log('Database connection established');
  } catch (error) {
    console.error('Error connecting to database:', error);
    throw error;
  }
};

export const closeDatabase = async (): Promise<void> => {
  try {
    await AppDataSource.destroy();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error closing database connection:', error);
    throw error;
  }
}; 