//! Unified Tokenomics Model for ZippyCoin
//!
//! Single source of truth for supply, rewards, fees, staking, and governance.

/// Percentage type helper (0.0..=100.0)
pub type Percent = f64;

/// Unified tokenomics configuration
#[derive(Debug, Clone)]
pub struct UnifiedTokenomics {
    // Supply
    pub max_supply: u128,            // e.g., 21,000,000 ZPC (with decimals applied at higher layer)
    pub initial_supply: u128,        // e.g., 10,500,000 ZPC
    pub annual_inflation: Percent,   // e.g., 5.0 decreasing over time

    // Rewards (per block)
    pub validator_reward_pct: Percent,   // e.g., 45.0
    pub delegator_reward_pct: Percent,   // e.g., 30.0
    pub edge_node_reward_pct: Percent,   // e.g., 10.0
    pub community_pool_pct: Percent,     // e.g., 10.0
    pub treasury_pct: Percent,           // e.g., 5.0

    // Fees
    pub tx_fee_burn_pct: Percent,        // e.g., 50.0
    pub failed_tx_burn_pct: Percent,     // e.g., 100.0

    // Staking
    pub min_validator_stake: u128,       // e.g., 100_000 ZPC
    pub min_delegator_stake: u128,       // e.g., 1_000 ZPC
    pub unbonding_period_days: u64,      // e.g., 21
}

impl Default for UnifiedTokenomics {
    fn default() -> Self {
        Self {
            max_supply: 21_000_000,
            initial_supply: 10_500_000,
            annual_inflation: 5.0,

            validator_reward_pct: 45.0,
            delegator_reward_pct: 30.0,
            edge_node_reward_pct: 10.0,
            community_pool_pct: 10.0,
            treasury_pct: 5.0,

            tx_fee_burn_pct: 50.0,
            failed_tx_burn_pct: 100.0,

            min_validator_stake: 100_000,
            min_delegator_stake: 1_000,
            unbonding_period_days: 21,
        }
    }
}

/// Reward distribution for a single block
#[derive(Debug, Clone, Copy)]
pub struct BlockRewardDistribution {
    pub validators: u128,
    pub delegators: u128,
    pub edge_nodes: u128,
    pub community_pool: u128,
    pub treasury: u128,
}

impl UnifiedTokenomics {
    /// Calculate block reward distribution in whole units
    pub fn distribute_block_reward(&self, total_block_reward: u128) -> BlockRewardDistribution {
        let pct = |p: Percent| -> u128 { ((total_block_reward as f64) * (p / 100.0)).round() as u128 };

        let validators = pct(self.validator_reward_pct);
        let delegators = pct(self.delegator_reward_pct);
        let edge_nodes = pct(self.edge_node_reward_pct);
        let community_pool = pct(self.community_pool_pct);
        let treasury = pct(self.treasury_pct);

        BlockRewardDistribution { validators, delegators, edge_nodes, community_pool, treasury }
    }

    /// Apply fee burning rules; returns (burned, retained)
    pub fn apply_fee_burn(&self, fee_paid: u128, is_failed_tx: bool) -> (u128, u128) {
        let burn_pct = if is_failed_tx { self.failed_tx_burn_pct } else { self.tx_fee_burn_pct };
        let burned = ((fee_paid as f64) * (burn_pct / 100.0)).round() as u128;
        let retained = fee_paid.saturating_sub(burned);
        (burned, retained)
    }

    /// Validate minimum stake thresholds
    pub fn validate_stake_thresholds(&self, validator_stake: u128, delegator_stake: u128) -> bool {
        validator_stake >= self.min_validator_stake && delegator_stake >= self.min_delegator_stake
    }
}





