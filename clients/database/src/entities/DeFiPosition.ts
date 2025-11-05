import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Wallet } from './Wallet';

@Entity('defi_positions')
export class DeFiPosition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  positionType: 'yield' | 'lending';

  @Column()
  poolId: string;

  @Column()
  @Index()
  userAddress: string;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  stakedAmount: string;

  @Column({ type: 'decimal', precision: 20, scale: 8, default: '0' })
  earnedRewards: string;

  @Column({ type: 'decimal', precision: 5, scale: 4, default: '1.0' })
  trustMultiplier: number;

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true })
  interestRate?: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, nullable: true })
  borrowedAmount?: string;

  @Column({ type: 'decimal', precision: 20, scale: 8, nullable: true })
  collateralAmount?: string;

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true })
  liquidationRisk?: number;

  @Column({ type: 'varchar', length: 10, nullable: true })
  asset?: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  startTime: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'userAddress', referencedColumnName: 'address' })
  wallet: Wallet;
} 