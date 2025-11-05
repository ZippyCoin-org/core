import { buildSchema } from 'graphql';

export const schema = buildSchema(`
  type Query {
    # Wallet queries
    wallet(address: String!): Wallet
    walletBalance(address: String!, token: String): WalletBalance

    # Trust queries
    trustScore(address: String!): TrustScore
    trustHistory(address: String!, limit: Int): [TrustScoreEntry]

    # Node/Network queries
    node(id: ID!): Node
    networkStatus: NetworkStatus
    block(height: Int): Block
    transaction(hash: String!): Transaction

    # DeFi queries
    pool(address: String!): Pool
    userStake(user: String!, pool: String!): UserStake
    pendingRewards(user: String!, pool: String!): String

    # Governance queries
    proposal(id: ID!): Proposal
    proposals(status: ProposalStatus): [Proposal]

    # Bridge queries
    bridgeStatus: BridgeStatus

    # NFT queries
    nft(tokenId: String!): NFT
    userNFTs(owner: String!): [NFT]
  }

  type Mutation {
    # Wallet mutations
    sendTransaction(input: SendTransactionInput!): Transaction
    createWallet(input: CreateWalletInput!): Wallet

    # Trust mutations
    delegateTrust(input: DelegateTrustInput!): DelegationResult

    # DeFi mutations
    stakeTokens(input: StakeInput!): StakeResult
    unstakeTokens(input: UnstakeInput!): UnstakeResult
    claimRewards(pool: String!): ClaimResult

    # Governance mutations
    createProposal(input: CreateProposalInput!): Proposal
    vote(input: VoteInput!): VoteResult

    # Bridge mutations
    bridgeAssets(input: BridgeInput!): BridgeResult
  }

  type Subscription {
    # Real-time updates
    newBlock: Block
    trustScoreUpdated(address: String!): TrustScore
    proposalStatusChanged(id: ID!): Proposal
    networkStatus: NetworkStatus
  }

  # Core Types
  type Wallet {
    address: String!
    balance: String!
    nonce: String!
    trustScore: Float!
    stakedTokens: [StakedToken]
  }

  type WalletBalance {
    address: String!
    token: String!
    balance: String!
    symbol: String!
  }

  type TrustScore {
    address: String!
    score: Float!
    reputation: Float!
    delegationCount: Int!
    lastUpdated: String!
  }

  type TrustScoreEntry {
    timestamp: String!
    score: Float!
    reputation: Float!
  }

  type Node {
    id: ID!
    address: String!
    type: NodeType!
    status: NodeStatus!
    uptime: Float!
    blockHeight: String!
    trustScore: Float!
  }

  type NetworkStatus {
    blockHeight: String!
    activeNodes: Int!
    totalStake: String!
    averageTrustScore: Float!
    tps: Float!
  }

  type Block {
    height: String!
    hash: String!
    timestamp: String!
    transactions: [Transaction]
    validator: String!
    trustScore: Float!
  }

  type Transaction {
    hash: String!
    from: String!
    to: String!
    value: String!
    fee: String!
    status: TxStatus!
    blockHeight: String!
  }

  type Pool {
    address: String!
    token: String!
    totalStaked: String!
    rewardsPerBlock: String!
    apy: Float!
    trustMultiplier: Float!
  }

  type UserStake {
    user: String!
    pool: String!
    amount: String!
    rewards: String!
  }

  type Proposal {
    id: ID!
    title: String!
    description: String!
    proposer: String!
    status: ProposalStatus!
    votes: [Vote]
    createdAt: String!
    executedAt: String
  }

  type Vote {
    voter: String!
    choice: VoteChoice!
    weight: String!
    timestamp: String!
  }

  type BridgeStatus {
    networks: [Network]
    totalValueLocked: String!
    activeBridges: Int!
  }

  type Network {
    name: String!
    chainId: String!
    status: NetworkStatus!
  }

  type NFT {
    tokenId: String!
    owner: String!
    metadata: NFTMetadata!
    collection: String!
  }

  type NFTMetadata {
    name: String!
    description: String!
    image: String!
    attributes: [NFTAttribute]
  }

  type NFTAttribute {
    trait_type: String!
    value: String!
  }

  type StakedToken {
    pool: String!
    amount: String!
    rewards: String!
  }

  # Input Types
  input SendTransactionInput {
    to: String!
    value: String!
    data: String
    gasLimit: String
    gasPrice: String
  }

  input CreateWalletInput {
    type: WalletType!
    mnemonic: String
  }

  input DelegateTrustInput {
    delegate: String!
    amount: String!
  }

  input StakeInput {
    pool: String!
    amount: String!
  }

  input UnstakeInput {
    pool: String!
    amount: String!
  }

  input CreateProposalInput {
    title: String!
    description: String!
    targets: [String!]!
    values: [String!]!
    calldatas: [String!]!
  }

  input VoteInput {
    proposalId: ID!
    choice: VoteChoice!
  }

  input BridgeInput {
    token: String!
    amount: String!
    toChain: String!
    toAddress: String!
  }

  # Enums
  enum NodeType {
    FULL
    VALIDATOR
    EDGE
    RELAY
  }

  enum NodeStatus {
    ONLINE
    OFFLINE
    SYNCING
  }

  enum TxStatus {
    PENDING
    CONFIRMED
    FAILED
  }

  enum ProposalStatus {
    PENDING
    ACTIVE
    SUCCEEDED
    DEFEATED
    QUEUED
    EXECUTED
    CANCELLED
  }

  enum VoteChoice {
    FOR
    AGAINST
    ABSTAIN
  }

  enum WalletType {
    HD
    SINGLE_KEY
    MULTISIG
  }

  # Response Types
  type DelegationResult {
    success: Boolean!
    delegationId: String
    error: String
  }

  type StakeResult {
    success: Boolean!
    stakeId: String!
    error: String
  }

  type UnstakeResult {
    success: Boolean!
    amount: String!
    error: String
  }

  type ClaimResult {
    success: Boolean!
    amount: String!
    error: String
  }

  type VoteResult {
    success: Boolean!
    error: String
  }

  type BridgeResult {
    success: Boolean!
    txHash: String!
    error: String
  }
`);

