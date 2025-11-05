//! ZippyCoin Blockchain Core
//!
//! This crate provides the core blockchain functionality for ZippyCoin,
//! including consensus, cryptography, and trust management.

pub mod compliance;
pub mod consensus;
pub mod trust;
pub mod tokenomics;
pub mod bridge;
pub mod edge_settlement;

/// Re-export common types for convenience
pub use consensus::*;
pub use trust::*;
pub use compliance::*;
pub use tokenomics::*;
pub use bridge::*;
pub use edge_settlement::*;
