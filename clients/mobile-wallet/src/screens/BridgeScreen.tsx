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
  Bridge: undefined;
  Dashboard: undefined;
  Settings: undefined;
};

type BridgeScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Bridge'
>;

type BridgeScreenRouteProp = RouteProp<
  RootStackParamList,
  'Bridge'
>;

interface Props {
  navigation: BridgeScreenNavigationProp;
  route: BridgeScreenRouteProp;
}

interface BridgeRoute {
  id: string;
  fromChain: string;
  toChain: string;
  token: string;
  bridgeFee: string;
  estimatedTime: string;
  minAmount: string;
  maxAmount: string;
  status: 'active' | 'maintenance' | 'inactive';
}

interface BridgeTransaction {
  id: string;
  fromChain: string;
  toChain: string;
  amount: string;
  token: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  timestamp: number;
  txHash?: string;
  bridgeFee: string;
}

export const BridgeScreen: React.FC<Props> = ({ navigation }) => {
  const [routes, setRoutes] = useState<BridgeRoute[]>([]);
  const [transactions, setTransactions] = useState<BridgeTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBridging, setIsBridging] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<BridgeRoute | null>(null);
  const [bridgeAmount, setBridgeAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [walletBalance, setWalletBalance] = useState('0');
  const [walletService] = useState(() => new WalletService());

  useEffect(() => {
    loadBridgeData();
    loadWalletBalance();
  }, []);

  const loadBridgeData = async () => {
    try {
      // In a real implementation, you would fetch bridge routes from the bridge service
      // For now, we'll use mock data
      const mockRoutes: BridgeRoute[] = [
        {
          id: 'route-1',
          fromChain: 'ZippyCoin Mainnet',
          toChain: 'Ethereum',
          token: 'ZPC',
          bridgeFee: '0.01',
          estimatedTime: '15-30 minutes',
          minAmount: '1',
          maxAmount: '10000',
          status: 'active',
        },
        {
          id: 'route-2',
          fromChain: 'Ethereum',
          toChain: 'ZippyCoin Mainnet',
          token: 'ETH',
          bridgeFee: '0.005',
          estimatedTime: '10-20 minutes',
          minAmount: '0.01',
          maxAmount: '100',
          status: 'active',
        },
        {
          id: 'route-3',
          fromChain: 'ZippyCoin Mainnet',
          toChain: 'Privacy Chain',
          token: 'ZPC',
          bridgeFee: '0.001',
          estimatedTime: '2-5 minutes',
          minAmount: '0.1',
          maxAmount: '5000',
          status: 'active',
        },
      ];

      const mockTransactions: BridgeTransaction[] = [
        {
          id: 'tx-1',
          fromChain: 'ZippyCoin Mainnet',
          toChain: 'Ethereum',
          amount: '500',
          token: 'ZPC',
          status: 'completed',
          timestamp: Date.now() - (2 * 60 * 60 * 1000), // 2 hours ago
          txHash: '0x1234...abcd',
          bridgeFee: '0.01',
        },
        {
          id: 'tx-2',
          fromChain: 'Ethereum',
          toChain: 'ZippyCoin Mainnet',
          amount: '2.5',
          token: 'ETH',
          status: 'processing',
          timestamp: Date.now() - (30 * 60 * 1000), // 30 minutes ago
          bridgeFee: '0.005',
        },
      ];

      setRoutes(mockRoutes);
      setTransactions(mockTransactions);
    } catch (error) {
      logger.error('Failed to load bridge data', { error: error.message });
      Alert.alert('Error', 'Failed to load bridge data');
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

  const handleBridge = async () => {
    if (!selectedRoute || !bridgeAmount.trim() || !recipientAddress.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const amount = parseFloat(bridgeAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const minAmount = parseFloat(selectedRoute.minAmount);
    const maxAmount = parseFloat(selectedRoute.maxAmount);
    const bridgeFee = parseFloat(selectedRoute.bridgeFee);
    const balance = parseFloat(walletBalance);

    if (amount < minAmount) {
      Alert.alert('Error', `Minimum bridge amount is ${minAmount} ${selectedRoute.token}`);
      return;
    }

    if (amount > maxAmount) {
      Alert.alert('Error', `Maximum bridge amount is ${maxAmount} ${selectedRoute.token}`);
      return;
    }

    if (amount + bridgeFee > balance) {
      Alert.alert('Error', 'Insufficient balance for bridge amount + fee');
      return;
    }

    setIsBridging(true);
    try {
      // In a real implementation, you would initiate the bridge transaction
      // For now, we'll simulate the process
      await new Promise(resolve => setTimeout(resolve, 5000)); // Simulate network delay

      Alert.alert(
        'Bridge Initiated',
        `Successfully initiated bridge of ${amount} ${selectedRoute.token} from ${selectedRoute.fromChain} to ${selectedRoute.toChain}`,
        [
          {
            text: 'OK',
            onPress: () => {
              setSelectedRoute(null);
              setBridgeAmount('');
              setRecipientAddress('');
              loadBridgeData(); // Refresh transactions
              loadWalletBalance(); // Refresh balance
            },
          },
        ]
      );
    } catch (error) {
      logger.error('Failed to initiate bridge', { error: error.message });
      Alert.alert('Error', 'Failed to initiate bridge transaction');
    } finally {
      setIsBridging(false);
    }
  };

  const renderRouteItem = (route: BridgeRoute) => {
    const isSelected = selectedRoute?.id === route.id;

    return (
      <TouchableOpacity
        key={route.id}
        style={[
          styles.routeItem,
          isSelected && styles.routeItemSelected,
        ]}
        onPress={() => setSelectedRoute(isSelected ? null : route)}
      >
        <View style={styles.routeInfo}>
          <View style={styles.routeChains}>
            <Text style={styles.fromChain}>{route.fromChain}</Text>
            <Text style={styles.arrow}>→</Text>
            <Text style={styles.toChain}>{route.toChain}</Text>
          </View>

          <View style={styles.routeDetails}>
            <Text style={styles.routeDetail}>
              Token: {route.token}
            </Text>
            <Text style={styles.routeDetail}>
              Fee: {route.bridgeFee} {route.token}
            </Text>
            <Text style={styles.routeDetail}>
              Time: {route.estimatedTime}
            </Text>
            <Text style={styles.routeDetail}>
              Limits: {route.minAmount} - {route.maxAmount} {route.token}
            </Text>
          </View>
        </View>

        <View style={styles.routeStatus}>
          <Text style={[
            styles.statusText,
            { color: route.status === 'active' ? '#00FF88' : '#FF4444' }
          ]}>
            {route.status.toUpperCase()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderTransactionItem = (transaction: BridgeTransaction) => {
    const getStatusColor = (status: BridgeTransaction['status']) => {
      switch (status) {
        case 'completed':
          return '#00FF88';
        case 'processing':
          return '#FFAA00';
        case 'pending':
          return '#888888';
        case 'failed':
          return '#FF4444';
        default:
          return '#888888';
      }
    };

    return (
      <View key={transaction.id} style={styles.transactionItem}>
        <View style={styles.transactionInfo}>
          <View style={styles.transactionChains}>
            <Text style={styles.transactionFrom}>{transaction.fromChain}</Text>
            <Text style={styles.transactionArrow}>→</Text>
            <Text style={styles.transactionTo}>{transaction.toChain}</Text>
          </View>

          <Text style={styles.transactionAmount}>
            {transaction.amount} {transaction.token}
          </Text>
          <Text style={styles.transactionFee}>
            Fee: {transaction.bridgeFee} {transaction.token}
          </Text>

          {transaction.txHash && (
            <Text style={styles.transactionHash}>
              {transaction.txHash}
            </Text>
          )}
        </View>

        <View style={styles.transactionStatus}>
          <Text style={[
            styles.transactionStatusText,
            { color: getStatusColor(transaction.status) }
          ]}>
            {transaction.status.toUpperCase()}
          </Text>
          <Text style={styles.transactionTime}>
            {new Date(transaction.timestamp).toLocaleString()}
          </Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00FF88" />
        <Text style={styles.loadingText}>Loading bridge data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bridge</Text>
        <Text style={styles.subtitle}>
          Transfer tokens between different blockchains
        </Text>
        <Text style={styles.balance}>
          Available Balance: {walletBalance} ZPC
        </Text>
      </View>

      <View style={styles.content}>
        {/* Recent Transactions */}
        {transactions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            {transactions.map(renderTransactionItem)}
          </View>
        )}

        {/* Bridge Routes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Routes</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.routesList}
          >
            {routes.map(renderRouteItem)}
          </ScrollView>

          {selectedRoute && (
            <View style={styles.bridgeForm}>
              <Text style={styles.formLabel}>Bridge Amount ({selectedRoute.token})</Text>
              <TextInput
                style={styles.textInput}
                value={bridgeAmount}
                onChangeText={setBridgeAmount}
                placeholder={`Min: ${selectedRoute.minAmount}, Max: ${selectedRoute.maxAmount}`}
                placeholderTextColor="#888888"
                keyboardType="numeric"
              />

              <Text style={styles.formLabel}>Recipient Address</Text>
              <TextInput
                style={styles.textInput}
                value={recipientAddress}
                onChangeText={setRecipientAddress}
                placeholder={`Enter ${selectedRoute.toChain} address`}
                placeholderTextColor="#888888"
                autoCapitalize="none"
              />

              <View style={styles.bridgeDetails}>
                <Text style={styles.detailText}>
                  Bridge Fee: {selectedRoute.bridgeFee} {selectedRoute.token}
                </Text>
                <Text style={styles.detailText}>
                  Estimated Time: {selectedRoute.estimatedTime}
                </Text>
                <Text style={styles.detailText}>
                  Total Cost: {(parseFloat(bridgeAmount || '0') + parseFloat(selectedRoute.bridgeFee)).toFixed(6)} {selectedRoute.token}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.bridgeButton,
                  (!bridgeAmount.trim() || !recipientAddress.trim()) && styles.buttonDisabled,
                ]}
                onPress={handleBridge}
                disabled={isBridging || !bridgeAmount.trim() || !recipientAddress.trim()}
              >
                {isBridging ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.bridgeButtonText}>
                    Bridge to {selectedRoute.toChain}
                  </Text>
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
  transactionItem: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 20,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionChains: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionFrom: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  transactionArrow: {
    fontSize: 14,
    color: '#888888',
    marginHorizontal: 8,
  },
  transactionTo: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  transactionFee: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 2,
  },
  transactionHash: {
    fontSize: 12,
    color: '#00FF88',
    fontFamily: 'monospace',
  },
  transactionStatus: {
    alignItems: 'flex-end',
  },
  transactionStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  transactionTime: {
    fontSize: 10,
    color: '#888888',
  },
  routesList: {
    marginBottom: 20,
  },
  routeItem: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 20,
    marginRight: 15,
    minWidth: 300,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  routeItemSelected: {
    borderColor: '#00FF88',
  },
  routeInfo: {
    flex: 1,
  },
  routeChains: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  fromChain: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  arrow: {
    fontSize: 16,
    color: '#888888',
    marginHorizontal: 10,
  },
  toChain: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  routeDetails: {
    gap: 5,
  },
  routeDetail: {
    fontSize: 12,
    color: '#CCCCCC',
  },
  routeStatus: {
    marginLeft: 15,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  bridgeForm: {
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
    marginBottom: 20,
  },
  bridgeDetails: {
    marginBottom: 20,
  },
  detailText: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 5,
  },
  bridgeButton: {
    backgroundColor: '#00FF88',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  bridgeButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
