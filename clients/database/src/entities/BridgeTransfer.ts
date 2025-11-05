import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('bridge_transfers')
export class BridgeTransfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  sourceChain: string;

  @Column()
  @Index()
  targetChain: string;

  @Column()
  @Index()
  sourceAddress: string;

  @Column()
  @Index()
  targetAddress: string;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  amount: string;

  @Column({ type: 'varchar', length: 10 })
  asset: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: 'pending' | 'processing' | 'completed' | 'failed';

  @Column({ type: 'int' })
  trustScore: number;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  fee: string;

  @Column({ type: 'text', nullable: true })
  proofHash?: string;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 