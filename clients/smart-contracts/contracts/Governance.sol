// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./TrustEngine.sol";

/**
 * @title ZippyCoin Governance
 * @dev Simplified governance with trust-weighted voting
 */
contract Governance is ReentrancyGuard, Ownable {
    
    // Trust Engine integration
    TrustEngine public trustEngine;
    
    // Simplified proposal storage
    mapping(uint256 => address) public proposalProposer;
    mapping(uint256 => string) public proposalTitle;
    mapping(uint256 => uint256) public proposalStartTime;
    mapping(uint256 => uint256) public proposalEndTime;
    mapping(uint256 => uint256) public proposalForVotes;
    mapping(uint256 => uint256) public proposalAgainstVotes;
    mapping(uint256 => bool) public proposalExecuted;
    mapping(uint256 => bool) public proposalCanceled;
    
    // Voting tracking
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(address => bool)) public voteSupport;
    
    uint256 public proposalCount;
    uint256 public constant VOTING_PERIOD = 3 days;
    uint256 public constant QUORUM = 1000;
    
    // Events
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string title);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId);

    constructor(address _trustEngine) {
        trustEngine = TrustEngine(_trustEngine);
    }

    /**
     * @dev Create a new governance proposal
     */
    function createProposal(string memory title) external {
        require(bytes(title).length > 0, "Title required");
        
        uint256 trustScore = trustEngine.getTrustScoreValue(msg.sender);
        require(trustScore >= 30, "Insufficient trust score");
        
        proposalCount++;
        uint256 proposalId = proposalCount;
        
        proposalProposer[proposalId] = msg.sender;
        proposalTitle[proposalId] = title;
        proposalStartTime[proposalId] = block.timestamp;
        proposalEndTime[proposalId] = block.timestamp + VOTING_PERIOD;
        
        emit ProposalCreated(proposalId, msg.sender, title);
    }

    /**
     * @dev Vote on a proposal
     */
    function vote(uint256 proposalId, bool support) external {
        require(proposalId > 0 && proposalId <= proposalCount, "Invalid proposal");
        require(block.timestamp >= proposalStartTime[proposalId], "Voting not started");
        require(block.timestamp <= proposalEndTime[proposalId], "Voting ended");
        require(!proposalExecuted[proposalId] && !proposalCanceled[proposalId], "Proposal already executed/canceled");
        require(!hasVoted[proposalId][msg.sender], "Already voted");
        
        uint256 trustScore = trustEngine.getTrustScoreValue(msg.sender);
        require(trustScore >= 20, "Insufficient trust score");
        
        hasVoted[proposalId][msg.sender] = true;
        voteSupport[proposalId][msg.sender] = support;
        
        if (support) {
            proposalForVotes[proposalId] += trustScore;
        } else {
            proposalAgainstVotes[proposalId] += trustScore;
        }
        
        emit VoteCast(proposalId, msg.sender, support, trustScore);
    }

    /**
     * @dev Execute a proposal
     */
    function executeProposal(uint256 proposalId) external onlyOwner {
        require(proposalId > 0 && proposalId <= proposalCount, "Invalid proposal");
        require(block.timestamp > proposalEndTime[proposalId], "Voting not ended");
        require(!proposalExecuted[proposalId], "Proposal already executed");
        require(proposalForVotes[proposalId] + proposalAgainstVotes[proposalId] >= QUORUM, "Quorum not reached");
        
        proposalExecuted[proposalId] = true;
        
        emit ProposalExecuted(proposalId);
    }

    /**
     * @dev Get proposal details
     */
    function getProposal(uint256 proposalId) external view returns (
        address proposer,
        string memory title,
        uint256 startTime,
        uint256 endTime,
        uint256 forVotes,
        uint256 againstVotes,
        bool executed,
        bool canceled
    ) {
        require(proposalId > 0 && proposalId <= proposalCount, "Invalid proposal");
        
        proposer = proposalProposer[proposalId];
        title = proposalTitle[proposalId];
        startTime = proposalStartTime[proposalId];
        endTime = proposalEndTime[proposalId];
        forVotes = proposalForVotes[proposalId];
        againstVotes = proposalAgainstVotes[proposalId];
        executed = proposalExecuted[proposalId];
        canceled = proposalCanceled[proposalId];
    }

    /**
     * @dev Check if user has voted on a proposal
     */
    function hasUserVoted(uint256 proposalId, address user) external view returns (bool) {
        return hasVoted[proposalId][user];
    }

    /**
     * @dev Get user's vote on a proposal
     */
    function getUserVote(uint256 proposalId, address user) external view returns (bool support) {
        require(hasVoted[proposalId][user], "User has not voted");
        return voteSupport[proposalId][user];
    }
} 