import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToMany } from 'typeorm';
import { GovernanceVote } from './GovernanceVote';

@Entity('governance_proposals')
export class GovernanceProposal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column()
  proposer: string;

  @Column({ type: 'varchar', length: 20 })
  category: 'protocol' | 'treasury' | 'parameter' | 'emergency';

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: 'active' | 'passed' | 'rejected' | 'executed';

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp' })
  endTime: Date;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  quorum: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, default: '0' })
  forVotes: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, default: '0' })
  againstVotes: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, default: '0' })
  abstainVotes: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, default: '0' })
  trustWeightedVotes: number;

  @Column({ type: 'jsonb', nullable: true })
  executionData?: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => GovernanceVote, vote => vote.proposal)
  votes: GovernanceVote[];
} 