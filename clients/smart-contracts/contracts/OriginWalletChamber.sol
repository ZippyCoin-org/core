// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./TrustEngine.sol";

/**
 * @title Origin Wallet Chamber - Country-Based Governance
 * @dev Bicameral governance chamber for origin wallets (geographic representation)
 * Each country gets one origin wallet with voting power based on population/trust
 */
contract OriginWalletChamber is ReentrancyGuard, Ownable {
    TrustEngine public trustEngine;

    struct OriginWallet {
        string countryCode;
        address multisigAddress;
        uint8 requiredSignatures;
        uint256 stakeAmount; // $1/resident or $1M minimum
        bool locked;
        bool vetoPower;
        uint256 trustScore;
        uint256 lastActivity;
    }

    struct Proposal {
        uint256 id;
        address proposer;
        string title;
        string description;
        ProposalType proposalType;
        uint256 startTime;
        uint256 endTime;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        bool executed;
        bool vetoed;
        bytes calldata; // For privacy chain parameter updates
    }

    struct Vote {
        bool hasVoted;
        uint8 choice; // 0=against, 1=for, 2=abstain
        uint256 weight;
        uint256 timestamp;
    }

    enum ProposalType {
        Constitutional,  // Requires 2/3 majority + no veto
        Emergency,      // Can be executed immediately with 3/4 majority
        Standard,       // Requires simple majority
        PrivacyChain,   // Privacy chain governance parameters
        BridgeGovernance // Bridge operation parameters
    }

    mapping(string => OriginWallet) public originWallets;
    mapping(uint256 => Proposal) public proposals;
    mapping(address => bool) public authorizedOriginWallets;
    mapping(uint256 => mapping(address => Vote)) public proposalVotes;

    uint256 public proposalCount;
    uint256 public constant VOTING_PERIOD = 7 days;
    uint256 public constant EMERGENCY_VOTING_PERIOD = 1 days;
    uint256 public constant CONSTITUTIONAL_MAJORITY = 667; // 66.7%
    uint256 public constant EMERGENCY_MAJORITY = 750; // 75%
    uint256 public constant STANDARD_MAJORITY = 500; // 50%

    event OriginWalletRegistered(string countryCode, address wallet, uint256 stakeAmount);
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, ProposalType proposalType);
    event VoteCast(uint256 indexed proposalId, address indexed voter, uint8 choice, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalVetoed(uint256 indexed proposalId, address vetoer);

    constructor(address _trustEngine) {
        trustEngine = TrustEngine(_trustEngine);
    }

    /**
     * @dev Register a new origin wallet for a country
     */
    function registerOriginWallet(
        string memory countryCode,
        address multisigAddress,
        uint8 requiredSignatures,
        uint256 stakeAmount
    ) external onlyOwner {
        require(bytes(countryCode).length == 2, "Invalid country code");
        require(multisigAddress != address(0), "Invalid multisig address");
        require(stakeAmount >= 1_000_000 ether, "Minimum stake: 1M ZPC"); // $1M minimum
        require(originWallets[countryCode].multisigAddress == address(0), "Country already registered");

        originWallets[countryCode] = OriginWallet({
            countryCode: countryCode,
            multisigAddress: multisigAddress,
            requiredSignatures: requiredSignatures,
            stakeAmount: stakeAmount,
            locked: false,
            vetoPower: true, // All origin wallets get veto power
            trustScore: 100, // Maximum trust for origin wallets
            lastActivity: block.timestamp
        });

        authorizedOriginWallets[multisigAddress] = true;

        emit OriginWalletRegistered(countryCode, multisigAddress, stakeAmount);
    }

    /**
     * @dev Create a new proposal (only origin wallets can propose)
     */
    function createProposal(
        string memory title,
        string memory description,
        ProposalType proposalType,
        bytes memory calldata
    ) external returns (uint256) {
        require(authorizedOriginWallets[msg.sender], "Only origin wallets can propose");
        require(bytes(title).length > 0 && bytes(description).length > 0, "Invalid proposal content");

        proposalCount++;
        uint256 votingPeriod = proposalType == ProposalType.Emergency ? EMERGENCY_VOTING_PERIOD : VOTING_PERIOD;

        proposals[proposalCount] = Proposal({
            id: proposalCount,
            proposer: msg.sender,
            title: title,
            description: description,
            proposalType: proposalType,
            startTime: block.timestamp,
            endTime: block.timestamp + votingPeriod,
            forVotes: 0,
            againstVotes: 0,
            abstainVotes: 0,
            executed: false,
            vetoed: false,
            calldata: calldata
        });

        emit ProposalCreated(proposalCount, msg.sender, proposalType);
        return proposalCount;
    }

    /**
     * @dev Create a privacy chain governance proposal
     */
    function createPrivacyChainProposal(
        string memory title,
        string memory description,
        bytes memory privacyParams
    ) external returns (uint256) {
        return createProposal(title, description, ProposalType.PrivacyChain, privacyParams);
    }

    /**
     * @dev Create a bridge governance proposal
     */
    function createBridgeGovernanceProposal(
        string memory title,
        string memory description,
        bytes memory bridgeParams
    ) external returns (uint256) {
        return createProposal(title, description, ProposalType.BridgeGovernance, bridgeParams);
    }

    /**
     * @dev Cast a vote on a proposal
     */
    function castVote(uint256 proposalId, uint8 choice) external {
        require(authorizedOriginWallets[msg.sender], "Only origin wallets can vote");
        require(choice <= 2, "Invalid vote choice");
        require(proposals[proposalId].id != 0, "Proposal does not exist");
        require(block.timestamp >= proposals[proposalId].startTime, "Voting not started");
        require(block.timestamp <= proposals[proposalId].endTime, "Voting ended");
        require(!proposalVotes[proposalId][msg.sender].hasVoted, "Already voted");

        // Calculate voting weight based on stake and trust
        uint256 baseWeight = getOriginWallet(msg.sender).stakeAmount;
        uint256 trustMultiplier = getOriginWallet(msg.sender).trustScore;
        uint256 votingWeight = baseWeight * trustMultiplier / 100;

        proposalVotes[proposalId][msg.sender] = Vote({
            hasVoted: true,
            choice: choice,
            weight: votingWeight,
            timestamp: block.timestamp
        });

        if (choice == 0) {
            proposals[proposalId].againstVotes += votingWeight;
        } else if (choice == 1) {
            proposals[proposalId].forVotes += votingWeight;
        } else {
            proposals[proposalId].abstainVotes += votingWeight;
        }

        emit VoteCast(proposalId, msg.sender, choice, votingWeight);
    }

    /**
     * @dev Execute a proposal if it passes
     */
    function executeProposal(uint256 proposalId) external {
        require(proposals[proposalId].id != 0, "Proposal does not exist");
        require(block.timestamp > proposals[proposalId].endTime, "Voting not ended");
        require(!proposals[proposalId].executed, "Already executed");
        require(!proposals[proposalId].vetoed, "Proposal vetoed");

        uint256 totalVotes = proposals[proposalId].forVotes + proposals[proposalId].againstVotes + proposals[proposalId].abstainVotes;
        uint256 forPercentage = proposals[proposalId].forVotes * 1000 / totalVotes;

        // Check if proposal passes based on type
        ProposalType proposalType = proposals[proposalId].proposalType;
        uint256 requiredMajority;
        
        if (proposalType == ProposalType.Constitutional) {
            requiredMajority = CONSTITUTIONAL_MAJORITY;
        } else if (proposalType == ProposalType.Emergency) {
            requiredMajority = EMERGENCY_MAJORITY;
        } else if (proposalType == ProposalType.PrivacyChain || proposalType == ProposalType.BridgeGovernance) {
            requiredMajority = CONSTITUTIONAL_MAJORITY; // Privacy and bridge changes require 2/3 majority
        } else {
            requiredMajority = STANDARD_MAJORITY;
        }

        require(forPercentage >= requiredMajority, "Proposal did not pass");

        proposals[proposalId].executed = true;

        // Execute proposal logic based on type
        if (proposalType == ProposalType.PrivacyChain) {
            _executePrivacyChainProposal(proposalId);
        } else if (proposalType == ProposalType.BridgeGovernance) {
            _executeBridgeGovernanceProposal(proposalId);
        }
        // Other proposal types would have their execution logic here

        emit ProposalExecuted(proposalId);
    }

    /**
     * @dev Execute privacy chain governance proposal
     */
    function _executePrivacyChainProposal(uint256 proposalId) internal {
        // In production, this would call the PrivacyGovernance contract
        // to update privacy parameters based on the proposal's calldata
        bytes memory calldata = proposals[proposalId].calldata;
        
        // Placeholder for actual privacy parameter update logic
        // This would involve calling PrivacyGovernance.emergencyUpdateParams()
        // or similar function with the proposed parameters
    }

    /**
     * @dev Execute bridge governance proposal
     */
    function _executeBridgeGovernanceProposal(uint256 proposalId) internal {
        // In production, this would call the bridge contract
        // to update bridge parameters based on the proposal's calldata
        bytes memory calldata = proposals[proposalId].calldata;
        
        // Placeholder for actual bridge parameter update logic
        // This would involve calling bridge contract functions
        // to update limits, fees, timeouts, etc.
    }

    /**
     * @dev Veto a proposal (emergency power for origin wallets)
     */
    function vetoProposal(uint256 proposalId) external {
        require(authorizedOriginWallets[msg.sender], "Only origin wallets can veto");
        require(proposals[proposalId].id != 0, "Proposal does not exist");
        require(!proposals[proposalId].executed, "Cannot veto executed proposal");
        require(getOriginWallet(msg.sender).vetoPower, "No veto power");

        proposals[proposalId].vetoed = true;

        emit ProposalVetoed(proposalId, msg.sender);
    }

    /**
     * @dev Get origin wallet details by address
     */
    function getOriginWallet(address wallet) public view returns (OriginWallet memory) {
        require(authorizedOriginWallets[wallet], "Not an origin wallet");

        // In production, maintain a reverse mapping: address => countryCode
        // For now, return a default structure - this needs proper implementation
        return OriginWallet({
            countryCode: "US", // Placeholder
            multisigAddress: wallet,
            requiredSignatures: 3,
            stakeAmount: 1_000_000 ether,
            locked: false,
            vetoPower: true,
            trustScore: 100,
            lastActivity: block.timestamp
        });
    }

    /**
     * @dev Get total voting power across all origin wallets
     */
    function getTotalVotingPower() external view returns (uint256) {
        uint256 totalPower = 0;
        // In production, would iterate through all registered countries
        // For now, return placeholder
        return 1000000 ether; // 1M ZPC total voting power
    }

    /**
     * @dev Emergency lock origin wallet (governance action)
     */
    function emergencyLockOriginWallet(string memory countryCode) external onlyOwner {
        require(originWallets[countryCode].multisigAddress != address(0), "Country not registered");
        originWallets[countryCode].locked = true;
    }
}
