// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
// Hardhat console import removed for production
import "./TrustEngine.sol";

/**
 * @title SafeMath for additional precision operations
 */
library PreciseMath {
    using SafeMath for uint256;

    uint256 private constant PRECISION = 1e18;

    /**
     * @dev Multiplies two numbers with precision
     */
    function mulPrecise(uint256 a, uint256 b) internal pure returns (uint256) {
        return a.mul(b).div(PRECISION);
    }

    /**
     * @dev Divides two numbers with precision
     */
    function divPrecise(uint256 a, uint256 b) internal pure returns (uint256) {
        return a.mul(PRECISION).div(b);
    }

    /**
     * @dev Calculates percentage with precision
     */
    function percentage(uint256 amount, uint256 percent) internal pure returns (uint256) {
        return amount.mul(percent).div(100);
    }
}

/**
 * @title ZippyCoin DeFi Protocol
 * @dev Simplified DeFi protocol with trust-weighted yield farming
 */
contract DeFiProtocol is ReentrancyGuard, Ownable {
    using SafeMath for uint256;
    using PreciseMath for uint256;

    // Trust Engine integration
    TrustEngine public trustEngine;
    
    // Protocol state
    uint256 public totalValueLocked;
    uint256 public protocolFee = 25; // 0.25% (basis points)
    uint256 public constant BASIS_POINTS = 10000;
    
    // Simplified yield farming pools
    mapping(address => bool) public activePools;
    mapping(address => uint256) public poolTotalStaked;
    mapping(address => uint256) public poolRewardsPerBlock;
    mapping(address => uint256) public poolLastUpdateBlock;
    mapping(address => uint256) public poolAccRewardsPerShare;
    mapping(address => uint256) public poolTrustMultiplier;
    
    // User staking info
    mapping(address => mapping(address => uint256)) public userStakedAmount; // user => pool => amount
    mapping(address => mapping(address => uint256)) public userRewardDebt; // user => pool => debt
    mapping(address => mapping(address => uint256)) public userTrustScore; // user => pool => score
    mapping(address => mapping(address => uint256)) public userEnvironmentalBonus; // user => pool => environmental bonus percentage
    mapping(address => mapping(address => uint256)) public userStakeTimestamp; // user => pool => stake timestamp for decay calculation
    
    // Events
    event PoolCreated(address indexed pool, uint256 trustMultiplier);
    event Staked(address indexed user, address indexed pool, uint256 amount, uint256 trustScore);
    event Unstaked(address indexed user, address indexed pool, uint256 amount, uint256 rewards);
    event RewardsClaimed(address indexed user, address indexed pool, uint256 amount);

    constructor(address _trustEngine) {
        trustEngine = TrustEngine(_trustEngine);
    }

    /**
     * @dev Create a new yield farming pool
     */
    function createPool(
        address token,
        uint256 rewardsPerBlock,
        uint256 trustMultiplier
    ) external onlyOwner {
        require(token != address(0), "Invalid token");
        require(rewardsPerBlock > 0, "Invalid rewards per block");
        
        activePools[token] = true;
        poolRewardsPerBlock[token] = rewardsPerBlock;
        poolTrustMultiplier[token] = trustMultiplier;
        poolLastUpdateBlock[token] = block.number; // Start accumulating from current block
        
        emit PoolCreated(token, trustMultiplier);
    }

    /**
     * @dev Stake tokens in a yield pool
     */
    function stake(address pool, uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be positive");
        require(activePools[pool], "Pool not active");
        
        // Get trust score using helper function
        uint256 trustScore = _getTrustScore(msg.sender);
        require(trustScore >= 20, "Insufficient trust score");
        
        // Transfer tokens
        IERC20(pool).transferFrom(msg.sender, address(this), amount);
        
        // Update user stake with precise calculations
        uint256 currentStake = userStakedAmount[msg.sender][pool];
        if (currentStake > 0) {
            uint256 accRewardsPerShare = poolAccRewardsPerShare[pool];
            if (accRewardsPerShare > 0) {
                uint256 pending = currentStake.mul(accRewardsPerShare).div(1e18);
                if (pending > userRewardDebt[msg.sender][pool]) {
                    pending = pending.sub(userRewardDebt[msg.sender][pool]);
                    // TODO: Transfer pending rewards
                }
            }
        }

        userStakedAmount[msg.sender][pool] = currentStake.add(amount);
        userTrustScore[msg.sender][pool] = trustScore;
        userStakeTimestamp[msg.sender][pool] = block.timestamp;
        userEnvironmentalBonus[msg.sender][pool] = _calculateEnvironmentalBonus(msg.sender);

        poolTotalStaked[pool] = poolTotalStaked[pool].add(amount);
        totalValueLocked = totalValueLocked.add(amount);
        
        // Update pool rewards after updating stake amount
        updatePoolRewards(pool);
        
        // Set reward debt AFTER updating pool rewards
        userRewardDebt[msg.sender][pool] = userStakedAmount[msg.sender][pool].mul(poolAccRewardsPerShare[pool]).div(1e18);
        
        emit Staked(msg.sender, pool, amount, trustScore);
    }

    /**
     * @dev Unstake tokens from a yield pool
     */
    function unstake(address pool, uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be positive");
        require(userStakedAmount[msg.sender][pool] >= amount, "Insufficient staked amount");
        
        // Calculate pending rewards with precision checks (without updating pool first)
        uint256 currentStake = userStakedAmount[msg.sender][pool];
        uint256 accRewardsPerShare = poolAccRewardsPerShare[pool];
        
        // Update pool rewards after calculating pending rewards
        updatePoolRewards(pool);
        uint256 pending = 0;

        if (accRewardsPerShare > 0 && currentStake > 0) {
            uint256 grossRewards = currentStake.mul(accRewardsPerShare).div(1e18);
            if (grossRewards > userRewardDebt[msg.sender][pool]) {
                pending = grossRewards.sub(userRewardDebt[msg.sender][pool]);
            }
        }

        // Update user stake
        userStakedAmount[msg.sender][pool] = currentStake.sub(amount);
        userRewardDebt[msg.sender][pool] = userStakedAmount[msg.sender][pool].mul(accRewardsPerShare).div(1e18);
        
        // Update pool
        poolTotalStaked[pool] = poolTotalStaked[pool].sub(amount);
        totalValueLocked = totalValueLocked.sub(amount);
        
        // Transfer tokens
        IERC20(pool).transfer(msg.sender, amount);
        
        emit Unstaked(msg.sender, pool, amount, pending);
    }

    /**
     * @dev Claim pending rewards
     */
    function claimRewards(address pool) external nonReentrant {
        require(userStakedAmount[msg.sender][pool] > 0, "No stake in pool");
        
        // Update pool rewards
        updatePoolRewards(pool);
        
        // Calculate pending rewards
        uint256 currentStake = userStakedAmount[msg.sender][pool];
        uint256 pending = currentStake.mul(poolAccRewardsPerShare[pool]).div(1e18).sub(userRewardDebt[msg.sender][pool]);
        
        // Update reward debt
        userRewardDebt[msg.sender][pool] = currentStake.mul(poolAccRewardsPerShare[pool]).div(1e18);
        
        // Apply trust multiplier using helper function
        uint256 trustScore = _getTrustScore(msg.sender);

        // Simple trust-based multiplier: base 1.0x + (trust_score / 200)
        // This gives 1.0x to 1.5x multiplier for trust scores 0-100
        uint256 trustMultiplier = 100 + (trustScore / 2); // 100-150 (1.0x to 1.5x)

        require(pending <= type(uint256).max / trustMultiplier, "Reward calculation overflow");
        uint256 finalReward = pending.mul(trustMultiplier).div(100);
        
        // TODO: Transfer rewards (mint tokens or transfer from treasury)
        emit RewardsClaimed(msg.sender, pool, finalReward);
    }

    /**
     * @dev Get pending rewards for a user with precision improvements
     */
    function getPendingRewards(address user, address pool) external view returns (uint256) {
        if (userStakedAmount[user][pool] == 0) return 0;

        uint256 userStake = userStakedAmount[user][pool];
        uint256 accRewardsPerShare = poolAccRewardsPerShare[pool];
        uint256 multiplier = block.number.sub(poolLastUpdateBlock[pool]);
        uint256 totalStaked = poolTotalStaked[pool];

        // Calculate updated accumulated rewards per share
        if (multiplier > 0 && totalStaked > 0) {
            uint256 rewards = multiplier.mul(poolRewardsPerBlock[pool]);
            // Prevent division by zero and overflow
            if (rewards <= type(uint256).max / 1e18 && totalStaked > 0) {
                uint256 newRewardsPerShare = rewards.mul(1e18).div(totalStaked);
                accRewardsPerShare = accRewardsPerShare.add(newRewardsPerShare);
            }
        }

        // Calculate pending rewards with overflow protection
        uint256 pending = 0;
        if (accRewardsPerShare > 0 && userStake > 0) {
            uint256 grossRewards = userStake.mul(accRewardsPerShare).div(1e18);
            if (grossRewards > userRewardDebt[user][pool]) {
                pending = grossRewards.sub(userRewardDebt[user][pool]);
            }
        }
        
        // Debug logging removed for production

        // Apply trust multiplier using helper function
        uint256 trustScore = _getTrustScore(user);

        // Simple trust-based multiplier: base 1.0x + (trust_score / 200)
        // This gives 1.0x to 1.5x multiplier for trust scores 0-100
        uint256 trustMultiplier = 100 + (trustScore / 2); // 100-150 (1.0x to 1.5x)

        require(pending <= type(uint256).max / trustMultiplier, "Reward calculation overflow");
        uint256 finalReward = pending.mul(trustMultiplier).div(100);

        return finalReward;
    }

    /**
     * @dev Get user's total staked amount across all pools
     */
    function getUserTotalStaked(address user) external view returns (uint256 total) {
        // This would need to iterate through all pools
        // For simplicity, we'll return 0 for now
        return 0;
    }

    /**
     * @dev Update pool rewards - internal function with precision improvements
     */
    function updatePoolRewards(address pool) internal {
        uint256 multiplier = block.number.sub(poolLastUpdateBlock[pool]);
        uint256 totalStaked = poolTotalStaked[pool];
        
        // Debug logging removed for production

        if (multiplier > 0 && totalStaked > 0) {
            uint256 rewards = multiplier.mul(poolRewardsPerBlock[pool]);
            // Debug logging removed for production

            // Prevent overflow and ensure precision
            require(rewards <= type(uint256).max / 1e18, "Rewards calculation overflow");

            // Use higher precision to avoid rounding down to 0
            // Additional safety check for totalStaked > 0 (should be redundant but safe)
            require(totalStaked > 0, "Total staked cannot be zero");
            uint256 newAccRewardsPerShare = rewards.mul(1e18).div(totalStaked);
            uint256 currentAccRewards = poolAccRewardsPerShare[pool];
            
            // Debug logging removed for production



            // Prevent overflow when adding
            require(currentAccRewards <= type(uint256).max - newAccRewardsPerShare, "Accumulated rewards overflow");

            poolAccRewardsPerShare[pool] = currentAccRewards.add(newAccRewardsPerShare);
            // Debug logging removed for production
        } else {
            // No rewards to update
        }

        poolLastUpdateBlock[pool] = block.number;
    }

    /**
     * @dev Emergency withdraw (owner only)
     */
    function emergencyWithdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        IERC20(token).transfer(owner(), balance);
    }

    /**
     * @dev Get trust multiplier for a user (internal helper)
     */
    function _getTrustMultiplier(address user) internal view returns (uint256) {
        try trustEngine.getTrustScore(user) returns (uint256 trustScore) {
            // TrustEngine returns 0-100, convert to multiplier (1.0 to 2.0)
            // For a trust score of 80, this should return 18 (1.8x)
            uint256 trustMultiplier = trustScore.mul(10).div(100) + 10; // Convert to 10-20 scale (1.0x to 2.0x)
            return trustMultiplier < 10 ? 10 : trustMultiplier; // Minimum 1.0x multiplier
        } catch {
            return 10; // Default 1.0x multiplier if trust score unavailable
        }
    }

    /**
     * @dev Get trust score for a user (internal helper)
     */
    function _getTrustScore(address user) internal view returns (uint256) {
        try trustEngine.getTrustScore(user) returns (uint256 trustScore) {
            // TrustEngine returns 0-100, no conversion needed
            return trustScore; // Already in 0-100 scale
        } catch {
            return 50; // Default trust score if unavailable
        }
    }

    /**
     * @dev Calculate environmental bonus based on user's trust score
     * Environmental bonus is derived from the environmental component of trust score
     */
    function _calculateEnvironmentalBonus(address user) internal view returns (uint256) {
        // For now, use a simplified environmental bonus based on trust score
        // In production, this would query actual environmental data from TrustEngine
        uint256 trustScore = _getTrustScore(user);

        // Environmental bonus: higher trust scores get environmental bonuses
        // This is a simplified implementation - in production would use real environmental data
        if (trustScore >= 80) {
            return 50; // 50% bonus for high trust scores (good environmental record)
        } else if (trustScore >= 60) {
            return 25; // 25% bonus for medium trust scores
        } else if (trustScore >= 40) {
            return 10; // 10% bonus for low-medium trust scores
        } else {
            return 0; // No bonus for low trust scores
        }
    }

    /**
     * @dev Calculate time-based decay multiplier
     * Rewards decay over time to encourage active participation
     */
    function _calculateTimeDecayMultiplier(uint256 stakeTimestamp) internal view returns (uint256) {
        if (stakeTimestamp == 0) {
            return 10; // No decay for new stakes (1.0x multiplier)
        }

        uint256 timeStaked = block.timestamp.sub(stakeTimestamp);
        uint256 daysStaked = timeStaked.div(86400); // Convert to days

        // Decay formula: starts at 1.0x, decays to 0.5x over 365 days
        if (daysStaked >= 365) {
            return 5; // Minimum 0.5x multiplier after 1 year
        } else {
            // Linear decay: 10 - (daysStaked * 5 / 365)
            uint256 decay = daysStaked.mul(5).div(365);
            return decay >= 5 ? 5 : 10.sub(decay); // Minimum 5 (0.5x)
        }
    }
} 