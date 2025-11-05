//! ZippyCoin Consensus Modules
//!
//! This module contains the consensus mechanisms for ZippyCoin,
//! including pure DPoS consensus with quantum resistance.

pub mod dpos;
pub mod hybrid;

// Re-export the primary consensus engine (Pure DPoS)
pub use dpos::*;

// Also export hybrid for backward compatibility during transition
pub use hybrid::*;



