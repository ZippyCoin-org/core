/**
 * Dashboard Screen - Main wallet overview for mobile
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  useColorScheme,
  Alert,
  Dimensions,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import QRCode from 'react-native-qrcode-svg';

// Services
import { WalletService } from '../services/WalletService';
import { BiometricService } from '../services/BiometricService';

// Types
import { WalletInfo, Transaction } from '../types/wallet';

const { width, height } = Dimensions.get('window');

const DashboardScreen: React.FC = () => {
  const navigation = useNavigation();
  const isDarkMode = useColorScheme() === 'dark';
  
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showQR, setShowQR] = useState(false);

  const walletService = WalletService.getInstance();
  const biometricService = BiometricService.getInstance();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([
        loadWallet(),
        loadTransactions(),
      ]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      Alert.alert('Error', 'Failed to load wallet data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadWallet = async () => {
    try {
      const walletData = await walletService.getWallet();
      if (walletData) {
        setWallet(walletData);
        // Refresh balance
        const balance = await walletService.getBalance();
        setWallet(prev => prev ? { ...prev, balance } : null);
      }
    } catch (error) {
      console.error('Failed to load wallet:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const txHistory = await walletService.getTransactionHistory(5);
      setTransactions(txHistory);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, []);

  const handleSendPress = () => {
    navigation.navigate('Send' as never);
  };

  const handleReceivePress = () => {
    setShowQR(true);
  };

  const handleTransactionPress = (transaction: Transaction) => {
    // Navigate to transaction details
    navigation.navigate('TransactionDetails' as never, { transaction } as never);
  };

  const handleSettingsPress = () => {
    navigation.navigate('Settings' as never);
  };

  const handleBackupPress = async () => {
    try {
      const backup = await walletService.backupWallet();
      Alert.alert(
        'Backup Created',
        `Wallet backup saved as ${backup.filename}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to create wallet backup');
    }
  };

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M ZIP`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(2)}K ZIP`;
    } else {
      return `${num.toFixed(6)} ZIP`;
    }
  };

  const formatAddress = (address: string) => {
    return `${address.substring(0, 8)}...${address.substring(address.length - 8)}`;
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'Receive':
        return 'arrow-downward';
      case 'Send':
        return 'arrow-upward';
      default:
        return 'swap-horiz';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'Receive':
        return '#4CAF50';
      case 'Send':
        return '#F44336';
      default:
        return '#FF9800';
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
        <View style={styles.loadingContainer}>
          <Icon name="account-balance-wallet" size={48} color="#2196F3" />
          <Text style={[styles.loadingText, isDarkMode && styles.textDark]}>
            Loading wallet...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!wallet) {
    return (
      <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
        <View style={styles.noWalletContainer}>
          <Icon name="account-balance-wallet" size={64} color="#2196F3" />
          <Text style={[styles.noWalletTitle, isDarkMode && styles.textDark]}>
            No Wallet Found
          </Text>
          <Text style={[styles.noWalletSubtitle, isDarkMode && styles.textSecondaryDark]}>
            Create or import a wallet to get started
          </Text>
          <TouchableOpacity
            style={styles.createWalletButton}
            onPress={() => navigation.navigate('CreateWallet' as never)}
          >
            <Text style={styles.createWalletButtonText}>Create Wallet</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.welcomeText, isDarkMode && styles.textDark]}>
            Welcome back!
          </Text>
          <Text style={[styles.addressText, isDarkMode && styles.textSecondaryDark]}>
            {formatAddress(wallet.address)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={handleSettingsPress}
        >
          <Icon name="settings" size={24} color={isDarkMode ? '#FFFFFF' : '#000000'} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Balance Card */}
        <LinearGradient
          colors={['#2196F3', '#1976D2']}
          style={styles.balanceCard}
        >
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <Text style={styles.balanceAmount}>
            {formatBalance(wallet.balance)}
          </Text>
          <View style={styles.balanceDetails}>
            <View style={styles.balanceDetail}>
              <Text style={styles.balanceDetailLabel}>Trust Score</Text>
              <Text style={styles.balanceDetailValue}>{wallet.trustScore}</Text>
            </View>
            <View style={styles.balanceDetail}>
              <Text style={styles.balanceDetailLabel}>Created</Text>
              <Text style={styles.balanceDetailValue}>
                {new Date(wallet.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.sendButton]}
            onPress={handleSendPress}
          >
            <Icon name="send" size={24} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Send</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.receiveButton]}
            onPress={handleReceivePress}
          >
            <Icon name="qr-code" size={24} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Receive</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.backupButton]}
            onPress={handleBackupPress}
          >
            <Icon name="backup" size={24} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Backup</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Transactions */}
        <View style={styles.transactionsContainer}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
              Recent Transactions
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('TransactionHistory' as never)}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {transactions.length === 0 ? (
            <View style={styles.noTransactionsContainer}>
              <Icon name="receipt" size={48} color="#CCCCCC" />
              <Text style={[styles.noTransactionsText, isDarkMode && styles.textSecondaryDark]}>
                No transactions yet
              </Text>
            </View>
          ) : (
            transactions.map((transaction) => (
              <TouchableOpacity
                key={transaction.id}
                style={[styles.transactionItem, isDarkMode && styles.transactionItemDark]}
                onPress={() => handleTransactionPress(transaction)}
              >
                <View style={styles.transactionIcon}>
                  <Icon
                    name={getTransactionIcon(transaction.type)}
                    size={20}
                    color={getTransactionColor(transaction.type)}
                  />
                </View>
                <View style={styles.transactionDetails}>
                  <Text style={[styles.transactionType, isDarkMode && styles.textDark]}>
                    {transaction.type}
                  </Text>
                  <Text style={[styles.transactionMemo, isDarkMode && styles.textSecondaryDark]}>
                    {transaction.memo || formatAddress(transaction.type === 'Send' ? transaction.to : transaction.from)}
                  </Text>
                </View>
                <View style={styles.transactionAmount}>
                  <Text style={[
                    styles.transactionAmountText,
                    { color: getTransactionColor(transaction.type) },
                    isDarkMode && styles.textDark
                  ]}>
                    {transaction.type === 'Send' ? '-' : '+'}{transaction.amount} ZIP
                  </Text>
                  <Text style={[styles.transactionDate, isDarkMode && styles.textSecondaryDark]}>
                    {new Date(transaction.timestamp).toLocaleDateString()}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* QR Code Modal */}
      {showQR && (
        <View style={styles.qrModal}>
          <View style={[styles.qrContainer, isDarkMode && styles.qrContainerDark]}>
            <View style={styles.qrHeader}>
              <Text style={[styles.qrTitle, isDarkMode && styles.textDark]}>
                Receive ZIP
              </Text>
              <TouchableOpacity onPress={() => setShowQR(false)}>
                <Icon name="close" size={24} color={isDarkMode ? '#FFFFFF' : '#000000'} />
              </TouchableOpacity>
            </View>
            <View style={styles.qrCodeContainer}>
              <QRCode
                value={wallet.address}
                size={200}
                color={isDarkMode ? '#FFFFFF' : '#000000'}
                backgroundColor={isDarkMode ? '#1E1E1E' : '#FFFFFF'}
              />
            </View>
            <Text style={[styles.qrAddress, isDarkMode && styles.textSecondaryDark]}>
              {wallet.address}
            </Text>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={() => {
                // Copy to clipboard
                Alert.alert('Copied', 'Address copied to clipboard');
              }}
            >
              <Text style={styles.copyButtonText}>Copy Address</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  containerDark: {
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  noWalletContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  noWalletTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    color: '#000000',
  },
  noWalletSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
    color: '#666666',
  },
  createWalletButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  createWalletButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerLeft: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  addressText: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  settingsButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  balanceCard: {
    margin: 20,
    padding: 24,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8,
  },
  balanceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  balanceDetail: {
    alignItems: 'center',
  },
  balanceDetailLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  balanceDetailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  actionButton: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 80,
  },
  sendButton: {
    backgroundColor: '#F44336',
  },
  receiveButton: {
    backgroundColor: '#4CAF50',
  },
  backupButton: {
    backgroundColor: '#FF9800',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
  },
  transactionsContainer: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  viewAllText: {
    fontSize: 14,
    color: '#2196F3',
  },
  noTransactionsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noTransactionsText: {
    fontSize: 16,
    color: '#CCCCCC',
    marginTop: 8,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  transactionItemDark: {
    backgroundColor: '#1E1E1E',
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  transactionMemo: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionAmountText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  transactionDate: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  qrModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    alignItems: 'center',
  },
  qrContainerDark: {
    backgroundColor: '#1E1E1E',
  },
  qrHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  qrCodeContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 16,
  },
  qrAddress: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 16,
  },
  copyButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  copyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  textDark: {
    color: '#FFFFFF',
  },
  textSecondaryDark: {
    color: '#CCCCCC',
  },
});

export default DashboardScreen; 