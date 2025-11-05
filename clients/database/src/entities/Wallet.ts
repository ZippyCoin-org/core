import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  address: string;

  @Column({ type: 'text' })
  publicKey: string;

  @Column({ type: 'text' })
  encryptedPrivateKey: string;

  @Column({ type: 'text', nullable: true })
  mnemonic?: string;

  @Column({ type: 'text', nullable: true })
  derivationPath?: string;

  @Column({ type: 'decimal', precision: 20, scale: 8, default: '0' })
  balance: string;

  @Column({ type: 'int', default: 0 })
  nonce: number;

  @Column({ type: 'int', default: 0 })
  trustScore: number;

  @Column({ type: 'boolean', default: false })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastActivity?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 