import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { QuantumWalletManager } from '../wallet/QuantumWalletManager';

interface TransactionHistoryScreenProps {
  navigation: any;
}

interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
  quantumSignature?: {
    signature: string;
    publicKey: string;
    algorithm: string;
    timestamp: number;
  };
  environmentalData?: {
    temperature: number;
    humidity: number;
    pressure: number;
    timestamp: number;
    location: string;
    deviceId: string;
  };
  status: 'pending' | 'confirmed' | 'failed';
  blockNumber?: number;
}

export default function TransactionHistoryScreen({ navigation }: TransactionHistoryScreenProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const walletManager = new QuantumWalletManager();

  useEffect(() => {
    loadTransactionHistory();
  }, []);

  const loadTransactionHistory = async () => {
    try {
      setIsLoading(true);
      // In production, this would fetch from the blockchain
      const mockTransactions: Transaction[] = [
        {
          hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          from: 'zpc1sender1234567890abcdef',
          to: 'zpc1receiver1234567890abcdef',
          value: '1000000000000000000', // 1 ZPC
          timestamp: Date.now() - 3600000, // 1 hour ago
          quantumSignature: {
            signature: '0xquantum_signature_here',
            publicKey: '0xpublic_key_here',
            algorithm: 'dilithium-aes',
            timestamp: Date.now() - 3600000,
          },
          environmentalData: {
            temperature: 22.5,
            humidity: 45.2,
            pressure: 1013.25,
            timestamp: Date.now() - 3600000,
            location: 'Mobile Device',
            deviceId: 'mobile_device_001',
          },
          status: 'confirmed',
          blockNumber: 12345,
        },
        {
          hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          from: 'zpc1sender1234567890abcdef',
          to: 'zpc1validator1',
          value: '500000000000000000', // 0.5 ZPC
          timestamp: Date.now() - 7200000, // 2 hours ago
          quantumSignature: {
            signature: '0xquantum_signature_here_2',
            publicKey: '0xpublic_key_here_2',
            algorithm: 'dilithium-aes',
            timestamp: Date.now() - 7200000,
          },
          environmentalData: {
            temperature: 23.1,
            humidity: 47.8,
            pressure: 1012.8,
            timestamp: Date.now() - 7200000,
            location: 'Mobile Device',
            deviceId: 'mobile_device_001',
          },
          status: 'confirmed',
          blockNumber: 12344,
        },
        {
          hash: '0x7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456',
          from: 'zpc1sender1234567890abcdef',
          to: 'zpc1delegator1',
          value: '2000000000000000000', // 2 ZPC
          timestamp: Date.now() - 10800000, // 3 hours ago
          quantumSignature: {
            signature: '0xquantum_signature_here_3',
            publicKey: '0xpublic_key_here_3',
            algorithm: 'dilithium-aes',
            timestamp: Date.now() - 10800000,
          },
          environmentalData: {
            temperature: 21.8,
            humidity: 43.5,
            pressure: 1014.1,
            timestamp: Date.now() - 10800000,
            location: 'Mobile Device',
            deviceId: 'mobile_device_001',
          },
          status: 'pending',
        },
      ];
      
      setTransactions(mockTransactions);
    } catch (error) {
      console.error('Error loading transaction history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadTransactionHistory();
    setIsRefreshing(false);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  const formatValue = (value: string) => {
    const zpcValue = parseFloat(value) / 1e18;
    return `${zpcValue.toFixed(6)} ZPC`;
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '#4CAF50';
      case 'pending':
        return '#FF9800';
      case 'failed':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  const renderTransaction = (transaction: Transaction) => {
    return (
      <TouchableOpacity
        key={transaction.hash}
        style={styles.transactionCard}
        onPress={() => setSelectedTransaction(transaction)}
      >
        <View style={styles.transactionHeader}>
          <Text style={styles.transactionHash}>
            {formatAddress(transaction.hash)}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(transaction.status) }]}>
            <Text style={styles.statusText}>{transaction.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.transactionDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>From:</Text>
            <Text style={styles.detailValue}>{formatAddress(transaction.from)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>To:</Text>
            <Text style={styles.detailValue}>{formatAddress(transaction.to)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount:</Text>
            <Text style={styles.amountValue}>{formatValue(transaction.value)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Time:</Text>
            <Text style={styles.detailValue}>{formatTimestamp(transaction.timestamp)}</Text>
          </View>
        </View>

        <View style={styles.transactionFooter}>
          <View style={styles.quantumBadge}>
            <Text style={styles.quantumText}>🔐 Quantum-Signed</Text>
          </View>
          <View style={styles.environmentalBadge}>
            <Text style={styles.environmentalText}>🌍 Environmental Data</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderTransactionDetails = () => {
    if (!selectedTransaction) return null;

    return (
      <View style={styles.detailsModal}>
        <View style={styles.detailsContent}>
          <View style={styles.detailsHeader}>
            <Text style={styles.detailsTitle}>Transaction Details</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedTransaction(null)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.detailsScroll}>
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Transaction Info</Text>
              <Text style={styles.detailText}>Hash: {selectedTransaction.hash}</Text>
              <Text style={styles.detailText}>From: {selectedTransaction.from}</Text>
              <Text style={styles.detailText}>To: {selectedTransaction.to}</Text>
              <Text style={styles.detailText}>Amount: {formatValue(selectedTransaction.value)}</Text>
              <Text style={styles.detailText}>Time: {formatTimestamp(selectedTransaction.timestamp)}</Text>
              {selectedTransaction.blockNumber && (
                <Text style={styles.detailText}>Block: {selectedTransaction.blockNumber}</Text>
              )}
            </View>

            {selectedTransaction.quantumSignature && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Quantum Signature</Text>
                <Text style={styles.detailText}>Algorithm: {selectedTransaction.quantumSignature.algorithm}</Text>
                <Text style={styles.detailText}>Public Key: {formatAddress(selectedTransaction.quantumSignature.publicKey)}</Text>
                <Text style={styles.detailText}>Signature: {formatAddress(selectedTransaction.quantumSignature.signature)}</Text>
              </View>
            )}

            {selectedTransaction.environmentalData && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Environmental Data</Text>
                <Text style={styles.detailText}>Temperature: {selectedTransaction.environmentalData.temperature}°C</Text>
                <Text style={styles.detailText}>Humidity: {selectedTransaction.environmentalData.humidity}%</Text>
                <Text style={styles.detailText}>Pressure: {selectedTransaction.environmentalData.pressure} hPa</Text>
                <Text style={styles.detailText}>Location: {selectedTransaction.environmentalData.location}</Text>
                <Text style={styles.detailText}>Device: {selectedTransaction.environmentalData.deviceId}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="white" />
            <Text style={styles.loadingText}>Loading transaction history...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.gradient}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Transaction History</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
        >
          {transactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No transactions found</Text>
              <Text style={styles.emptySubtext}>Your transaction history will appear here</Text>
            </View>
          ) : (
            transactions.map(renderTransaction)
          )}
        </ScrollView>

        {renderTransactionDetails()}
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 50,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  transactionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  transactionHash: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  transactionDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  detailValue: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  amountValue: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quantumBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  quantumText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
  environmentalBadge: {
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  environmentalText: {
    color: '#2196F3',
    fontSize: 12,
    fontWeight: '600',
  },
  detailsModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
  },
  detailsScroll: {
    padding: 20,
  },
  detailSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
}); 