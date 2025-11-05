// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title ZippyTrustContract
 * @dev Smart contract for managing trust scores and custom trust fields on-chain
 */
contract ZippyTrustContract is Ownable, ReentrancyGuard {
    using SafeMath for uint256;

    // Trust score structure
    struct TrustScore {
        uint256 score;
        uint256 transactionSuccess;
        uint256 validatorUptime;
        uint256 stakingReliability;
        uint256 networkParticipation;
        uint256 governanceVoting;
        uint256 socialReputation;
        uint256 communityVoting;
        uint256 liquidityProvision;
        uint256 collateralStaking;
        uint256 crossChainActivity;
        uint256 lastUpdated;
        bool isActive;
    }

    // Custom trust field structure
    struct TrustField {
        string name;
        uint8 dataType; // 0: numeric, 1: boolean, 2: categorical
        uint256 weight;
        uint8 dataSource; // 0: on_chain, 1: off_chain, 2: cross_reference
        uint8 updateFrequency; // 0: real_time, 1: hourly, 2: daily, 3: weekly
        bool isActive;
        uint256 createdAt;
    }

    // Trust delegation structure
    struct TrustDelegation {
        address delegator;
        address delegate;
        uint256 amount;
        uint256 timestamp;
        bool isActive;
    }

    // Events
    event TrustScoreUpdated(address indexed wallet, uint256 newScore, uint256 timestamp);
    event TrustFieldCreated(string indexed fieldName, uint8 dataType, uint256 weight);
    event TrustFieldUpdated(string indexed fieldName, uint256 newWeight);
    event TrustDelegated(address indexed delegator, address indexed delegate, uint256 amount);
    event TrustDelegationRevoked(address indexed delegator, address indexed delegate);
    event CustomFieldValueSet(address indexed wallet, string indexed fieldName, uint256 value);

    // Storage
    mapping(address => TrustScore) public trustScores;
    mapping(string => TrustField) public trustFields;
    mapping(address => mapping(string => uint256)) public customFieldValues;
    mapping(address => TrustDelegation[]) public trustDelegations;
    mapping(address => mapping(address => uint256)) public delegatedAmounts;
    
    string[] public fieldNames;
    address[] public trustedWallets;
    
    // Trust score calculation parameters
    uint256 public constant BASE_SCORE_MULTIPLIER = 1000;
    uint256 public constant MAX_TRUST_SCORE = 1000;
    uint256 public constant MIN_TRUST_SCORE = 0;
    
    // Validation thresholds
    uint256 public minimumStakeForValidation = 1000 * 10**18; // 1000 tokens
    uint256 public delegationCooldownPeriod = 7 days;
    uint256 public scoreUpdateCooldown = 1 hours;
    
    // Access control
    mapping(address => bool) public authorizedUpdaters;
    mapping(address => uint256) public lastScoreUpdate;
    
    constructor() {
        authorizedUpdaters[msg.sender] = true;
        _initializeBaseTrustFields();
    }

    /**
     * @dev Initialize the base trust fields
     */
    function _initializeBaseTrustFields() internal {
        _createTrustField("transactionSuccess", 0, 150, 0, 0);
        _createTrustField("validatorUptime", 0, 150, 0, 0);
        _createTrustField("stakingReliability", 0, 130, 0, 1);
        _createTrustField("networkParticipation", 0, 120, 0, 0);
        _createTrustField("governanceVoting", 0, 100, 0, 2);
        _createTrustField("socialReputation", 0, 90, 1, 2);
        _createTrustField("communityVoting", 0, 80, 1, 2);
        _createTrustField("liquidityProvision", 0, 70, 0, 1);
        _createTrustField("collateralStaking", 0, 60, 0, 1);
        _createTrustField("crossChainActivity", 0, 50, 0, 1);
    }

    /**
     * @dev Create a new trust field
     */
    function createTrustField(
        string memory name,
        uint8 dataType,
        uint256 weight,
        uint8 dataSource,
        uint8 updateFrequency
    ) external onlyOwner {
        _createTrustField(name, dataType, weight, dataSource, updateFrequency);
    }

    function _createTrustField(
        string memory name,
        uint8 dataType,
        uint256 weight,
        uint8 dataSource,
        uint8 updateFrequency
    ) internal {
        require(bytes(name).length > 0, "Field name cannot be empty");
        require(dataType <= 2, "Invalid data type");
        require(dataSource <= 2, "Invalid data source");
        require(updateFrequency <= 3, "Invalid update frequency");
        require(!trustFields[name].isActive, "Field already exists");

        trustFields[name] = TrustField({
            name: name,
            dataType: dataType,
            weight: weight,
            dataSource: dataSource,
            updateFrequency: updateFrequency,
            isActive: true,
            createdAt: block.timestamp
        });

        fieldNames.push(name);
        emit TrustFieldCreated(name, dataType, weight);
    }

    /**
     * @dev Update trust score for a wallet
     */
    function updateTrustScore(
        address wallet,
        uint256 transactionSuccess,
        uint256 validatorUptime,
        uint256 stakingReliability,
        uint256 networkParticipation,
        uint256 governanceVoting,
        uint256 socialReputation,
        uint256 communityVoting,
        uint256 liquidityProvision,
        uint256 collateralStaking,
        uint256 crossChainActivity
    ) external nonReentrant {
        require(authorizedUpdaters[msg.sender], "Not authorized to update scores");
        require(wallet != address(0), "Invalid wallet address");
        require(
            block.timestamp >= lastScoreUpdate[wallet].add(scoreUpdateCooldown),
            "Score update cooldown not met"
        );

        // Calculate composite score
        uint256 score = _calculateCompositeScore(
            transactionSuccess,
            validatorUptime,
            stakingReliability,
            networkParticipation,
            governanceVoting,
            socialReputation,
            communityVoting,
            liquidityProvision,
            collateralStaking,
            crossChainActivity
        );

        // Update trust score
        TrustScore storage trustScore = trustScores[wallet];
        trustScore.score = score;
        trustScore.transactionSuccess = transactionSuccess;
        trustScore.validatorUptime = validatorUptime;
        trustScore.stakingReliability = stakingReliability;
        trustScore.networkParticipation = networkParticipation;
        trustScore.governanceVoting = governanceVoting;
        trustScore.socialReputation = socialReputation;
        trustScore.communityVoting = communityVoting;
        trustScore.liquidityProvision = liquidityProvision;
        trustScore.collateralStaking = collateralStaking;
        trustScore.crossChainActivity = crossChainActivity;
        trustScore.lastUpdated = block.timestamp;
        trustScore.isActive = true;

        // Add to trusted wallets if not already present
        if (!_isWalletInTrustedList(wallet)) {
            trustedWallets.push(wallet);
        }

        lastScoreUpdate[wallet] = block.timestamp;
        emit TrustScoreUpdated(wallet, score, block.timestamp);
    }

    /**
     * @dev Set custom field value for a wallet
     */
    function setCustomFieldValue(
        address wallet,
        string memory fieldName,
        uint256 value
    ) external nonReentrant {
        require(authorizedUpdaters[msg.sender], "Not authorized to update fields");
        require(wallet != address(0), "Invalid wallet address");
        require(trustFields[fieldName].isActive, "Field does not exist");

        customFieldValues[wallet][fieldName] = value;
        emit CustomFieldValueSet(wallet, fieldName, value);
    }

    /**
     * @dev Delegate trust to another wallet
     */
    function delegateTrust(address delegate, uint256 amount) external nonReentrant {
        require(delegate != address(0), "Invalid delegate address");
        require(delegate != msg.sender, "Cannot delegate to self");
        require(amount > 0, "Amount must be greater than 0");
        require(trustScores[msg.sender].isActive, "Delegator must have active trust score");

        // Check if delegation already exists
        uint256 existingDelegation = delegatedAmounts[msg.sender][delegate];
        require(existingDelegation == 0, "Delegation already exists");

        // Create delegation
        TrustDelegation memory delegation = TrustDelegation({
            delegator: msg.sender,
            delegate: delegate,
            amount: amount,
            timestamp: block.timestamp,
            isActive: true
        });

        trustDelegations[msg.sender].push(delegation);
        delegatedAmounts[msg.sender][delegate] = amount;

        emit TrustDelegated(msg.sender, delegate, amount);
    }

    /**
     * @dev Revoke trust delegation
     */
    function revokeTrustDelegation(address delegate) external nonReentrant {
        require(delegate != address(0), "Invalid delegate address");
        require(delegatedAmounts[msg.sender][delegate] > 0, "No delegation found");

        // Update delegation status
        TrustDelegation[] storage delegations = trustDelegations[msg.sender];
        for (uint256 i = 0; i < delegations.length; i++) {
            if (delegations[i].delegate == delegate && delegations[i].isActive) {
                delegations[i].isActive = false;
                break;
            }
        }

        delegatedAmounts[msg.sender][delegate] = 0;
        emit TrustDelegationRevoked(msg.sender, delegate);
    }

    /**
     * @dev Calculate composite trust score
     */
    function _calculateCompositeScore(
        uint256 transactionSuccess,
        uint256 validatorUptime,
        uint256 stakingReliability,
        uint256 networkParticipation,
        uint256 governanceVoting,
        uint256 socialReputation,
        uint256 communityVoting,
        uint256 liquidityProvision,
        uint256 collateralStaking,
        uint256 crossChainActivity
    ) internal pure returns (uint256) {
        uint256 baseScore = transactionSuccess.mul(15).add(
            validatorUptime.mul(15)
        ).add(
            stakingReliability.mul(13)
        ).add(
            networkParticipation.mul(12)
        ).add(
            governanceVoting.mul(10)
        ).add(
            socialReputation.mul(9)
        ).add(
            communityVoting.mul(8)
        ).add(
            liquidityProvision.mul(7)
        ).add(
            collateralStaking.mul(6)
        ).add(
            crossChainActivity.mul(5)
        );

        baseScore = baseScore.div(100);
        
        if (baseScore > MAX_TRUST_SCORE) {
            baseScore = MAX_TRUST_SCORE;
        }

        return baseScore;
    }

    /**
     * @dev Get trust score for a wallet
     */
    function getTrustScore(address wallet) external view returns (TrustScore memory) {
        return trustScores[wallet];
    }

    /**
     * @dev Get custom field value for a wallet
     */
    function getCustomFieldValue(address wallet, string memory fieldName) external view returns (uint256) {
        return customFieldValues[wallet][fieldName];
    }

    /**
     * @dev Get trust field details
     */
    function getTrustField(string memory name) external view returns (TrustField memory) {
        return trustFields[name];
    }

    /**
     * @dev Get all field names
     */
    function getFieldNames() external view returns (string[] memory) {
        return fieldNames;
    }

    /**
     * @dev Get trusted wallets count
     */
    function getTrustedWalletsCount() external view returns (uint256) {
        return trustedWallets.length;
    }

    /**
     * @dev Check if wallet is in trusted list
     */
    function _isWalletInTrustedList(address wallet) internal view returns (bool) {
        for (uint256 i = 0; i < trustedWallets.length; i++) {
            if (trustedWallets[i] == wallet) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Add authorized updater
     */
    function addAuthorizedUpdater(address updater) external onlyOwner {
        authorizedUpdaters[updater] = true;
    }

    /**
     * @dev Remove authorized updater
     */
    function removeAuthorizedUpdater(address updater) external onlyOwner {
        authorizedUpdaters[updater] = false;
    }

    /**
     * @dev Update trust field weight
     */
    function updateTrustFieldWeight(string memory fieldName, uint256 newWeight) external onlyOwner {
        require(trustFields[fieldName].isActive, "Field does not exist");
        trustFields[fieldName].weight = newWeight;
        emit TrustFieldUpdated(fieldName, newWeight);
    }

    /**
     * @dev Emergency pause function
     */
    function pause() external onlyOwner {
        // Implementation for emergency pause
    }

    /**
     * @dev Get delegation details
     */
    function getDelegations(address delegator) external view returns (TrustDelegation[] memory) {
        return trustDelegations[delegator];
    }
}
