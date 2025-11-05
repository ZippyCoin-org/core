// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./TrustEngine.sol";

/**
 * @title ZippyCoin Bridge
 * @dev Simplified cross-chain bridge with trust-weighted validation
 */
contract Bridge is ReentrancyGuard, Ownable {
    
    // Trust Engine integration
    TrustEngine public trustEngine;
    
    // Bridge state
    mapping(bytes32 => bool) public processedTransfers;
    mapping(address => bool) public validators;
    mapping(address => uint256) public validatorTrustScores;
    
    uint256 public minValidatorTrustScore = 50;
    uint256 public requiredValidations = 3;
    uint256 public transferCount;
    
    // Events
    event TransferInitiated(
        bytes32 indexed transferId,
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        uint256 sourceChainId,
        uint256 targetChainId
    );
    event TransferValidated(
        bytes32 indexed transferId,
        address indexed validator,
        uint256 trustScore
    );
    event TransferCompleted(
        bytes32 indexed transferId,
        address indexed recipient,
        uint256 amount
    );
    event ValidatorAdded(address indexed validator, uint256 trustScore);
    event ValidatorRemoved(address indexed validator);

    constructor(address _trustEngine) {
        trustEngine = TrustEngine(_trustEngine);
    }

    /**
     * @dev Initiate a cross-chain transfer
     */
    function initiateTransfer(
        address recipient,
        uint256 amount,
        uint256 targetChainId
    ) external nonReentrant {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be positive");
        require(targetChainId != block.chainid, "Cannot transfer to same chain");
        
        uint256 trustScore = trustEngine.getTrustScoreValue(msg.sender);
        require(trustScore >= 20, "Insufficient trust score");
        
        // Transfer tokens to bridge
        IERC20(msg.sender).transferFrom(msg.sender, address(this), amount);
        
        transferCount++;
        bytes32 transferId = keccak256(abi.encodePacked(
            msg.sender,
            recipient,
            amount,
            block.chainid,
            targetChainId,
            transferCount
        ));
        
        emit TransferInitiated(transferId, msg.sender, recipient, amount, block.chainid, targetChainId);
    }

    /**
     * @dev Validate a cross-chain transfer
     */
    function validateTransfer(
        bytes32 transferId,
        address sender,
        address recipient,
        uint256 amount,
        uint256 sourceChainId,
        uint256 targetChainId
    ) external {
        require(validators[msg.sender], "Not a validator");
        require(!processedTransfers[transferId], "Transfer already processed");
        
        uint256 trustScore = trustEngine.getTrustScoreValue(msg.sender);
        require(trustScore >= minValidatorTrustScore, "Insufficient validator trust score");
        
        // Verify transfer hash
        bytes32 expectedTransferId = keccak256(abi.encodePacked(
            sender,
            recipient,
            amount,
            sourceChainId,
            targetChainId
        ));
        require(transferId == expectedTransferId, "Invalid transfer hash");
        
        emit TransferValidated(transferId, msg.sender, trustScore);
    }

    /**
     * @dev Complete a cross-chain transfer
     */
    function completeTransfer(
        bytes32 transferId,
        address recipient,
        uint256 amount
    ) external onlyOwner {
        require(!processedTransfers[transferId], "Transfer already processed");
        
        processedTransfers[transferId] = true;
        
        // Transfer tokens to recipient
        IERC20(msg.sender).transfer(recipient, amount);
        
        emit TransferCompleted(transferId, recipient, amount);
    }

    /**
     * @dev Add a validator
     */
    function addValidator(address validator) external onlyOwner {
        require(validator != address(0), "Invalid validator");
        require(!validators[validator], "Already a validator");
        
        uint256 trustScore = trustEngine.getTrustScoreValue(validator);
        require(trustScore >= minValidatorTrustScore, "Insufficient trust score");
        
        validators[validator] = true;
        validatorTrustScores[validator] = trustScore;
        
        emit ValidatorAdded(validator, trustScore);
    }

    /**
     * @dev Remove a validator
     */
    function removeValidator(address validator) external onlyOwner {
        require(validators[validator], "Not a validator");
        
        validators[validator] = false;
        validatorTrustScores[validator] = 0;
        
        emit ValidatorRemoved(validator);
    }

    /**
     * @dev Set minimum validator trust score
     */
    function setMinValidatorTrustScore(uint256 newScore) external onlyOwner {
        minValidatorTrustScore = newScore;
    }

    /**
     * @dev Set required number of validations
     */
    function setRequiredValidations(uint256 newCount) external onlyOwner {
        require(newCount > 0, "Must require at least 1 validation");
        requiredValidations = newCount;
    }

    /**
     * @dev Check if transfer has been processed
     */
    function isTransferProcessed(bytes32 transferId) external view returns (bool) {
        return processedTransfers[transferId];
    }

    /**
     * @dev Check if address is a validator
     */
    function isValidator(address validator) external view returns (bool) {
        return validators[validator];
    }

    /**
     * @dev Get validator trust score
     */
    function getValidatorTrustScore(address validator) external view returns (uint256) {
        return validatorTrustScores[validator];
    }
} 