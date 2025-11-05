// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title Privacy Governance Contract
 * @dev Governance contract for ZippyPrivacy sidechain parameters
 * Allows Origin Wallets to propose and vote on privacy/compliance balance
 *
 * This contract enables bicameral governance where:
 * - Origin Wallets (Countries) can propose privacy parameter changes
 * - Token holders can vote on proposals
 * - 2/3 majority required in both chambers for approval
 */
contract PrivacyGovernance {
    // ========== STATE VARIABLES ==========

    /// Origin Wallet registry (governance chamber 1)
    mapping(address => bool) public originWallets;

    /// Privacy parameters
    PrivacyParams public privacyParams;

    /// Governance proposals
    mapping(uint256 => PrivacyProposal) public proposals;

    /// Proposal count
    uint256 public proposalCount;

    /// Voting records
    mapping(uint256 => mapping(address => Vote)) public votes;

    /// Origin Wallet votes on proposals
    mapping(uint256 => mapping(address => bool)) public originWalletVotes;

    // ========== STRUCTS ==========

    /// Privacy parameters that can be governed
    struct PrivacyParams {
        uint256 maxBridgeDailyLimit;      // Max ZPC bridged per day
        uint256 minRingSize;              // Minimum ring signature size
        uint256 zkRollupBatchSize;        // ZK-rollup batch size
        bool optionalKycEnabled;          // Allow opt-in KYC
        uint256 privacyChainBlockTime;    // Target block time (seconds)
        uint256 maxAnonValidators;        // Max anonymous validators
        uint256 bridgeTimeLockHours;      // Bridge withdrawal time lock
    }

    /// Governance proposal
    struct PrivacyProposal {
        uint256 id;
        address proposer;
        PrivacyParams proposedParams;
        string description;
        uint256 startTime;
        uint256 endTime;
        uint256 originWalletVotes;
        uint256 totalOriginWallets;
        bool executed;
        bool passed;
        ProposalStatus status;
    }

    /// Vote types
    enum Vote {
        None,
        For,
        Against,
        Abstain
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

    event OriginWalletAdded(address indexed wallet);
    event OriginWalletRemoved(address indexed wallet);
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description);
    event VoteCast(uint256 indexed proposalId, address indexed voter, Vote vote, uint256 weight);
    event OriginWalletVoted(uint256 indexed proposalId, address indexed originWallet, bool support);
    event ProposalExecuted(uint256 indexed proposalId);
    event PrivacyParamsUpdated(uint256 indexed proposalId, PrivacyParams newParams);

    // ========== MODIFIERS ==========

    modifier onlyOriginWallet() {
        require(originWallets[msg.sender], "Only Origin Wallets can call this");
        _;
    }

    modifier proposalExists(uint256 proposalId) {
        require(proposalId > 0 && proposalId <= proposalCount, "Proposal does not exist");
        _;
    }

    modifier proposalActive(uint256 proposalId) {
        require(
            proposals[proposalId].status == ProposalStatus.Active,
            "Proposal is not active"
        );
        _;
    }

    // ========== CONSTRUCTOR ==========

    constructor() {
        // Initialize default privacy parameters
        privacyParams = PrivacyParams({
            maxBridgeDailyLimit: 1_000_000 * 10**18,    // 1M ZPC daily bridge limit
            minRingSize: 11,                             // Monero-style ring size
            zkRollupBatchSize: 100,                       // 100 tx per batch
            optionalKycEnabled: true,                     // Allow opt-in KYC
            privacyChainBlockTime: 3,                     // 3 second blocks
            maxAnonValidators: 50,                        // 50 anonymous validators
            bridgeTimeLockHours: 24                       // 24 hour withdrawal lock
        });
    }

    // ========== GOVERNANCE FUNCTIONS ==========

    /**
     * @dev Create a new privacy parameter change proposal
     * @param newParams Proposed privacy parameters
     * @param description Human-readable description of changes
     */
    function proposePrivacyParamChange(
        PrivacyParams memory newParams,
        string memory description
    ) external onlyOriginWallet returns (uint256) {
        require(bytes(description).length > 0, "Description cannot be empty");
        require(newParams.minRingSize >= 3, "Ring size must be at least 3");
        require(newParams.zkRollupBatchSize > 0, "Batch size must be positive");
        require(newParams.privacyChainBlockTime >= 1, "Block time must be at least 1 second");

        proposalCount++;
        uint256 proposalId = proposalCount;

        proposals[proposalId] = PrivacyProposal({
            id: proposalId,
            proposer: msg.sender,
            proposedParams: newParams,
            description: description,
            startTime: block.timestamp,
            endTime: block.timestamp + 7 days, // 7 day voting period
            originWalletVotes: 0,
            totalOriginWallets: getOriginWalletCount(),
            executed: false,
            passed: false,
            status: ProposalStatus.Active
        });

        emit ProposalCreated(proposalId, msg.sender, description);
        return proposalId;
    }

    /**
     * @dev Vote on a privacy proposal (Origin Wallets only)
     * @param proposalId ID of the proposal
     * @param support Whether to support the proposal
     */
    function voteOriginWallet(
        uint256 proposalId,
        bool support
    ) external onlyOriginWallet proposalExists(proposalId) proposalActive(proposalId) {
        PrivacyProposal storage proposal = proposals[proposalId];

        // Check if already voted
        require(!originWalletVotes[proposalId][msg.sender], "Already voted");

        // Record vote
        originWalletVotes[proposalId][msg.sender] = true;

        if (support) {
            proposal.originWalletVotes++;
        }

        emit OriginWalletVoted(proposalId, msg.sender, support);

        // Check if proposal can be finalized
        _checkProposalReady(proposalId);
    }

    /**
     * @dev Vote on a privacy proposal (Token holders)
     * @param proposalId ID of the proposal
     * @param vote Vote type (For/Against/Abstain)
     */
    function voteTokenHolder(
        uint256 proposalId,
        Vote vote
    ) external proposalExists(proposalId) proposalActive(proposalId) {
        require(vote != Vote.None, "Invalid vote");

        // Prevent double voting
        require(votes[proposalId][msg.sender] == Vote.None, "Already voted");

        // Record vote
        votes[proposalId][msg.sender] = vote;

        // In a real implementation, you'd calculate voting weight based on token balance
        uint256 weight = 1; // Simplified: 1 vote per address

        emit VoteCast(proposalId, msg.sender, vote, weight);
    }

    /**
     * @dev Execute a successful proposal
     * @param proposalId ID of the proposal to execute
     */
    function executeProposal(uint256 proposalId) external proposalExists(proposalId) {
        PrivacyProposal storage proposal = proposals[proposalId];

        require(proposal.status == ProposalStatus.Succeeded, "Proposal must be succeeded");
        require(!proposal.executed, "Proposal already executed");
        require(block.timestamp >= proposal.endTime, "Voting period not ended");

        // Update privacy parameters
        privacyParams = proposal.proposedParams;
        proposal.executed = true;
        proposal.status = ProposalStatus.Executed;

        emit PrivacyParamsUpdated(proposalId, proposal.proposedParams);
        emit ProposalExecuted(proposalId);
    }

    /**
     * @dev Cancel a proposal (only proposer can cancel)
     * @param proposalId ID of the proposal to cancel
     */
    function cancelProposal(uint256 proposalId) external proposalExists(proposalId) {
        PrivacyProposal storage proposal = proposals[proposalId];

        require(msg.sender == proposal.proposer, "Only proposer can cancel");
        require(proposal.status == ProposalStatus.Active, "Can only cancel active proposals");

        proposal.status = ProposalStatus.Cancelled;
    }

    // ========== ADMIN FUNCTIONS ==========

    /**
     * @dev Add an Origin Wallet (admin function)
     * @param wallet Address of the Origin Wallet to add
     */
    function addOriginWallet(address wallet) external {
        // In production, this would have proper access control
        require(wallet != address(0), "Invalid wallet address");
        require(!originWallets[wallet], "Already an Origin Wallet");

        originWallets[wallet] = true;
        emit OriginWalletAdded(wallet);
    }

    /**
     * @dev Remove an Origin Wallet (admin function)
     * @param wallet Address of the Origin Wallet to remove
     */
    function removeOriginWallet(address wallet) external {
        // In production, this would have proper access control
        require(originWallets[wallet], "Not an Origin Wallet");

        originWallets[wallet] = false;
        emit OriginWalletRemoved(wallet);
    }

    // ========== VIEW FUNCTIONS ==========

    /**
     * @dev Get current privacy parameters
     */
    function getPrivacyParams() external view returns (PrivacyParams memory) {
        return privacyParams;
    }

    /**
     * @dev Get proposal details
     * @param proposalId ID of the proposal
     */
    function getProposal(uint256 proposalId) external view returns (PrivacyProposal memory) {
        return proposals[proposalId];
    }

    /**
     * @dev Get vote counts for a proposal
     * @param proposalId ID of the proposal
     */
    function getProposalVotes(uint256 proposalId) external view returns (
        uint256 originWalletFor,
        uint256 originWalletTotal,
        uint256 tokenHolderFor,
        uint256 tokenHolderAgainst,
        uint256 tokenHolderAbstain
    ) {
        PrivacyProposal memory proposal = proposals[proposalId];

        // Count token holder votes (simplified)
        uint256 forVotes = 0;
        uint256 againstVotes = 0;
        uint256 abstainVotes = 0;

        // In a real implementation, you'd iterate through all votes
        // This is a simplified version

        return (
            proposal.originWalletVotes,
            proposal.totalOriginWallets,
            forVotes,
            againstVotes,
            abstainVotes
        );
    }

    /**
     * @dev Check if a proposal has passed
     * @param proposalId ID of the proposal
     */
    function hasProposalPassed(uint256 proposalId) external view returns (bool) {
        PrivacyProposal memory proposal = proposals[proposalId];

        // Require 2/3 majority in both chambers
        uint256 originWalletThreshold = (proposal.totalOriginWallets * 2) / 3;
        bool originWalletsPassed = proposal.originWalletVotes > originWalletThreshold;

        // Simplified token holder voting (would need proper implementation)
        bool tokenHoldersPassed = true; // Placeholder

        return originWalletsPassed && tokenHoldersPassed;
    }

    // ========== INTERNAL FUNCTIONS ==========

    /**
     * @dev Check if a proposal is ready to be finalized
     * @param proposalId ID of the proposal
     */
    function _checkProposalReady(uint256 proposalId) internal {
        PrivacyProposal storage proposal = proposals[proposalId];

        // Check if voting period has ended
        if (block.timestamp >= proposal.endTime) {
            // Check if proposal passed
            if (this.hasProposalPassed(proposalId)) {
                proposal.status = ProposalStatus.Succeeded;
                proposal.passed = true;
            } else {
                proposal.status = ProposalStatus.Failed;
            }
        }
    }

    /**
     * @dev Get the total number of Origin Wallets
     */
    function getOriginWalletCount() internal view returns (uint256) {
        uint256 count = 0;
        // In a real implementation, you'd maintain a count
        // This is a simplified version that would need proper tracking
        return count;
    }

    // ========== EMERGENCY FUNCTIONS ==========

    /**
     * @dev Emergency pause of privacy chain bridge (Origin Wallets only)
     */
    function emergencyPauseBridge() external onlyOriginWallet {
        // Implementation would integrate with bridge contract
        // This is a placeholder for emergency governance
    }

    /**
     * @dev Emergency parameter reset (Origin Wallets only)
     */
    function emergencyResetParams() external onlyOriginWallet {
        // Reset to safe defaults
        privacyParams = PrivacyParams({
            maxBridgeDailyLimit: 100_000 * 10**18,       // Reduced limit
            minRingSize: 11,                             // Keep high privacy
            zkRollupBatchSize: 50,                        // Smaller batches
            optionalKycEnabled: true,                     // Keep opt-in KYC
            privacyChainBlockTime: 5,                     // Slower blocks
            maxAnonValidators: 25,                        // Fewer validators
            bridgeTimeLockHours: 72                       // Longer time lock
        });
    }
}
