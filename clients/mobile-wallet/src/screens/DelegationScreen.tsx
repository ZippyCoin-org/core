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
import { TrustService } from '../services/TrustService';
import { logger } from '../utils/logger';

type RootStackParamList = {
  Delegation: undefined;
  Dashboard: undefined;
  Settings: undefined;
};

type DelegationScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Delegation'
>;

type DelegationScreenRouteProp = RouteProp<
  RootStackParamList,
  'Delegation'
>;

interface Props {
  navigation: DelegationScreenNavigationProp;
  route: DelegationScreenRouteProp;
}

interface Validator {
  address: string;
  name: string;
  commission: number;
  totalStake: string;
  delegators: number;
  uptime: number;
  trustScore: number;
  apr: number;
}

interface Delegation {
  validatorAddress: string;
  amount: string;
  rewards: string;
  status: 'active' | 'pending' | 'unbonding';
}

export const DelegationScreen: React.FC<Props> = ({ navigation }) => {
  const [validators, setValidators] = useState<Validator[]>([]);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDelegating, setIsDelegating] = useState(false);
  const [selectedValidator, setSelectedValidator] = useState<Validator | null>(null);
  const [delegateAmount, setDelegateAmount] = useState('');
  const [walletService] = useState(() => new WalletService());
  const [trustService] = useState(() => new TrustService());

  useEffect(() => {
    loadValidators();
    loadDelegations();
  }, []);

  const loadValidators = async () => {
    try {
      // In a real implementation, you would fetch validators from the blockchain
      // For now, we'll use mock data
      const mockValidators: Validator[] = [
        {
          address: 'zpc1validator1...',
          name: 'ZippyCoin Foundation',
          commission: 5,
          totalStake: '1000000',
          delegators: 1250,
          uptime: 99.9,
          trustScore: 95,
          apr: 12.5,
        },
        {
          address: 'zpc1validator2...',
          name: 'SecureStake',
          commission: 8,
          totalStake: '750000',
          delegators: 890,
          uptime: 99.7,
          trustScore: 88,
          apr: 11.8,
        },
        {
          address: 'zpc1validator3...',
          name: 'GreenValidator',
          commission: 3,
          totalStake: '500000',
          delegators: 650,
          uptime: 99.8,
          trustScore: 92,
          apr: 13.2,
        },
      ];

      // Get trust scores for validators
      const validatorsWithTrust = await Promise.all(
        mockValidators.map(async (validator) => {
          try {
            const trustScore = await trustService.getTrustScore(validator.address);
            return {
              ...validator,
              trustScore: trustScore.score,
            };
          } catch (error) {
            return validator;
          }
        })
      );

      setValidators(validatorsWithTrust);
    } catch (error) {
      logger.error('Failed to load validators', { error: error.message });
      Alert.alert('Error', 'Failed to load validators');
    }
  };

  const loadDelegations = async () => {
    try {
      // In a real implementation, you would fetch user's delegations
      // For now, we'll use mock data
      const mockDelegations: Delegation[] = [
        {
          validatorAddress: 'zpc1validator1...',
          amount: '50000',
          rewards: '1250.50',
          status: 'active',
        },
      ];

      setDelegations(mockDelegations);
    } catch (error) {
      logger.error('Failed to load delegations', { error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelegate = async () => {
    if (!selectedValidator || !delegateAmount.trim()) {
      Alert.alert('Error', 'Please select a validator and enter an amount');
      return;
    }

    const amount = parseFloat(delegateAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setIsDelegating(true);
    try {
      // In a real implementation, you would create a delegation transaction
      // For now, we'll simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate network delay

      Alert.alert(
        'Success',
        `Successfully delegated ${amount} ZPC to ${selectedValidator.name}`,
        [
          {
            text: 'OK',
            onPress: () => {
              setSelectedValidator(null);
              setDelegateAmount('');
              loadDelegations(); // Refresh delegations
            },
          },
        ]
      );
    } catch (error) {
      logger.error('Failed to delegate', { error: error.message });
      Alert.alert('Error', 'Failed to delegate tokens');
    } finally {
      setIsDelegating(false);
    }
  };

  const handleUndelegate = async (delegation: Delegation) => {
    Alert.alert(
      'Undelegate',
      `Are you sure you want to undelegate ${delegation.amount} ZPC from ${delegation.validatorAddress}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Undelegate',
          style: 'destructive',
          onPress: async () => {
            try {
              // In a real implementation, you would create an undelegation transaction
              await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate network delay

              Alert.alert('Success', 'Undelegation initiated. Tokens will be available after unbonding period.');
              loadDelegations(); // Refresh delegations
            } catch (error) {
              logger.error('Failed to undelegate', { error: error.message });
              Alert.alert('Error', 'Failed to undelegate tokens');
            }
          },
        },
      ]
    );
  };

  const renderValidatorItem = (validator: Validator) => {
    const isSelected = selectedValidator?.address === validator.address;

    return (
      <TouchableOpacity
        key={validator.address}
        style={[
          styles.validatorItem,
          isSelected && styles.validatorItemSelected,
        ]}
        onPress={() => setSelectedValidator(isSelected ? null : validator)}
      >
        <View style={styles.validatorInfo}>
          <Text style={styles.validatorName}>{validator.name}</Text>
          <Text style={styles.validatorAddress}>{validator.address}</Text>

          <View style={styles.validatorStats}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>APR</Text>
              <Text style={styles.statValue}>{validator.apr}%</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Commission</Text>
              <Text style={styles.statValue}>{validator.commission}%</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Uptime</Text>
              <Text style={styles.statValue}>{validator.uptime}%</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Trust Score</Text>
              <Text style={styles.statValue}>{validator.trustScore}</Text>
            </View>
          </View>
        </View>

        <View style={styles.validatorMetrics}>
          <Text style={styles.totalStake}>
            {parseInt(validator.totalStake).toLocaleString()} ZPC
          </Text>
          <Text style={styles.delegators}>
            {validator.delegators} delegators
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDelegationItem = (delegation: Delegation) => {
    const validator = validators.find(v => v.address === delegation.validatorAddress);

    return (
      <View key={delegation.validatorAddress} style={styles.delegationItem}>
        <View style={styles.delegationInfo}>
          <Text style={styles.delegationValidator}>
            {validator?.name || delegation.validatorAddress}
          </Text>
          <Text style={styles.delegationAmount}>
            {delegation.amount} ZPC delegated
          </Text>
          <Text style={styles.delegationRewards}>
            {delegation.rewards} ZPC rewards earned
          </Text>
        </View>

        <View style={styles.delegationActions}>
          <TouchableOpacity
            style={[styles.delegationButton, styles.undelegateButton]}
            onPress={() => handleUndelegate(delegation)}
          >
            <Text style={styles.undelegateButtonText}>Undelegate</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00FF88" />
        <Text style={styles.loadingText}>Loading delegation data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Delegation</Text>
        <Text style={styles.subtitle}>
          Delegate your tokens to validators and earn rewards
        </Text>
      </View>

      <View style={styles.content}>
        {/* Current Delegations */}
        {delegations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Delegations</Text>
            {delegations.map(renderDelegationItem)}
          </View>
        )}

        {/* Delegate Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delegate Tokens</Text>

          <View style={styles.delegationForm}>
            <Text style={styles.formLabel}>Select Validator</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.validatorsList}
            >
              {validators.map(renderValidatorItem)}
            </ScrollView>

            {selectedValidator && (
              <View style={styles.amountInput}>
                <Text style={styles.formLabel}>Amount to Delegate (ZPC)</Text>
                <TextInput
                  style={styles.textInput}
                  value={delegateAmount}
                  onChangeText={setDelegateAmount}
                  placeholder="Enter amount"
                  placeholderTextColor="#888888"
                  keyboardType="numeric"
                />
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.delegateButton,
                (!selectedValidator || !delegateAmount.trim()) && styles.buttonDisabled,
              ]}
              onPress={handleDelegate}
              disabled={isDelegating || !selectedValidator || !delegateAmount.trim()}
            >
              {isDelegating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.delegateButtonText}>Delegate</Text>
              )}
            </TouchableOpacity>
          </View>
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
  delegationItem: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 20,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  delegationInfo: {
    flex: 1,
  },
  delegationValidator: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  delegationAmount: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 2,
  },
  delegationRewards: {
    fontSize: 14,
    color: '#00FF88',
  },
  delegationActions: {
    marginLeft: 15,
  },
  delegationButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  undelegateButton: {
    backgroundColor: '#FF4444',
  },
  undelegateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  delegationForm: {
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
  validatorsList: {
    marginBottom: 20,
  },
  validatorItem: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 15,
    marginRight: 10,
    minWidth: 250,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  validatorItemSelected: {
    borderColor: '#00FF88',
  },
  validatorInfo: {
    flex: 1,
  },
  validatorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  validatorAddress: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 10,
  },
  validatorStats: {
    flexDirection: 'row',
    gap: 15,
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
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  validatorMetrics: {
    marginLeft: 15,
    alignItems: 'flex-end',
  },
  totalStake: {
    fontSize: 14,
    color: '#00FF88',
    fontWeight: 'bold',
  },
  delegators: {
    fontSize: 12,
    color: '#888888',
  },
  amountInput: {
    marginBottom: 20,
  },
  textInput: {
    backgroundColor: '#333333',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
  },
  delegateButton: {
    backgroundColor: '#00FF88',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  delegateButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
