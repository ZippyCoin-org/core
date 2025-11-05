import promClient from 'prom-client';

// Trust Score Metrics
export const trustScoreGauge = new promClient.Gauge({
  name: 'zippycoin_trust_score',
  help: 'Current trust score for a wallet address',
  labelNames: ['address', 'service']
});

export const averageTrustScoreGauge = new promClient.Gauge({
  name: 'zippycoin_average_trust_score',
  help: 'Average trust score across the ecosystem',
  labelNames: ['service']
});

// DeFi Metrics
export const defiPositionGauge = new promClient.Gauge({
  name: 'zippycoin_defi_position_value',
  help: 'Value of DeFi positions',
  labelNames: ['user_address', 'pool_id', 'position_type']
});

export const trustMultiplierGauge = new promClient.Gauge({
  name: 'zippycoin_trust_multiplier',
  help: 'Trust multiplier applied to DeFi positions',
  labelNames: ['user_address', 'pool_id']
});

export const yieldRewardsCounter = new promClient.Counter({
  name: 'zippycoin_yield_rewards_total',
  help: 'Total yield rewards distributed',
  labelNames: ['pool_id', 'user_address']
});

// Governance Metrics
export const governanceProposalGauge = new promClient.Gauge({
  name: 'zippycoin_governance_proposals_active',
  help: 'Number of active governance proposals',
  labelNames: ['category']
});

export const governanceVoteCounter = new promClient.Counter({
  name: 'zippycoin_governance_votes_total',
  help: 'Total governance votes cast',
  labelNames: ['proposal_id', 'choice']
});

export const trustWeightedVotesGauge = new promClient.Gauge({
  name: 'zippycoin_trust_weighted_votes',
  help: 'Trust-weighted votes for proposals',
  labelNames: ['proposal_id']
});

// Bridge Metrics
export const bridgeTransferCounter = new promClient.Counter({
  name: 'zippycoin_bridge_transfers_total',
  help: 'Total bridge transfers',
  labelNames: ['source_chain', 'target_chain', 'status']
});

export const bridgeVolumeGauge = new promClient.Gauge({
  name: 'zippycoin_bridge_volume',
  help: 'Bridge transfer volume',
  labelNames: ['source_chain', 'target_chain']
});

export const bridgeFeeGauge = new promClient.Gauge({
  name: 'zippycoin_bridge_fee',
  help: 'Bridge transfer fees',
  labelNames: ['source_chain', 'target_chain', 'trust_discount']
});

// NFT Metrics
export const nftMintCounter = new promClient.Counter({
  name: 'zippycoin_nft_mints_total',
  help: 'Total NFT mints',
  labelNames: ['collection_id', 'credential_type']
});

export const nftVerificationCounter = new promClient.Counter({
  name: 'zippycoin_nft_verifications_total',
  help: 'Total NFT verifications',
  labelNames: ['credential_type', 'verification_status']
});

export const verifiedCredentialsGauge = new promClient.Gauge({
  name: 'zippycoin_verified_credentials',
  help: 'Number of verified credentials',
  labelNames: ['credential_type']
});

// Wallet Metrics
export const walletCreationCounter = new promClient.Counter({
  name: 'zippycoin_wallet_creations_total',
  help: 'Total wallet creations',
  labelNames: ['wallet_type']
});

export const transactionCounter = new promClient.Counter({
  name: 'zippycoin_transactions_total',
  help: 'Total transactions',
  labelNames: ['transaction_type', 'status']
});

export const quantumSignatureCounter = new promClient.Counter({
  name: 'zippycoin_quantum_signatures_total',
  help: 'Total quantum-resistant signatures',
  labelNames: ['signature_type']
});

// Service Health Metrics
export const serviceHealthGauge = new promClient.Gauge({
  name: 'zippycoin_service_health',
  help: 'Service health status',
  labelNames: ['service_name']
});

export const serviceResponseTimeHistogram = new promClient.Histogram({
  name: 'zippycoin_service_response_time',
  help: 'Service response time',
  labelNames: ['service_name', 'endpoint'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

// Trust Ecosystem Metrics
export const ecosystemTrustScoreGauge = new promClient.Gauge({
  name: 'zippycoin_ecosystem_trust_score',
  help: 'Overall ecosystem trust score',
  labelNames: ['metric_type']
});

export const trustDelegationCounter = new promClient.Counter({
  name: 'zippycoin_trust_delegations_total',
  help: 'Total trust delegations',
  labelNames: ['delegator', 'delegate']
});

export const trustDecayGauge = new promClient.Gauge({
  name: 'zippycoin_trust_decay',
  help: 'Trust score decay over time',
  labelNames: ['address', 'decay_factor']
});

// Environmental Data Metrics
export const environmentalDataGauge = new promClient.Gauge({
  name: 'zippycoin_environmental_data',
  help: 'Environmental data values',
  labelNames: ['data_type', 'node_id']
});

export const quantumResistanceGauge = new promClient.Gauge({
  name: 'zippycoin_quantum_resistance',
  help: 'Quantum resistance metrics',
  labelNames: ['algorithm_type', 'key_size']
});

// Error Metrics
export const errorCounter = new promClient.Counter({
  name: 'zippycoin_errors_total',
  help: 'Total errors by service',
  labelNames: ['service_name', 'error_type']
});

export const trustCalculationErrorCounter = new promClient.Counter({
  name: 'zippycoin_trust_calculation_errors_total',
  help: 'Trust calculation errors',
  labelNames: ['calculation_type', 'error_reason']
}); 