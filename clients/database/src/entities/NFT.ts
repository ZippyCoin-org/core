import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('nfts')
export class NFT {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  tokenId: string;

  @Column()
  @Index()
  contractAddress: string;

  @Column()
  @Index()
  owner: string;

  @Column()
  creator: string;

  @Column()
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column()
  imageUrl: string;

  @Column({ type: 'jsonb' })
  metadata: any;

  @Column({ type: 'int' })
  trustScore: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  credentialType?: 'identity' | 'achievement' | 'membership' | 'certification';

  @Column({ type: 'boolean', default: false })
  verified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  transferredAt?: Date;

  @CreateDateColumn()
  mintedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 