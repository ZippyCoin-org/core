// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title ZippyCoin Trust Engine Smart Contract
 * @dev Implements the mathematical trust propagation model with anti-gaming mechanisms
 * @notice Based on the specification in TRUST_ENGINE_FINAL_SPECIFICATION.md
 */
contract TrustEngine is Ownable, ReentrancyGuard {
    using SafeMath for uint256;

    // Trust score precision (100 = 100.00%)
    uint256 public constant TRUST_PRECISION = 10000;
    uint256 public constant MAX_TRUST_SCORE = 10000; // 100.00%
    uint256 public constant MIN_DELEGATION_AMOUNT = 1000 * 10**18; // 1000 ZPC minimum
    
    // Delegation decay factor (90% = 9000/10000)
    uint256 public delegationDecayFactor = 9000;
    
    // Maximum delegation depth
    uint256 public maxDelegationDepth = 10;
    
    // Time constants
    uint256 public constant EPOCH_DURATION = 1 days;
    uint256 public constant GRACE_PERIOD = 3 days;

    struct TrustData {
        uint256 baseScore;          // Base trust score (0-10000)
        uint256 effectiveScore;     // Calculated effective score
        uint256 reputation;         // Multi-dimensional reputation
        uint256 stakeAmount;        // Staked ZPC amount
        uint256 lastUpdate;        // Last score update timestamp
        uint256 delegationDepth;   // Depth from nearest Origin Wallet
        bool isOriginWallet;       // Is this an Origin Wallet?
        bool isValidator;          // Is this a validator?
        bool isActive;             // Is this wallet active?
    }

    struct Delegation {
        address delegator;         // Who delegated trust
        address delegatee;         // Who received trust delegation
        uint256 amount;           // Amount of ZPC staked in delegation
        uint256 trustScore;       // Trust score at time of delegation
        uint256 timestamp;        // When delegation was created
        bool isActive;            // Is delegation still active
    }

    struct ReputationMetrics {
        uint256 transactionSuccess;    // Successful transaction ratio
        uint256 validatorUptime;       // Validator uptime percentage
        uint256 communityVoting;       // Community governance participation
        uint256 securityCompliance;    // Security audit compliance
        uint256 networkContribution;   // Network contribution score
        uint256 timeOnNetwork;        // Length of time on network
        uint256 stakeConsistency;     // Consistency of stake amounts
        uint256 delegationQuality;    // Quality of trust delegations
        uint256 fraudPrevention;      // Fraud prevention contribution
        uint256 ecosystemGrowth;      // Contribution to ecosystem growth
        uint256 innovationContrib;    // Innovation contributions
        uint256 socialTrust;          // Social trust indicators
    }

    // Mapping from wallet address to trust data
    mapping(address => TrustData) public trustRegistry;
    
    // Mapping from delegation ID to delegation data
    mapping(bytes32 => Delegation) public delegations;
    
    // Mapping from wallet to reputation metrics
    mapping(address => ReputationMetrics) public reputationMetrics;
    
    // Mapping from wallet to list of delegation IDs
    mapping(address => bytes32[]) public walletDelegations;
    
    // Mapping from wallet to delegated wallets (who they delegated to)
    mapping(address => address[]) public delegatedWallets;
    
    // Mapping from wallet to delegating wallets (who delegated to them)
    mapping(address => address[]) public delegatingWallets;
    
    // Origin Wallets registry
    mapping(address => bool) public originWallets;
    address[] public originWalletList;
    
    // Anti-gaming detection
    mapping(address => uint256) public lastDelegationTime;
    mapping(address => uint256) public delegationCount;
    
    // Events
    event TrustScoreUpdated(address indexed wallet, uint256 oldScore, uint256 newScore);
    event DelegationCreated(bytes32 indexed delegationId, address indexed delegator, address indexed delegatee, uint256 amount);
    event DelegationRevoked(bytes32 indexed delegationId, address indexed delegator, address indexed delegatee);
    event OriginWalletAdded(address indexed wallet, string country);
    event OriginWalletRemoved(address indexed wallet);
    event ReputationUpdated(address indexed wallet, uint256 newReputation);
    event AntiGamingAlert(address indexed wallet, string reason);

    modifier onlyOriginWallet() {
        require(originWallets[msg.sender], "TrustEngine: Only Origin Wallets can call this function");
        _;
    }

    modifier validAddress(address _wallet) {
        require(_wallet != address(0), "TrustEngine: Invalid wallet address");
        _;
    }

    constructor() {
        // Initialize contract with deployer as temporary origin wallet
        _addOriginWallet(msg.sender, "Foundation");
    }

    /**
     * @dev Add a new Origin Wallet (government-backed)
     * @param _wallet Address of the Origin Wallet
     * @param _country Country code for the Origin Wallet
     */
    function addOriginWallet(address _wallet, string memory _country) 
        external 
        onlyOwner 
        validAddress(_wallet) 
    {
        _addOriginWallet(_wallet, _country);
    }

    function _addOriginWallet(address _wallet, string memory _country) internal {
        require(!originWallets[_wallet], "TrustEngine: Already an Origin Wallet");
        
        originWallets[_wallet] = true;
        originWalletList.push(_wallet);
        
        // Origin Wallets start with maximum trust score
        trustRegistry[_wallet] = TrustData({
            baseScore: MAX_TRUST_SCORE,
            effectiveScore: MAX_TRUST_SCORE,
            reputation: MAX_TRUST_SCORE,
            stakeAmount: 0,
            lastUpdate: block.timestamp,
            delegationDepth: 0,
            isOriginWallet: true,
            isValidator: false,
            isActive: true
        });
        
        emit OriginWalletAdded(_wallet, _country);
        emit TrustScoreUpdated(_wallet, 0, MAX_TRUST_SCORE);
    }

    /**
     * @dev Create a trust delegation from one wallet to another
     * @param _delegatee Address to delegate trust to
     * @param _amount Amount of ZPC to stake in delegation
     */
    function createDelegation(address _delegatee, uint256 _amount) 
        external 
        nonReentrant 
        validAddress(_delegatee) 
    {
        require(_delegatee != msg.sender, "TrustEngine: Cannot delegate to self");
        require(_amount >= MIN_DELEGATION_AMOUNT, "TrustEngine: Delegation amount too small");
        require(trustRegistry[msg.sender].isActive, "TrustEngine: Delegator wallet not active");
        
        // Anti-gaming: Rate limiting
        require(
            block.timestamp >= lastDelegationTime[msg.sender].add(1 hours),
            "TrustEngine: Delegation rate limit exceeded"
        );
        
        // Anti-gaming: Delegation count limiting
        require(
            delegationCount[msg.sender] < 100,
            "TrustEngine: Too many delegations"
        );
        
        // Calculate delegation depth
        uint256 delegatorDepth = trustRegistry[msg.sender].delegationDepth;
        require(delegatorDepth < maxDelegationDepth, "TrustEngine: Delegation depth exceeded");
        
        // Generate delegation ID
        bytes32 delegationId = keccak256(
            abi.encodePacked(msg.sender, _delegatee, _amount, block.timestamp)
        );
        
        // Create delegation record
        delegations[delegationId] = Delegation({
            delegator: msg.sender,
            delegatee: _delegatee,
            amount: _amount,
            trustScore: trustRegistry[msg.sender].effectiveScore,
            timestamp: block.timestamp,
            isActive: true
        });
        
        // Update delegation mappings
        walletDelegations[msg.sender].push(delegationId);
        delegatedWallets[msg.sender].push(_delegatee);
        delegatingWallets[_delegatee].push(msg.sender);
        
        // Update anti-gaming counters
        lastDelegationTime[msg.sender] = block.timestamp;
        delegationCount[msg.sender] = delegationCount[msg.sender].add(1);
        
        // Initialize delegatee if not exists
        if (!trustRegistry[_delegatee].isActive) {
            trustRegistry[_delegatee] = TrustData({
                baseScore: 0,
                effectiveScore: 0,
                reputation: 5000, // Start with neutral reputation
                stakeAmount: 0,
                lastUpdate: block.timestamp,
                delegationDepth: delegatorDepth.add(1),
                isOriginWallet: false,
                isValidator: false,
                isActive: true
            });
        }
        
        // Recalculate trust scores
        _recalculateTrustScore(_delegatee);
        
        emit DelegationCreated(delegationId, msg.sender, _delegatee, _amount);
    }

    /**
     * @dev Calculate effective trust score using the mathematical model
     * T(w) = min(T(p₁), T(p₂), ..., T(pₙ)) × δᵈ × ρ(w) × η(w) × σ(w)
     */
    function _recalculateTrustScore(address _wallet) internal {
        TrustData storage trustData = trustRegistry[_wallet];
        
        if (trustData.isOriginWallet) {
            // Origin Wallets maintain maximum trust score
            trustData.effectiveScore = MAX_TRUST_SCORE;
            return;
        }
        
        // Find minimum trust score from all delegators
        uint256 minDelegatorTrust = MAX_TRUST_SCORE;
        bool hasDelegators = false;
        
        address[] memory delegators = delegatingWallets[_wallet];
        for (uint256 i = 0; i < delegators.length; i++) {
            address delegator = delegators[i];
            if (trustRegistry[delegator].isActive) {
                hasDelegators = true;
                uint256 delegatorTrust = trustRegistry[delegator].effectiveScore;
                if (delegatorTrust < minDelegatorTrust) {
                    minDelegatorTrust = delegatorTrust;
                }
            }
        }
        
        if (!hasDelegators) {
            trustData.effectiveScore = 0;
            return;
        }
        
        // Apply delegation decay factor δᵈ
        uint256 decayedTrust = minDelegatorTrust;
        for (uint256 d = 0; d < trustData.delegationDepth; d++) {
            decayedTrust = decayedTrust.mul(delegationDecayFactor).div(TRUST_PRECISION);
        }
        
        // Apply reputation factor ρ(w)
        uint256 reputationFactor = _calculateReputationFactor(_wallet);
        decayedTrust = decayedTrust.mul(reputationFactor).div(TRUST_PRECISION);
        
        // Apply network effect η(w) - based on number of delegations
        uint256 networkFactor = _calculateNetworkEffect(_wallet);
        decayedTrust = decayedTrust.mul(networkFactor).div(TRUST_PRECISION);
        
        // Apply stake factor σ(w) - based on staked amount
        uint256 stakeFactor = _calculateStakeFactor(_wallet);
        decayedTrust = decayedTrust.mul(stakeFactor).div(TRUST_PRECISION);
        
        uint256 oldScore = trustData.effectiveScore;
        trustData.effectiveScore = decayedTrust;
        trustData.lastUpdate = block.timestamp;
        
        emit TrustScoreUpdated(_wallet, oldScore, decayedTrust);
    }

    /**
     * @dev Calculate reputation factor based on multi-dimensional metrics
     */
    function _calculateReputationFactor(address _wallet) internal view returns (uint256) {
        ReputationMetrics memory metrics = reputationMetrics[_wallet];
        
        // Weighted average of reputation metrics
        uint256 reputationScore = 0;
        reputationScore = reputationScore.add(metrics.transactionSuccess.mul(15)); // 15%
        reputationScore = reputationScore.add(metrics.validatorUptime.mul(10));    // 10%
        reputationScore = reputationScore.add(metrics.communityVoting.mul(8));     // 8%
        reputationScore = reputationScore.add(metrics.securityCompliance.mul(12)); // 12%
        reputationScore = reputationScore.add(metrics.networkContribution.mul(10)); // 10%
        reputationScore = reputationScore.add(metrics.timeOnNetwork.mul(8));       // 8%
        reputationScore = reputationScore.add(metrics.stakeConsistency.mul(7));    // 7%
        reputationScore = reputationScore.add(metrics.delegationQuality.mul(10));  // 10%
        reputationScore = reputationScore.add(metrics.fraudPrevention.mul(8));     // 8%
        reputationScore = reputationScore.add(metrics.ecosystemGrowth.mul(5));     // 5%
        reputationScore = reputationScore.add(metrics.innovationContrib.mul(4));   // 4%
        reputationScore = reputationScore.add(metrics.socialTrust.mul(3));         // 3%
        
        reputationScore = reputationScore.div(100); // Total = 100%
        
        // Ensure reputation factor is between 0.5 and 1.0
        if (reputationScore < 5000) reputationScore = 5000; // Minimum 50%
        if (reputationScore > TRUST_PRECISION) reputationScore = TRUST_PRECISION;
        
        return reputationScore;
    }

    /**
     * @dev Calculate network effect factor
     */
    function _calculateNetworkEffect(address _wallet) internal view returns (uint256) {
        uint256 delegationCount = delegatingWallets[_wallet].length;
        
        // Network effect increases with more delegators, but with diminishing returns
        if (delegationCount == 0) return 5000; // 50% if no delegators
        if (delegationCount >= 10) return TRUST_PRECISION; // 100% if 10+ delegators
        
        // Linear interpolation between 50% and 100%
        return 5000 + (delegationCount * 500); // +5% per delegator
    }

    /**
     * @dev Calculate stake factor based on staked amount
     */
    function _calculateStakeFactor(address _wallet) internal view returns (uint256) {
        uint256 stakeAmount = trustRegistry[_wallet].stakeAmount;
        
        // Logarithmic stake factor to prevent whale dominance
        if (stakeAmount < MIN_DELEGATION_AMOUNT) return 7000; // 70% if below minimum
        
        // Calculate log base 2 of stake amount (simplified)
        uint256 stakeFactor = 7000 + (stakeAmount / MIN_DELEGATION_AMOUNT * 100);
        if (stakeFactor > TRUST_PRECISION) stakeFactor = TRUST_PRECISION;
        
        return stakeFactor;
    }

    /**
     * @dev Update reputation metrics for a wallet
     */
    function updateReputationMetrics(
        address _wallet,
        uint256[12] calldata _metrics
    ) external onlyOriginWallet validAddress(_wallet) {
        reputationMetrics[_wallet] = ReputationMetrics({
            transactionSuccess: _metrics[0],
            validatorUptime: _metrics[1],
            communityVoting: _metrics[2],
            securityCompliance: _metrics[3],
            networkContribution: _metrics[4],
            timeOnNetwork: _metrics[5],
            stakeConsistency: _metrics[6],
            delegationQuality: _metrics[7],
            fraudPrevention: _metrics[8],
            ecosystemGrowth: _metrics[9],
            innovationContrib: _metrics[10],
            socialTrust: _metrics[11]
        });
        
        // Recalculate trust score with new reputation
        _recalculateTrustScore(_wallet);
        
        emit ReputationUpdated(_wallet, _calculateReputationFactor(_wallet));
    }

    /**
     * @dev Get trust score for a wallet
     */
    function getTrustScore(address _wallet) external view returns (uint256) {
        return trustRegistry[_wallet].effectiveScore;
    }

    /**
     * @dev Get all delegation IDs for a wallet
     */
    function getWalletDelegations(address _wallet) external view returns (bytes32[] memory) {
        return walletDelegations[_wallet];
    }

    /**
     * @dev Get all wallets that delegated to a specific wallet
     */
    function getDelegatingWallets(address _wallet) external view returns (address[] memory) {
        return delegatingWallets[_wallet];
    }

    /**
     * @dev Get all wallets that a specific wallet delegated to
     */
    function getDelegatedWallets(address _wallet) external view returns (address[] memory) {
        return delegatedWallets[_wallet];
    }

    /**
     * @dev Emergency function to update delegation decay factor
     */
    function updateDelegationDecayFactor(uint256 _newFactor) external onlyOwner {
        require(_newFactor >= 5000 && _newFactor <= 9999, "TrustEngine: Invalid decay factor");
        delegationDecayFactor = _newFactor;
    }

    /**
     * @dev Emergency function to update maximum delegation depth
     */
    function updateMaxDelegationDepth(uint256 _newDepth) external onlyOwner {
        require(_newDepth >= 3 && _newDepth <= 20, "TrustEngine: Invalid delegation depth");
        maxDelegationDepth = _newDepth;
    }
} 