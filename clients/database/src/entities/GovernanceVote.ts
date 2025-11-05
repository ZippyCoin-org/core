import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { GovernanceProposal } from './GovernanceProposal';

@Entity('governance_votes')
export class GovernanceVote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  proposalId: string;

  @Column()
  @Index()
  voter: string;

  @Column({ type: 'varchar', length: 10 })
  choice: 'for' | 'against' | 'abstain';

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  weight: number;

  @Column({ type: 'int' })
  trustScore: number;

  @Column({ type: 'text' })
  signature: string;

  @CreateDateColumn()
  timestamp: Date;

  @ManyToOne(() => GovernanceProposal)
  @JoinColumn({ name: 'proposalId' })
  proposal: GovernanceProposal;
} 