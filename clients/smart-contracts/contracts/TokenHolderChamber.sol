// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./TrustEngine.sol";

/**
 * @title Token Holder Chamber - Quadratic Voting Governance
 * @dev Bicameral governance chamber for ZPC token holders with quadratic voting
 * Voting power = sqrt(tokens) for fairness and anti-whaling
 */
contract TokenHolderChamber is ReentrancyGuard, Ownable {
    TrustEngine public trustEngine;
    IERC20 public zpcToken; // ZPC governance token

    struct TokenHolder {
        uint256 balance;
        uint256 votingPower; // sqrt(balance) for quadratic voting
        uint256 trustScore;
        uint256 lastUpdate;
        bool isDelegated;
        address delegate;
    }

    struct QuadraticProposal {
        uint256 id;
        address proposer;
        string title;
        string description;
        uint256 startTime;
        uint256 endTime;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        bool executed;
        bool emergency;
        uint256 totalVotingPower; // Cache for efficiency
    }

    struct QuadraticVote {
        bool hasVoted;
        uint8 choice; // 0=against, 1=for, 2=abstain
        uint256 votingPower; // sqrt(tokens) at vote time
        uint256 timestamp;
    }

    mapping(address => TokenHolder) public tokenHolders;
    mapping(uint256 => QuadraticProposal) public proposals;
    mapping(uint256 => mapping(address => QuadraticVote)) public proposalVotes;

    uint256 public proposalCount;
    uint256 public constant VOTING_PERIOD = 7 days;
    uint256 public constant EMERGENCY_VOTING_PERIOD = 24 hours;
    uint256 public constant MIN_PROPOSAL_THRESHOLD = 10000 ether; // 10K ZPC to propose
    uint256 public constant QUADRATIC_MAJORITY = 500; // 50% of voting power

    event TokensDeposited(address indexed holder, uint256 amount, uint256 votingPower);
    event TokensWithdrawn(address indexed holder, uint256 amount);
    event VotingPowerUpdated(address indexed holder, uint256 newVotingPower);
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, bool emergency);
    event QuadraticVoteCast(uint256 indexed proposalId, address indexed voter, uint8 choice, uint256 votingPower);
    event ProposalExecuted(uint256 indexed proposalId);

    constructor(address _trustEngine, address _zpcToken) {
        trustEngine = TrustEngine(_trustEngine);
        zpcToken = IERC20(_zpcToken);
    }

    /**
     * @dev Deposit ZPC tokens to gain voting power
     */
    function depositTokens(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be positive");
        require(zpcToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        TokenHolder storage holder = tokenHolders[msg.sender];
        holder.balance += amount;
        holder.votingPower = sqrt(holder.balance); // Quadratic voting power
        holder.trustScore = trustEngine.getTrustScoreValue(msg.sender);
        holder.lastUpdate = block.timestamp;

        emit TokensDeposited(msg.sender, amount, holder.votingPower);
    }

    /**
     * @dev Withdraw ZPC tokens (reduces voting power)
     */
    function withdrawTokens(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be positive");
        TokenHolder storage holder = tokenHolders[msg.sender];
        require(holder.balance >= amount, "Insufficient balance");

        holder.balance -= amount;
        holder.votingPower = sqrt(holder.balance);
        holder.lastUpdate = block.timestamp;

        require(zpcToken.transfer(msg.sender, amount), "Transfer failed");

        emit TokensWithdrawn(msg.sender, amount);
        emit VotingPowerUpdated(msg.sender, holder.votingPower);
    }

    /**
     * @dev Delegate voting power to another address
     */
    function delegateVotingPower(address delegate) external {
        require(delegate != address(0), "Invalid delegate");
        require(delegate != msg.sender, "Cannot delegate to self");

        TokenHolder storage holder = tokenHolders[msg.sender];
        require(holder.balance > 0, "No tokens to delegate");

        holder.isDelegated = true;
        holder.delegate = delegate;

        // Update delegate's effective voting power
        // This is simplified - production would need more complex delegation logic
    }

    /**
     * @dev Create a quadratic voting proposal
     */
    function createProposal(
        string memory title,
        string memory description,
        bool emergency
    ) external returns (uint256) {
        TokenHolder storage holder = tokenHolders[msg.sender];
        require(holder.balance >= MIN_PROPOSAL_THRESHOLD, "Insufficient tokens to propose");

        proposalCount++;
        uint256 votingPeriod = emergency ? EMERGENCY_VOTING_PERIOD : VOTING_PERIOD;

        proposals[proposalCount] = QuadraticProposal({
            id: proposalCount,
            proposer: msg.sender,
            title: title,
            description: description,
            startTime: block.timestamp,
            endTime: block.timestamp + votingPeriod,
            forVotes: 0,
            againstVotes: 0,
            abstainVotes: 0,
            executed: false,
            emergency: emergency,
            totalVotingPower: getTotalVotingPower()
        });

        emit ProposalCreated(proposalCount, msg.sender, emergency);
        return proposalCount;
    }

    /**
     * @dev Cast a quadratic vote (voting power = sqrt(tokens))
     */
    function castQuadraticVote(uint256 proposalId, uint8 choice) external {
        require(choice <= 2, "Invalid vote choice");
        require(proposals[proposalId].id != 0, "Proposal does not exist");
        require(block.timestamp >= proposals[proposalId].startTime, "Voting not started");
        require(block.timestamp <= proposals[proposalId].endTime, "Voting ended");
        require(!proposalVotes[proposalId][msg.sender].hasVoted, "Already voted");

        uint256 votingPower = getEffectiveVotingPower(msg.sender);
        require(votingPower > 0, "No voting power");

        proposalVotes[proposalId][msg.sender] = QuadraticVote({
            hasVoted: true,
            choice: choice,
            votingPower: votingPower,
            timestamp: block.timestamp
        });

        if (choice == 0) {
            proposals[proposalId].againstVotes += votingPower;
        } else if (choice == 1) {
            proposals[proposalId].forVotes += votingPower;
        } else {
            proposals[proposalId].abstainVotes += votingPower;
        }

        emit QuadraticVoteCast(proposalId, msg.sender, choice, votingPower);
    }

    /**
     * @dev Execute a proposal if it passes quadratic voting
     */
    function executeProposal(uint256 proposalId) external {
        QuadraticProposal storage proposal = proposals[proposalId];
        require(proposal.id != 0, "Proposal does not exist");
        require(block.timestamp > proposal.endTime, "Voting not ended");
        require(!proposal.executed, "Already executed");

        uint256 totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
        uint256 forPercentage = proposal.forVotes * 1000 / totalVotes;

        require(forPercentage >= QUADRATIC_MAJORITY, "Proposal did not pass");

        proposal.executed = true;

        // Execute proposal logic would go here
        // This is a placeholder for actual execution logic

        emit ProposalExecuted(proposalId);
    }

    /**
     * @dev Get effective voting power for an address (includes delegation)
     */
    function getEffectiveVotingPower(address voter) public view returns (uint256) {
        TokenHolder memory holder = tokenHolders[voter];

        if (holder.isDelegated && holder.delegate != address(0)) {
            // If delegated, return 0 for direct voting
            return 0;
        }

        // Include trust multiplier
        uint256 basePower = holder.votingPower;
        uint256 trustMultiplier = holder.trustScore > 0 ? holder.trustScore : 50; // Default trust

        return basePower * trustMultiplier / 100;
    }

    /**
     * @dev Get total voting power across all token holders
     */
    function getTotalVotingPower() public view returns (uint256) {
        // In production, would iterate through all holders
        // For now, return circulating supply estimate
        return 10000000 ether; // 10M ZPC circulating
    }

    /**
     * @dev Calculate square root for quadratic voting (simplified)
     */
    function sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }

    /**
     * @dev Update trust scores for all holders (governance action)
     */
    function updateTrustScores() external onlyOwner {
        // Batch update trust scores for all token holders
        // This would be called periodically by governance
    }

    /**
     * @dev Emergency pause token deposits/withdrawals
     */
    function emergencyPause() external onlyOwner {
        // Emergency pause logic
    }
}
