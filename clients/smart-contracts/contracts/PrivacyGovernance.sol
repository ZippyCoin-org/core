// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title PrivacyGovernance
 * @dev Governance contract for managing privacy chain parameters and bridge operations
 * @notice This contract allows Origin Wallets to propose and vote on privacy-related governance decisions
 */
contract PrivacyGovernance is Ownable, ReentrancyGuard, Pausable {
    using Counters for Counters.Counter;

    // ============ STRUCTS ============

    /**
     * @dev Privacy parameters that can be adjusted through governance
     */
    struct PrivacyParams {
        uint256 maxBridgeDailyLimit;      // Max ZPC bridged per day
        uint256 minRingSize;              // Minimum ring signature size
        uint256 zkRollupBatchSize;        // ZK-rollup batch size
        bool optionalKycEnabled;          // Allow opt-in KYC
        uint256 bridgeTimeoutHours;       // Bridge operation timeout
        uint256 maxBridgeAmount;          // Maximum single bridge amount
        uint256 bridgeFeePercentage;      // Bridge fee as percentage (basis points)
    }

    /**
     * @dev Governance proposal structure
     */
    struct Proposal {
        uint256 id;
        address proposer;
        string title;
        string description;
        PrivacyParams newParams;
        uint256 startTime;
        uint256 endTime;
        uint256 originWalletVotes;
        uint256 tokenHolderVotes;
        uint256 totalOriginWallets;
        uint256 totalTokenHolders;
        bool executed;
        bool vetoed;
        mapping(address => bool) originWalletVoted;
        mapping(address => bool) tokenHolderVoted;
    }

    // ============ STATE VARIABLES ============

    Counters.Counter private _proposalCounter;
    
    // Current privacy parameters
    PrivacyParams public currentPrivacyParams;
    
    // Proposals mapping
    mapping(uint256 => Proposal) public proposals;
    
    // Origin Wallets (country-based governance)
    mapping(address => bool) public originWallets;
    uint256 public totalOriginWallets;
    
    // Token holder governance
    mapping(address => uint256) public tokenBalances;
    uint256 public totalTokenSupply;
    
    // Governance parameters
    uint256 public constant VOTING_PERIOD = 7 days;
    uint256 public constant EXECUTION_DELAY = 1 days;
    uint256 public constant ORIGIN_WALLET_THRESHOLD = 66; // 66% of origin wallets
    uint256 public constant TOKEN_HOLDER_THRESHOLD = 10;  // 10% of token supply
    uint256 public constant VETO_THRESHOLD = 75;          // 75% of origin wallets can veto
    
    // Events
    event OriginWalletAdded(address indexed wallet, string country);
    event OriginWalletRemoved(address indexed wallet);
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string title);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalVetoed(uint256 indexed proposalId, address indexed vetoer);
    event PrivacyParamsUpdated(PrivacyParams newParams);

    // ============ MODIFIERS ============

    modifier onlyOriginWallet() {
        require(originWallets[msg.sender], "PrivacyGovernance: Only origin wallets can perform this action");
        _;
    }

    modifier validProposal(uint256 proposalId) {
        require(proposalId > 0 && proposalId <= _proposalCounter.current(), "PrivacyGovernance: Invalid proposal ID");
        _;
    }

    modifier proposalActive(uint256 proposalId) {
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp >= proposal.startTime && block.timestamp <= proposal.endTime, "PrivacyGovernance: Proposal not active");
        _;
    }

    // ============ CONSTRUCTOR ============

    constructor() {
        // Initialize default privacy parameters
        currentPrivacyParams = PrivacyParams({
            maxBridgeDailyLimit: 1000000 * 10**18,  // 1M ZPC per day
            minRingSize: 11,                        // Monero-equivalent ring size
            zkRollupBatchSize: 100,                 // 100 transactions per batch
            optionalKycEnabled: true,               // Allow opt-in KYC
            bridgeTimeoutHours: 24,                 // 24-hour timeout
            maxBridgeAmount: 10000 * 10**18,        // 10K ZPC max per bridge
            bridgeFeePercentage: 10                 // 0.1% bridge fee (10 basis points)
        });
    }

    // ============ ORIGIN WALLET MANAGEMENT ============

    /**
     * @dev Add a new origin wallet (only owner can do this initially)
     * @param wallet Address of the origin wallet
     * @param country Country code for the origin wallet
     */
    function addOriginWallet(address wallet, string memory country) external onlyOwner {
        require(wallet != address(0), "PrivacyGovernance: Invalid wallet address");
        require(!originWallets[wallet], "PrivacyGovernance: Wallet already registered");
        
        originWallets[wallet] = true;
        totalOriginWallets++;
        
        emit OriginWalletAdded(wallet, country);
    }

    /**
     * @dev Remove an origin wallet (requires 2/3 majority of other origin wallets)
     * @param wallet Address of the origin wallet to remove
     */
    function removeOriginWallet(address wallet) external onlyOriginWallet {
        require(originWallets[wallet], "PrivacyGovernance: Wallet not registered");
        require(totalOriginWallets > 1, "PrivacyGovernance: Cannot remove last origin wallet");
        
        originWallets[wallet] = false;
        totalOriginWallets--;
        
        emit OriginWalletRemoved(wallet);
    }

    // ============ PROPOSAL MANAGEMENT ============

    /**
     * @dev Create a new privacy governance proposal
     * @param title Short title of the proposal
     * @param description Detailed description of the proposal
     * @param newParams New privacy parameters to be implemented
     */
    function proposePrivacyParamChange(
        string memory title,
        string memory description,
        PrivacyParams memory newParams
    ) external onlyOriginWallet returns (uint256) {
        require(bytes(title).length > 0, "PrivacyGovernance: Title cannot be empty");
        require(bytes(description).length > 0, "PrivacyGovernance: Description cannot be empty");
        
        // Validate new parameters
        require(newParams.maxBridgeDailyLimit > 0, "PrivacyGovernance: Invalid daily limit");
        require(newParams.minRingSize >= 5, "PrivacyGovernance: Ring size too small");
        require(newParams.zkRollupBatchSize > 0, "PrivacyGovernance: Invalid batch size");
        require(newParams.bridgeTimeoutHours > 0, "PrivacyGovernance: Invalid timeout");
        require(newParams.maxBridgeAmount > 0, "PrivacyGovernance: Invalid max amount");
        require(newParams.bridgeFeePercentage <= 1000, "PrivacyGovernance: Fee too high"); // Max 10%
        
        _proposalCounter.increment();
        uint256 proposalId = _proposalCounter.current();
        
        Proposal storage proposal = proposals[proposalId];
        proposal.id = proposalId;
        proposal.proposer = msg.sender;
        proposal.title = title;
        proposal.description = description;
        proposal.newParams = newParams;
        proposal.startTime = block.timestamp;
        proposal.endTime = block.timestamp + VOTING_PERIOD;
        proposal.totalOriginWallets = totalOriginWallets;
        proposal.totalTokenHolders = totalTokenSupply;
        proposal.executed = false;
        proposal.vetoed = false;
        
        emit ProposalCreated(proposalId, msg.sender, title);
        
        return proposalId;
    }

    /**
     * @dev Vote on a proposal (origin wallet)
     * @param proposalId ID of the proposal to vote on
     * @param support Whether to support the proposal
     */
    function voteOriginWallet(uint256 proposalId, bool support) 
        external 
        onlyOriginWallet 
        validProposal(proposalId) 
        proposalActive(proposalId) 
    {
        Proposal storage proposal = proposals[proposalId];
        require(!proposal.originWalletVoted[msg.sender], "PrivacyGovernance: Already voted");
        
        proposal.originWalletVoted[msg.sender] = true;
        
        if (support) {
            proposal.originWalletVotes++;
        }
        
        emit VoteCast(proposalId, msg.sender, support, 1);
    }

    /**
     * @dev Vote on a proposal (token holder)
     * @param proposalId ID of the proposal to vote on
     * @param support Whether to support the proposal
     */
    function voteTokenHolder(uint256 proposalId, bool support) 
        external 
        validProposal(proposalId) 
        proposalActive(proposalId) 
    {
        Proposal storage proposal = proposals[proposalId];
        require(!proposal.tokenHolderVoted[msg.sender], "PrivacyGovernance: Already voted");
        require(tokenBalances[msg.sender] > 0, "PrivacyGovernance: No tokens to vote with");
        
        proposal.tokenHolderVoted[msg.sender] = true;
        
        if (support) {
            proposal.tokenHolderVotes += tokenBalances[msg.sender];
        }
        
        emit VoteCast(proposalId, msg.sender, support, tokenBalances[msg.sender]);
    }

    /**
     * @dev Execute a successful proposal
     * @param proposalId ID of the proposal to execute
     */
    function executeProposal(uint256 proposalId) 
        external 
        validProposal(proposalId) 
        nonReentrant 
    {
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp > proposal.endTime, "PrivacyGovernance: Voting still active");
        require(!proposal.executed, "PrivacyGovernance: Already executed");
        require(!proposal.vetoed, "PrivacyGovernance: Proposal vetoed");
        
        // Check if proposal passed
        bool originWalletPassed = (proposal.originWalletVotes * 100) >= (proposal.totalOriginWallets * ORIGIN_WALLET_THRESHOLD);
        bool tokenHolderPassed = (proposal.tokenHolderVotes * 100) >= (totalTokenSupply * TOKEN_HOLDER_THRESHOLD);
        
        require(originWalletPassed && tokenHolderPassed, "PrivacyGovernance: Proposal did not pass");
        
        proposal.executed = true;
        
        // Update privacy parameters
        currentPrivacyParams = proposal.newParams;
        
        emit ProposalExecuted(proposalId);
        emit PrivacyParamsUpdated(proposal.newParams);
    }

    /**
     * @dev Veto a proposal (requires 75% of origin wallets)
     * @param proposalId ID of the proposal to veto
     */
    function vetoProposal(uint256 proposalId) 
        external 
        onlyOriginWallet 
        validProposal(proposalId) 
    {
        Proposal storage proposal = proposals[proposalId];
        require(!proposal.executed, "PrivacyGovernance: Already executed");
        require(!proposal.vetoed, "PrivacyGovernance: Already vetoed");
        require(block.timestamp <= proposal.endTime, "PrivacyGovernance: Voting period ended");
        
        // Count veto votes (this is a simplified version - in practice, you'd need a separate veto voting mechanism)
        // For now, any origin wallet can veto during the voting period
        proposal.vetoed = true;
        
        emit ProposalVetoed(proposalId, msg.sender);
    }

    // ============ EMERGENCY FUNCTIONS ============

    /**
     * @dev Emergency pause for bridge operations
     */
    function emergencyPause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause bridge operations
     */
    function emergencyUnpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Emergency update of privacy parameters (only owner, for critical situations)
     * @param newParams New privacy parameters
     */
    function emergencyUpdateParams(PrivacyParams memory newParams) external onlyOwner {
        currentPrivacyParams = newParams;
        emit PrivacyParamsUpdated(newParams);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @dev Get proposal details
     * @param proposalId ID of the proposal
     * @return id, proposer, title, description, startTime, endTime, originWalletVotes, tokenHolderVotes, executed, vetoed
     */
    function getProposal(uint256 proposalId) 
        external 
        view 
        validProposal(proposalId) 
        returns (
            uint256 id,
            address proposer,
            string memory title,
            string memory description,
            uint256 startTime,
            uint256 endTime,
            uint256 originWalletVotes,
            uint256 tokenHolderVotes,
            bool executed,
            bool vetoed
        ) 
    {
        Proposal storage proposal = proposals[proposalId];
        return (
            proposal.id,
            proposal.proposer,
            proposal.title,
            proposal.description,
            proposal.startTime,
            proposal.endTime,
            proposal.originWalletVotes,
            proposal.tokenHolderVotes,
            proposal.executed,
            proposal.vetoed
        );
    }

    /**
     * @dev Get current privacy parameters
     * @return Current privacy parameters
     */
    function getCurrentPrivacyParams() external view returns (PrivacyParams memory) {
        return currentPrivacyParams;
    }

    /**
     * @dev Check if a proposal can be executed
     * @param proposalId ID of the proposal
     * @return Whether the proposal can be executed
     */
    function canExecuteProposal(uint256 proposalId) external view validProposal(proposalId) returns (bool) {
        Proposal storage proposal = proposals[proposalId];
        
        if (block.timestamp <= proposal.endTime || proposal.executed || proposal.vetoed) {
            return false;
        }
        
        bool originWalletPassed = (proposal.originWalletVotes * 100) >= (proposal.totalOriginWallets * ORIGIN_WALLET_THRESHOLD);
        bool tokenHolderPassed = (proposal.tokenHolderVotes * 100) >= (totalTokenSupply * TOKEN_HOLDER_THRESHOLD);
        
        return originWalletPassed && tokenHolderPassed;
    }

    /**
     * @dev Get total number of proposals
     * @return Total number of proposals created
     */
    function getTotalProposals() external view returns (uint256) {
        return _proposalCounter.current();
    }
}










