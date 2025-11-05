// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./PrivacyGovernance.sol";

/**
 * @title Dual-Chain Governance Coordinator
 * @dev Coordinates governance between mainnet and privacy chain
 * Implements bicameral governance with Origin Wallets and Token Holders
 *
 * Governance Flow:
 * 1. Origin Wallets propose changes
 * 2. Token holders vote on proposals
 * 3. 2/3 majority required in both chambers
 * 4. Successful proposals update both chains
 */
contract DualChainGovernance {
    // ========== STATE VARIABLES ==========

    /// Mainnet governance contract
    address public mainnetGovernance;

    /// Privacy chain governance contract
    PrivacyGovernance public privacyGovernance;

    /// Bridge contract for cross-chain communication
    address public bridgeContract;

    /// Governance proposals that affect both chains
    mapping(uint256 => DualChainProposal) public dualProposals;

    /// Dual proposal count
    uint256 public dualProposalCount;

    /// Cross-chain proposal execution status
    mapping(uint256 => ChainExecutionStatus) public executionStatus;

    // ========== STRUCTS ==========

    /// Dual-chain governance proposal
    struct DualChainProposal {
        uint256 id;
        address proposer;
        string title;
        string description;

        // Mainnet parameters (if applicable)
        bytes mainnetParams;

        // Privacy parameters
        PrivacyGovernance.PrivacyParams privacyParams;

        uint256 startTime;
        uint256 endTime;

        // Voting results
        uint256 originWalletVotes;
        uint256 totalOriginWallets;
        uint256 tokenHolderVotesFor;
        uint256 tokenHolderVotesAgainst;
        uint256 tokenHolderVotesAbstain;

        bool executed;
        bool passed;
        ProposalStatus status;
    }

    /// Chain execution status for dual proposals
    struct ChainExecutionStatus {
        bool mainnetExecuted;
        bool privacyExecuted;
        uint256 mainnetTxHash;
        uint256 privacyTxHash;
        uint256 executionTime;
    }

    /// Proposal status
    enum ProposalStatus {
        Pending,
        Active,
        Succeeded,
        Failed,
        Executed,
        Cancelled
    }

    // ========== EVENTS ==========

    event DualProposalCreated(uint256 indexed proposalId, address indexed proposer, string title);
    event DualProposalExecuted(uint256 indexed proposalId);
    event ChainExecutionCompleted(uint256 indexed proposalId, string chain);
    event GovernanceConflictDetected(uint256 indexed proposalId, string conflictType);

    // ========== CONSTRUCTOR ==========

    constructor(
        address _mainnetGovernance,
        address _privacyGovernance,
        address _bridgeContract
    ) {
        mainnetGovernance = _mainnetGovernance;
        privacyGovernance = PrivacyGovernance(_privacyGovernance);
        bridgeContract = _bridgeContract;
    }

    // ========== DUAL-CHAIN GOVERNANCE FUNCTIONS ==========

    /**
     * @dev Create a dual-chain governance proposal
     * @param title Proposal title
     * @param description Detailed description
     * @param mainnetParams Parameters for mainnet (encoded)
     * @param privacyParams Parameters for privacy chain
     */
    function proposeDualChainChange(
        string memory title,
        string memory description,
        bytes memory mainnetParams,
        PrivacyGovernance.PrivacyParams memory privacyParams
    ) external returns (uint256) {
        // Only Origin Wallets can propose dual-chain changes
        require(privacyGovernance.originWallets(msg.sender), "Only Origin Wallets can propose");

        require(bytes(title).length > 0, "Title cannot be empty");
        require(bytes(description).length > 0, "Description cannot be empty");

        // Validate privacy parameters
        _validatePrivacyParams(privacyParams);

        dualProposalCount++;
        uint256 proposalId = dualProposalCount;

        dualProposals[proposalId] = DualChainProposal({
            id: proposalId,
            proposer: msg.sender,
            title: title,
            description: description,
            mainnetParams: mainnetParams,
            privacyParams: privacyParams,
            startTime: block.timestamp,
            endTime: block.timestamp + 14 days, // 14 day voting period for dual-chain
            originWalletVotes: 0,
            totalOriginWallets: _getOriginWalletCount(),
            tokenHolderVotesFor: 0,
            tokenHolderVotesAgainst: 0,
            tokenHolderVotesAbstain: 0,
            executed: false,
            passed: false,
            status: ProposalStatus.Active
        });

        // Initialize execution status
        executionStatus[proposalId] = ChainExecutionStatus({
            mainnetExecuted: false,
            privacyExecuted: false,
            mainnetTxHash: 0,
            privacyTxHash: 0,
            executionTime: 0
        });

        emit DualProposalCreated(proposalId, msg.sender, title);
        return proposalId;
    }

    /**
     * @dev Vote on dual-chain proposal (Origin Wallets)
     * @param proposalId ID of the proposal
     * @param support Whether to support the proposal
     */
    function voteOriginWallet(uint256 proposalId, bool support) external {
        require(privacyGovernance.originWallets(msg.sender), "Only Origin Wallets can vote");

        DualChainProposal storage proposal = dualProposals[proposalId];
        require(proposal.status == ProposalStatus.Active, "Proposal not active");

        // Check if already voted (would need separate tracking in real implementation)
        // For now, simplified voting

        if (support) {
            proposal.originWalletVotes++;
        }

        _checkDualProposalReady(proposalId);
    }

    /**
     * @dev Vote on dual-chain proposal (Token holders)
     * @param proposalId ID of the proposal
     * @param support Whether to support the proposal
     */
    function voteTokenHolder(uint256 proposalId, bool support) external {
        DualChainProposal storage proposal = dualProposals[proposalId];
        require(proposal.status == ProposalStatus.Active, "Proposal not active");
        require(block.timestamp <= proposal.endTime, "Voting period ended");

        // In a real implementation, you'd check voting power based on token balance
        // and prevent double voting

        if (support) {
            proposal.tokenHolderVotesFor++;
        } else {
            proposal.tokenHolderVotesAgainst++;
        }
    }

    /**
     * @dev Execute a successful dual-chain proposal
     * @param proposalId ID of the proposal to execute
     */
    function executeDualProposal(uint256 proposalId) external {
        DualChainProposal storage proposal = dualProposals[proposalId];
        ChainExecutionStatus storage execStatus = executionStatus[proposalId];

        require(proposal.status == ProposalStatus.Succeeded, "Proposal must be succeeded");
        require(!proposal.executed, "Proposal already executed");

        // Execute on privacy chain first
        if (!execStatus.privacyExecuted) {
            _executeOnPrivacyChain(proposalId);
            execStatus.privacyExecuted = true;
            execStatus.privacyTxHash = block.number; // Simplified
            emit ChainExecutionCompleted(proposalId, "privacy");
        }

        // Execute on mainnet (would involve cross-chain messaging)
        if (!execStatus.mainnetExecuted) {
            _executeOnMainnet(proposalId);
            execStatus.mainnetExecuted = true;
            execStatus.mainnetTxHash = block.number; // Simplified
            emit ChainExecutionCompleted(proposalId, "mainnet");
        }

        // Mark as executed when both chains are done
        if (execStatus.privacyExecuted && execStatus.mainnetExecuted) {
            proposal.executed = true;
            execStatus.executionTime = block.timestamp;
            emit DualProposalExecuted(proposalId);
        }
    }

    // ========== VIEW FUNCTIONS ==========

    /**
     * @dev Get dual proposal details
     * @param proposalId ID of the proposal
     */
    function getDualProposal(uint256 proposalId) external view returns (DualChainProposal memory) {
        return dualProposals[proposalId];
    }

    /**
     * @dev Get execution status for a dual proposal
     * @param proposalId ID of the proposal
     */
    function getExecutionStatus(uint256 proposalId) external view returns (ChainExecutionStatus memory) {
        return executionStatus[proposalId];
    }

    /**
     * @dev Check if dual proposal has passed
     * @param proposalId ID of the proposal
     */
    function hasDualProposalPassed(uint256 proposalId) external view returns (bool) {
        DualChainProposal memory proposal = dualProposals[proposalId];

        // Require 2/3 majority in Origin Wallets
        uint256 originThreshold = (proposal.totalOriginWallets * 2) / 3;
        bool originWalletsPassed = proposal.originWalletVotes > originThreshold;

        // Require simple majority of token holder votes
        uint256 totalTokenVotes = proposal.tokenHolderVotesFor + proposal.tokenHolderVotesAgainst;
        bool tokenHoldersPassed = proposal.tokenHolderVotesFor > proposal.tokenHolderVotesAgainst;

        // Both chambers must pass
        return originWalletsPassed && tokenHoldersPassed && totalTokenVotes > 0;
    }

    /**
     * @dev Get governance conflict status
     * @param proposalId ID of the proposal
     */
    function getGovernanceConflict(uint256 proposalId) external view returns (
        bool hasConflict,
        string memory conflictType,
        string memory description
    ) {
        DualChainProposal memory proposal = dualProposals[proposalId];

        // Check for conflicts between mainnet and privacy parameters
        if (proposal.mainnetParams.length > 0) {
            // Example conflict checks
            if (proposal.privacyParams.maxBridgeDailyLimit > 10_000_000 * 10**18) {
                return (true, "BridgeLimitTooHigh", "Bridge limit exceeds mainnet security threshold");
            }

            if (!proposal.privacyParams.optionalKycEnabled) {
                return (true, "KycDisabled", "Disabling opt-in KYC conflicts with compliance requirements");
            }
        }

        return (false, "", "");
    }

    // ========== INTERNAL FUNCTIONS ==========

    /**
     * @dev Validate privacy parameters
     */
    function _validatePrivacyParams(PrivacyGovernance.PrivacyParams memory params) internal pure {
        require(params.minRingSize >= 3, "Ring size too small");
        require(params.zkRollupBatchSize > 0, "Batch size must be positive");
        require(params.privacyChainBlockTime >= 1, "Block time too fast");
        require(params.maxAnonValidators > 0, "Must have validators");
        require(params.bridgeTimeLockHours >= 1, "Time lock too short");
    }

    /**
     * @dev Get Origin Wallet count
     */
    function _getOriginWalletCount() internal view returns (uint256) {
        // Would query the privacy governance contract
        // Simplified for now
        return 50; // Assume 50 Origin Wallets
    }

    /**
     * @dev Check if dual proposal is ready for execution
     */
    function _checkDualProposalReady(uint256 proposalId) internal {
        DualChainProposal storage proposal = dualProposals[proposalId];

        // Check if voting period ended and proposal passed
        if (block.timestamp >= proposal.endTime) {
            if (this.hasDualProposalPassed(proposalId)) {
                proposal.status = ProposalStatus.Succeeded;
                proposal.passed = true;
            } else {
                proposal.status = ProposalStatus.Failed;
            }
        }

        // Check for governance conflicts
        (bool hasConflict, , ) = this.getGovernanceConflict(proposalId);
        if (hasConflict && proposal.status == ProposalStatus.Succeeded) {
            proposal.status = ProposalStatus.Failed;
            emit GovernanceConflictDetected(proposalId, "ParameterConflict");
        }
    }

    /**
     * @dev Execute proposal on privacy chain
     */
    function _executeOnPrivacyChain(uint256 proposalId) internal {
        DualChainProposal memory proposal = dualProposals[proposalId];

        // Create privacy proposal
        privacyGovernance.proposePrivacyParamChange(
            proposal.privacyParams,
            string(abi.encodePacked("Dual-chain proposal: ", proposal.title))
        );
    }

    /**
     * @dev Execute proposal on mainnet (simplified)
     */
    function _executeOnMainnet(uint256 proposalId) internal {
        // In a real implementation, this would:
        // 1. Encode parameters for mainnet execution
        // 2. Send cross-chain message via bridge
        // 3. Execute governance proposal on mainnet

        // Placeholder implementation
        DualChainProposal memory proposal = dualProposals[proposalId];

        // Would call mainnet governance contract via bridge
        // bridgeContract.executeMainnetProposal(proposal.mainnetParams);
    }

    // ========== EMERGENCY FUNCTIONS ==========

    /**
     * @dev Emergency dual-chain pause
     */
    function emergencyDualPause() external {
        require(privacyGovernance.originWallets(msg.sender), "Only Origin Wallets");

        // Pause both chains
        privacyGovernance.emergencyPauseBridge();

        // Would also pause mainnet bridge
        // mainnetGovernance.emergencyPause();
    }

    /**
     * @dev Emergency dual-chain parameter reset
     */
    function emergencyDualReset() external {
        require(privacyGovernance.originWallets(msg.sender), "Only Origin Wallets");

        // Reset both chains to safe defaults
        privacyGovernance.emergencyResetParams();

        // Would also reset mainnet parameters
        // mainnetGovernance.emergencyReset();
    }
}
