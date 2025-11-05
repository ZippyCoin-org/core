import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../shared/utils/logger';

export interface Proposal {
  id: string;
  title: string;
  description: string;
  proposer: string;
  category: 'protocol' | 'treasury' | 'parameter' | 'emergency';
  status: 'active' | 'passed' | 'rejected' | 'executed';
  startTime: Date;
  endTime: Date;
  quorum: number;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  trustWeightedVotes: number;
  executionData?: any;
}

export interface Vote {
  id: string;
  proposalId: string;
  voter: string;
  choice: 'for' | 'against' | 'abstain';
  weight: number;
  trustScore: number;
  timestamp: Date;
  signature: string;
}

export interface Delegate {
  id: string;
  address: string;
  name: string;
  description: string;
  trustScore: number;
  delegatedVotes: number;
  delegators: string[];
  votingHistory: string[];
  activeSince: Date;
}

export class GovernanceManager {
  private proposals: Map<string, Proposal> = new Map();
  private votes: Map<string, Vote> = new Map();
  private delegates: Map<string, Delegate> = new Map();
  private isInitialized: boolean = false;

  constructor() {
    this.initializeDefaultProposals();
  }

  /**
   * Initialize governance system
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing governance system...');
      
      // TODO: Load existing proposals and votes from blockchain
      // TODO: Initialize delegate registry
      // TODO: Set up proposal execution monitoring
      
      this.isInitialized = true;
      logger.info('Governance system initialized successfully');
    } catch (error) {
      logger.error('Error initializing governance system:', error);
      throw error;
    }
  }

  /**
   * Initialize default proposals for testing
   */
  private initializeDefaultProposals(): void {
    const defaultProposals: Proposal[] = [
      {
        id: 'prop-001',
        title: 'Increase Trust Farming Rewards',
        description: 'Proposal to increase trust farming rewards by 20% to incentivize more participation',
        proposer: 'zpc1trustfoundation',
        category: 'protocol',
        status: 'active',
        startTime: new Date(),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        quorum: 1000000,
        forVotes: 0,
        againstVotes: 0,
        abstainVotes: 0,
        trustWeightedVotes: 0
      },
      {
        id: 'prop-002',
        title: 'Add New DeFi Protocol',
        description: 'Proposal to integrate a new lending protocol with trust-weighted interest rates',
        proposer: 'zpc1defiinnovator',
        category: 'protocol',
        status: 'active',
        startTime: new Date(),
        endTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        quorum: 2000000,
        forVotes: 0,
        againstVotes: 0,
        abstainVotes: 0,
        trustWeightedVotes: 0
      }
    ];

    defaultProposals.forEach(proposal => {
      this.proposals.set(proposal.id, proposal);
    });
  }

  /**
   * Create new proposal
   */
  async createProposal(proposalData: Omit<Proposal, 'id' | 'status' | 'forVotes' | 'againstVotes' | 'abstainVotes' | 'trustWeightedVotes'>): Promise<Proposal> {
    try {
      const proposalId = `prop-${uuidv4().substr(0, 8)}`;
      const proposal: Proposal = {
        id: proposalId,
        ...proposalData,
        status: 'active',
        forVotes: 0,
        againstVotes: 0,
        abstainVotes: 0,
        trustWeightedVotes: 0
      };

      this.proposals.set(proposalId, proposal);
      logger.info(`New proposal created: ${proposalId}`);

      return proposal;
    } catch (error) {
      logger.error('Error creating proposal:', error);
      throw error;
    }
  }

  /**
   * Get all proposals
   */
  getProposals(): Proposal[] {
    return Array.from(this.proposals.values());
  }

  /**
   * Get active proposals
   */
  getActiveProposals(): Proposal[] {
    const now = new Date();
    return Array.from(this.proposals.values())
      .filter(proposal => 
        proposal.status === 'active' && 
        proposal.startTime <= now && 
        proposal.endTime > now
      );
  }

  /**
   * Get proposal by ID
   */
  getProposal(proposalId: string): Proposal | null {
    return this.proposals.get(proposalId) || null;
  }

  /**
   * Cast vote on proposal
   */
  async castVote(
    proposalId: string,
    voter: string,
    choice: 'for' | 'against' | 'abstain',
    trustScore: number,
    signature: string
  ): Promise<Vote> {
    try {
      const proposal = this.getProposal(proposalId);
      if (!proposal) {
        throw new Error('Proposal not found');
      }

      if (proposal.status !== 'active') {
        throw new Error('Proposal is not active');
      }

      const now = new Date();
      if (now < proposal.startTime || now > proposal.endTime) {
        throw new Error('Voting period is not active');
      }

      // Check if user already voted
      const existingVote = Array.from(this.votes.values())
        .find(vote => vote.proposalId === proposalId && vote.voter === voter);

      if (existingVote) {
        throw new Error('User has already voted on this proposal');
      }

      // Calculate vote weight based on trust score
      const weight = this.calculateVoteWeight(trustScore);
      
      const voteId = `vote-${uuidv4().substr(0, 8)}`;
      const vote: Vote = {
        id: voteId,
        proposalId,
        voter,
        choice,
        weight,
        trustScore,
        timestamp: new Date(),
        signature
      };

      this.votes.set(voteId, vote);

      // Update proposal vote counts
      this.updateProposalVotes(proposalId, choice, weight);

      logger.info(`Vote cast on proposal ${proposalId}: ${choice}`);
      return vote;
    } catch (error) {
      logger.error('Error casting vote:', error);
      throw error;
    }
  }

  /**
   * Get votes for proposal
   */
  getProposalVotes(proposalId: string): Vote[] {
    return Array.from(this.votes.values())
      .filter(vote => vote.proposalId === proposalId);
  }

  /**
   * Get user's voting history
   */
  getUserVotingHistory(userAddress: string): Vote[] {
    return Array.from(this.votes.values())
      .filter(vote => vote.voter === userAddress);
  }

  /**
   * Register as delegate
   */
  async registerDelegate(
    address: string,
    name: string,
    description: string,
    trustScore: number
  ): Promise<Delegate> {
    try {
      const delegateId = `delegate-${uuidv4().substr(0, 8)}`;
      const delegate: Delegate = {
        id: delegateId,
        address,
        name,
        description,
        trustScore,
        delegatedVotes: 0,
        delegators: [],
        votingHistory: [],
        activeSince: new Date()
      };

      this.delegates.set(delegateId, delegate);
      logger.info(`Delegate registered: ${delegateId}`);

      return delegate;
    } catch (error) {
      logger.error('Error registering delegate:', error);
      throw error;
    }
  }

  /**
   * Delegate voting power
   */
  async delegateVotingPower(
    delegator: string,
    delegateId: string,
    amount: number
  ): Promise<void> {
    try {
      const delegate = this.delegates.get(delegateId);
      if (!delegate) {
        throw new Error('Delegate not found');
      }

      // TODO: Implement actual delegation logic
      // - Check delegator's voting power
      // - Transfer voting power to delegate
      // - Update delegate's delegated votes

      logger.info(`Voting power delegated: ${amount} from ${delegator} to ${delegateId}`);
    } catch (error) {
      logger.error('Error delegating voting power:', error);
      throw error;
    }
  }

  /**
   * Get all delegates
   */
  getDelegates(): Delegate[] {
    return Array.from(this.delegates.values());
  }

  /**
   * Get total number of delegates
   */
  getTotalDelegates(): number {
    return this.delegates.size;
  }

  /**
   * Execute proposal
   */
  async executeProposal(proposalId: string): Promise<void> {
    try {
      const proposal = this.getProposal(proposalId);
      if (!proposal) {
        throw new Error('Proposal not found');
      }

      if (proposal.status !== 'passed') {
        throw new Error('Proposal must be passed before execution');
      }

      // TODO: Implement proposal execution logic
      // - Execute on-chain actions
      // - Update protocol parameters
      // - Emit events

      proposal.status = 'executed';
      proposal.executionData = {
        executedAt: new Date(),
        executor: 'governance-contract'
      };

      logger.info(`Proposal executed: ${proposalId}`);
    } catch (error) {
      logger.error('Error executing proposal:', error);
      throw error;
    }
  }

  /**
   * Calculate vote weight based on trust score
   */
  private calculateVoteWeight(trustScore: number): number {
    // Base weight is 1, trust score can multiply it up to 3x
    const baseWeight = 1;
    const trustMultiplier = 1 + (trustScore / 100) * 2; // 1.0 to 3.0
    return baseWeight * trustMultiplier;
  }

  /**
   * Update proposal vote counts
   */
  private updateProposalVotes(proposalId: string, choice: string, weight: number): void {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return;

    switch (choice) {
      case 'for':
        proposal.forVotes += weight;
        break;
      case 'against':
        proposal.againstVotes += weight;
        break;
      case 'abstain':
        proposal.abstainVotes += weight;
        break;
    }

    // Update trust-weighted votes
    proposal.trustWeightedVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;

    // Check if proposal should be finalized
    this.checkProposalFinalization(proposalId);
  }

  /**
   * Check if proposal should be finalized
   */
  private checkProposalFinalization(proposalId: string): void {
    const proposal = this.proposals.get(proposalId);
    if (!proposal || proposal.status !== 'active') return;

    const now = new Date();
    if (now > proposal.endTime) {
      // Voting period ended, determine result
      if (proposal.trustWeightedVotes >= proposal.quorum) {
        if (proposal.forVotes > proposal.againstVotes) {
          proposal.status = 'passed';
          logger.info(`Proposal passed: ${proposalId}`);
        } else {
          proposal.status = 'rejected';
          logger.info(`Proposal rejected: ${proposalId}`);
        }
      } else {
        proposal.status = 'rejected'; // Quorum not met
        logger.info(`Proposal rejected (quorum not met): ${proposalId}`);
      }
    }
  }

  /**
   * Get governance statistics
   */
  getStats(): any {
    const activeProposals = this.getActiveProposals();
    const totalVotes = this.votes.size;
    const totalDelegates = this.delegates.size;

    return {
      totalProposals: this.proposals.size,
      activeProposals: activeProposals.length,
      totalVotes,
      totalDelegates,
      averageTrustScore: totalDelegates > 0 
        ? Array.from(this.delegates.values())
            .reduce((sum, d) => sum + d.trustScore, 0) / totalDelegates
        : 0
    };
  }
} 