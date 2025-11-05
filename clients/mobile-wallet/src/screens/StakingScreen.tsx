import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { WalletService } from '../services/WalletService';
import { logger } from '../utils/logger';

type RootStackParamList = {
  Staking: undefined;
  Dashboard: undefined;
  Settings: undefined;
};

type StakingScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Staking'
>;

type StakingScreenRouteProp = RouteProp<
  RootStackParamList,
  'Staking'
>;

interface Props {
  navigation: StakingScreenNavigationProp;
  route: StakingScreenRouteProp;
}

interface StakingPosition {
  id: string;
  amount: string;
  startTime: number;
  endTime: number;
  rewards: string;
  apr: number;
  status: 'active' | 'unlocking' | 'unlocked';
  unlockTime?: number;
}

interface StakingPool {
  id: string;
  name: string;
  totalStaked: string;
  participants: number;
  minStake: string;
  maxStake: string;
  lockPeriod: number; // in days
  apr: number;
  status: 'active' | 'inactive';
}

export const StakingScreen: React.FC<Props> = ({ navigation }) => {
  const [pools, setPools] = useState<StakingPool[]>([]);
  const [positions, setPositions] = useState<StakingPosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStaking, setIsStaking] = useState(false);
  const [selectedPool, setSelectedPool] = useState<StakingPool | null>(null);
  const [stakeAmount, setStakeAmount] = useState('');
  const [walletBalance, setWalletBalance] = useState('0');
  const [walletService] = useState(() => new WalletService());

  useEffect(() => {
    loadStakingData();
    loadWalletBalance();
  }, []);

  const loadStakingData = async () => {
    try {
      // In a real implementation, you would fetch staking pools from the blockchain
      // For now, we'll use mock data
      const mockPools: StakingPool[] = [
        {
          id: 'pool-1',
          name: 'Short Term (30 days)',
          totalStaked: '5000000',
          participants: 1250,
          minStake: '100',
          maxStake: '100000',
          lockPeriod: 30,
          apr: 8.5,
          status: 'active',
        },
        {
          id: 'pool-2',
          name: 'Medium Term (90 days)',
          totalStaked: '7500000',
          participants: 890,
          minStake: '500',
          maxStake: '500000',
          lockPeriod: 90,
          apr: 12.5,
          status: 'active',
        },
        {
          id: 'pool-3',
          name: 'Long Term (180 days)',
          totalStaked: '10000000',
          participants: 650,
          minStake: '1000',
          maxStake: '1000000',
          lockPeriod: 180,
          apr: 16.5,
          status: 'active',
        },
        {
          id: 'pool-4',
          name: 'Environmental Focus',
          totalStaked: '2500000',
          participants: 420,
          minStake: '200',
          maxStake: '200000',
          lockPeriod: 60,
          apr: 14.0,
          status: 'active',
        },
      ];

      const mockPositions: StakingPosition[] = [
        {
          id: 'pos-1',
          amount: '50000',
          startTime: Date.now() - (30 * 24 * 60 * 60 * 1000), // 30 days ago
          endTime: Date.now() + (60 * 24 * 60 * 60 * 1000), // 60 days from now
          rewards: '4250.00',
          apr: 12.5,
          status: 'active',
        },
      ];

      setPools(mockPools);
      setPositions(mockPositions);
    } catch (error) {
      logger.error('Failed to load staking data', { error: error.message });
      Alert.alert('Error', 'Failed to load staking data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadWalletBalance = async () => {
    try {
      const wallet = await walletService.getCurrentWallet();
      if (wallet) {
        const balance = await walletService.getBalance(wallet.id);
        setWalletBalance(balance);
      }
    } catch (error) {
      logger.error('Failed to load wallet balance', { error: error.message });
    }
  };

  const handleStake = async () => {
    if (!selectedPool || !stakeAmount.trim()) {
      Alert.alert('Error', 'Please select a staking pool and enter an amount');
      return;
    }

    const amount = parseFloat(stakeAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const minStake = parseFloat(selectedPool.minStake);
    const maxStake = parseFloat(selectedPool.maxStake);
    const balance = parseFloat(walletBalance);

    if (amount < minStake) {
      Alert.alert('Error', `Minimum stake amount is ${minStake} ZPC`);
      return;
    }

    if (amount > maxStake) {
      Alert.alert('Error', `Maximum stake amount is ${maxStake} ZPC`);
      return;
    }

    if (amount > balance) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    setIsStaking(true);
    try {
      // In a real implementation, you would create a staking transaction
      // For now, we'll simulate the process
      await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate network delay

      Alert.alert(
        'Success',
        `Successfully staked ${amount} ZPC in ${selectedPool.name} pool`,
        [
          {
            text: 'OK',
            onPress: () => {
              setSelectedPool(null);
              setStakeAmount('');
              loadStakingData(); // Refresh data
              loadWalletBalance(); // Refresh balance
            },
          },
        ]
      );
    } catch (error) {
      logger.error('Failed to stake', { error: error.message });
      Alert.alert('Error', 'Failed to stake tokens');
    } finally {
      setIsStaking(false);
    }
  };

  const handleUnstake = async (position: StakingPosition) => {
    Alert.alert(
      'Unstake',
      `Are you sure you want to unstake ${position.amount} ZPC? This will start the unbonding period.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Unstake',
          style: 'destructive',
          onPress: async () => {
            try {
              // In a real implementation, you would create an unstaking transaction
              await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate network delay

              Alert.alert('Success', 'Unstaking initiated. Tokens will be available after the unbonding period.');
              loadStakingData(); // Refresh data
            } catch (error) {
              logger.error('Failed to unstake', { error: error.message });
              Alert.alert('Error', 'Failed to unstake tokens');
            }
          },
        },
      ]
    );
  };

  const renderPoolItem = (pool: StakingPool) => {
    const isSelected = selectedPool?.id === pool.id;

    return (
      <TouchableOpacity
        key={pool.id}
        style={[
          styles.poolItem,
          isSelected && styles.poolItemSelected,
        ]}
        onPress={() => setSelectedPool(isSelected ? null : pool)}
      >
        <View style={styles.poolInfo}>
          <Text style={styles.poolName}>{pool.name}</Text>
          <Text style={styles.poolDetails}>
            Lock Period: {pool.lockPeriod} days
          </Text>
          <Text style={styles.poolDetails}>
            Min/Max Stake: {pool.minStake} - {pool.maxStake} ZPC
          </Text>

          <View style={styles.poolStats}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>APR</Text>
              <Text style={styles.statValue}>{pool.apr}%</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Participants</Text>
              <Text style={styles.statValue}>{pool.participants}</Text>
            </View>
          </View>
        </View>

        <View style={styles.poolMetrics}>
          <Text style={styles.totalStaked}>
            {parseInt(pool.totalStaked).toLocaleString()} ZPC
          </Text>
          <Text style={styles.totalStakedLabel}>Total Staked</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPositionItem = (position: StakingPosition) => {
    const daysRemaining = position.endTime
      ? Math.ceil((position.endTime - Date.now()) / (24 * 60 * 60 * 1000))
      : 0;

    return (
      <View key={position.id} style={styles.positionItem}>
        <View style={styles.positionInfo}>
          <Text style={styles.positionAmount}>
            {position.amount} ZPC staked
          </Text>
          <Text style={styles.positionRewards}>
            {position.rewards} ZPC rewards earned
          </Text>
          <Text style={styles.positionApr}>
            APR: {position.apr}%
          </Text>
          {daysRemaining > 0 && (
            <Text style={styles.positionTime}>
              {daysRemaining} days remaining
            </Text>
          )}
        </View>

        <View style={styles.positionActions}>
          <TouchableOpacity
            style={[styles.positionButton, styles.unstakeButton]}
            onPress={() => handleUnstake(position)}
          >
            <Text style={styles.unstakeButtonText}>Unstake</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00FF88" />
        <Text style={styles.loadingText}>Loading staking data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Staking</Text>
        <Text style={styles.subtitle}>
          Stake your tokens to earn rewards and support the network
        </Text>
        <Text style={styles.balance}>
          Available Balance: {walletBalance} ZPC
        </Text>
      </View>

      <View style={styles.content}>
        {/* Current Positions */}
        {positions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Staking Positions</Text>
            {positions.map(renderPositionItem)}
          </View>
        )}

        {/* Staking Pools */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Staking Pools</Text>

          <View style={styles.poolsList}>
            {pools.map(renderPoolItem)}
          </View>

          {selectedPool && (
            <View style={styles.stakingForm}>
              <Text style={styles.formLabel}>Amount to Stake (ZPC)</Text>
              <TextInput
                style={styles.textInput}
                value={stakeAmount}
                onChangeText={setStakeAmount}
                placeholder={`Min: ${selectedPool.minStake}, Max: ${selectedPool.maxStake}`}
                placeholderTextColor="#888888"
                keyboardType="numeric"
              />

              <View style={styles.formDetails}>
                <Text style={styles.detailText}>
                  APR: {selectedPool.apr}%
                </Text>
                <Text style={styles.detailText}>
                  Lock Period: {selectedPool.lockPeriod} days
                </Text>
                <Text style={styles.detailText}>
                  Estimated Daily Rewards: {((parseFloat(stakeAmount || '0') * selectedPool.apr / 100) / 365).toFixed(2)} ZPC
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.stakeButton,
                  (!stakeAmount.trim()) && styles.buttonDisabled,
                ]}
                onPress={handleStake}
                disabled={isStaking || !stakeAmount.trim()}
              >
                {isStaking ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.stakeButtonText}>Stake Tokens</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 20,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    lineHeight: 24,
    marginBottom: 10,
  },
  balance: {
    fontSize: 14,
    color: '#00FF88',
    fontWeight: 'bold',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  positionItem: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 20,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  positionInfo: {
    flex: 1,
  },
  positionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  positionRewards: {
    fontSize: 14,
    color: '#00FF88',
    marginBottom: 2,
  },
  positionApr: {
    fontSize: 12,
    color: '#CCCCCC',
    marginBottom: 2,
  },
  positionTime: {
    fontSize: 12,
    color: '#FFAA00',
  },
  positionActions: {
    marginLeft: 15,
  },
  positionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  unstakeButton: {
    backgroundColor: '#FF4444',
  },
  unstakeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  poolsList: {
    marginBottom: 20,
  },
  poolItem: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 20,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  poolItemSelected: {
    borderColor: '#00FF88',
  },
  poolInfo: {
    flex: 1,
  },
  poolName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  poolDetails: {
    fontSize: 12,
    color: '#CCCCCC',
    marginBottom: 2,
  },
  poolStats: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 10,
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: '#888888',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  poolMetrics: {
    marginLeft: 15,
    alignItems: 'flex-end',
  },
  totalStaked: {
    fontSize: 16,
    color: '#00FF88',
    fontWeight: 'bold',
  },
  totalStakedLabel: {
    fontSize: 12,
    color: '#888888',
  },
  stakingForm: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  textInput: {
    backgroundColor: '#333333',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 15,
  },
  formDetails: {
    marginBottom: 20,
  },
  detailText: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 5,
  },
  stakeButton: {
    backgroundColor: '#00FF88',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  stakeButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
