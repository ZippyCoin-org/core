/**
 * Send Screen - Mobile-optimized transaction sending
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Services
import { WalletService } from '../services/WalletService';
import { BiometricService } from '../services/BiometricService';

// Types
import { WalletInfo } from '../types/wallet';

const SendScreen: React.FC = () => {
  const navigation = useNavigation();
  const isDarkMode = useColorScheme() === 'dark';
  
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidAddress, setIsValidAddress] = useState(false);
  const [isValidAmount, setIsValidAmount] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const walletService = WalletService.getInstance();
  const biometricService = BiometricService.getInstance();

  useEffect(() => {
    loadWallet();
  }, []);

  useEffect(() => {
    validateAddress(toAddress);
  }, [toAddress]);

  useEffect(() => {
    validateAmount(amount);
  }, [amount, wallet]);

  const loadWallet = async () => {
    try {
      const walletData = await walletService.getWallet();
      if (walletData) {
        setWallet(walletData);
      }
    } catch (error) {
      console.error('Failed to load wallet:', error);
      Alert.alert('Error', 'Failed to load wallet data');
    }
  };

  const validateAddress = (address: string) => {
    // Basic ZippyCoin address validation
    const isValid = address.startsWith('zip') && address.length >= 43 && address.length <= 50;
    setIsValidAddress(isValid);
  };

  const validateAmount = (amountStr: string) => {
    if (!amountStr || !wallet) {
      setIsValidAmount(false);
      return;
    }

    const amountNum = parseFloat(amountStr);
    const balanceNum = parseFloat(wallet.balance);
    const fee = 0.000001;

    const isValid = !isNaN(amountNum) && 
                   amountNum > 0 && 
                   amountNum <= balanceNum - fee &&
                   amountNum <= 1000000; // Max 1M ZIP per transaction

    setIsValidAmount(isValid);
  };

  const handleSendPress = async () => {
    if (!isValidAddress || !isValidAmount) {
      Alert.alert('Invalid Input', 'Please check the recipient address and amount');
      return;
    }

    // Show confirmation modal
    setShowConfirmation(true);
  };

  const handleConfirmSend = async () => {
    try {
      setIsLoading(true);
      setShowConfirmation(false);

      // Authenticate with biometric if enabled
      const biometricEnabled = await biometricService.isEnabled();
      if (biometricEnabled) {
        const authenticated = await biometricService.authenticate('Confirm transaction');
        if (!authenticated) {
          Alert.alert('Authentication Failed', 'Transaction cancelled');
          setIsLoading(false);
          return;
        }
      }

      // Send transaction
      const transaction = await walletService.sendTransaction(toAddress, amount, memo);
      
      Alert.alert(
        'Transaction Sent',
        `Successfully sent ${amount} ZIP to ${toAddress.substring(0, 8)}...${toAddress.substring(toAddress.length - 8)}`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Failed to send transaction:', error);
      Alert.alert('Error', 'Failed to send transaction. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanQR = () => {
    // Navigate to QR scanner
    navigation.navigate('QRScanner' as never, {
      onScan: (address: string) => setToAddress(address)
    } as never);
  };

  const handlePasteAddress = async () => {
    // In a real implementation, this would access clipboard
    Alert.alert('Paste', 'Paste functionality would be implemented here');
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

  const getMaxAmount = () => {
    if (!wallet) return '0';
    const balance = parseFloat(wallet.balance);
    const fee = 0.000001;
    return (balance - fee).toFixed(6);
  };

  const handleMaxAmount = () => {
    setAmount(getMaxAmount());
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={[styles.loadingText, isDarkMode && styles.textDark]}>
            Sending transaction...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color={isDarkMode ? '#FFFFFF' : '#000000'} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isDarkMode && styles.textDark]}>
            Send ZIP
          </Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Balance Display */}
          {wallet && (
            <View style={[styles.balanceCard, isDarkMode && styles.balanceCardDark]}>
              <Text style={[styles.balanceLabel, isDarkMode && styles.textSecondaryDark]}>
                Available Balance
              </Text>
              <Text style={[styles.balanceAmount, isDarkMode && styles.textDark]}>
                {formatBalance(wallet.balance)}
              </Text>
            </View>
          )}

          {/* Recipient Address */}
          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, isDarkMode && styles.textDark]}>
              Recipient Address
            </Text>
            <View style={styles.addressInputContainer}>
              <TextInput
                style={[
                  styles.addressInput,
                  isDarkMode && styles.inputDark,
                  isValidAddress && styles.inputValid,
                  !isValidAddress && toAddress.length > 0 && styles.inputInvalid
                ]}
                value={toAddress}
                onChangeText={setToAddress}
                placeholder="Enter ZippyCoin address"
                placeholderTextColor={isDarkMode ? '#666666' : '#999999'}
                autoCapitalize="none"
                autoCorrect={false}
                multiline
              />
              <View style={styles.addressActions}>
                <TouchableOpacity
                  style={styles.addressActionButton}
                  onPress={handleScanQR}
                >
                  <Icon name="qr-code-scanner" size={20} color="#2196F3" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.addressActionButton}
                  onPress={handlePasteAddress}
                >
                  <Icon name="content-paste" size={20} color="#2196F3" />
                </TouchableOpacity>
              </View>
            </View>
            {toAddress.length > 0 && (
              <Text style={[
                styles.validationText,
                isValidAddress ? styles.validationValid : styles.validationInvalid
              ]}>
                {isValidAddress ? '✓ Valid address' : '✗ Invalid address format'}
              </Text>
            )}
          </View>

          {/* Amount */}
          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, isDarkMode && styles.textDark]}>
              Amount
            </Text>
            <View style={styles.amountInputContainer}>
              <TextInput
                style={[
                  styles.amountInput,
                  isDarkMode && styles.inputDark,
                  isValidAmount && styles.inputValid,
                  !isValidAmount && amount.length > 0 && styles.inputInvalid
                ]}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.000000"
                placeholderTextColor={isDarkMode ? '#666666' : '#999999'}
                keyboardType="decimal-pad"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.maxButton}
                onPress={handleMaxAmount}
              >
                <Text style={styles.maxButtonText}>MAX</Text>
              </TouchableOpacity>
            </View>
            {amount.length > 0 && (
              <Text style={[
                styles.validationText,
                isValidAmount ? styles.validationValid : styles.validationInvalid
              ]}>
                {isValidAmount ? '✓ Valid amount' : '✗ Invalid amount or insufficient balance'}
              </Text>
            )}
          </View>

          {/* Memo */}
          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, isDarkMode && styles.textDark]}>
              Memo (Optional)
            </Text>
            <TextInput
              style={[
                styles.memoInput,
                isDarkMode && styles.inputDark
              ]}
              value={memo}
              onChangeText={setMemo}
              placeholder="Add a note about this transaction"
              placeholderTextColor={isDarkMode ? '#666666' : '#999999'}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Transaction Fee */}
          <View style={styles.feeSection}>
            <Text style={[styles.feeLabel, isDarkMode && styles.textSecondaryDark]}>
              Transaction Fee
            </Text>
            <Text style={[styles.feeAmount, isDarkMode && styles.textDark]}>
              0.000001 ZIP
            </Text>
          </View>

          {/* Send Button */}
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!isValidAddress || !isValidAmount) && styles.sendButtonDisabled
            ]}
            onPress={handleSendPress}
            disabled={!isValidAddress || !isValidAmount}
          >
            <Text style={styles.sendButtonText}>
              Send {amount || '0.000000'} ZIP
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Confirmation Modal */}
        {showConfirmation && (
          <View style={styles.confirmationModal}>
            <View style={[styles.confirmationContainer, isDarkMode && styles.confirmationContainerDark]}>
              <Text style={[styles.confirmationTitle, isDarkMode && styles.textDark]}>
                Confirm Transaction
              </Text>
              
              <View style={styles.confirmationDetails}>
                <View style={styles.confirmationRow}>
                  <Text style={[styles.confirmationLabel, isDarkMode && styles.textSecondaryDark]}>
                    To:
                  </Text>
                  <Text style={[styles.confirmationValue, isDarkMode && styles.textDark]}>
                    {toAddress.substring(0, 8)}...{toAddress.substring(toAddress.length - 8)}
                  </Text>
                </View>
                
                <View style={styles.confirmationRow}>
                  <Text style={[styles.confirmationLabel, isDarkMode && styles.textSecondaryDark]}>
                    Amount:
                  </Text>
                  <Text style={[styles.confirmationValue, isDarkMode && styles.textDark]}>
                    {amount} ZIP
                  </Text>
                </View>
                
                {memo && (
                  <View style={styles.confirmationRow}>
                    <Text style={[styles.confirmationLabel, isDarkMode && styles.textSecondaryDark]}>
                      Memo:
                    </Text>
                    <Text style={[styles.confirmationValue, isDarkMode && styles.textDark]}>
                      {memo}
                    </Text>
                  </View>
                )}
                
                <View style={styles.confirmationRow}>
                  <Text style={[styles.confirmationLabel, isDarkMode && styles.textSecondaryDark]}>
                    Fee:
                  </Text>
                  <Text style={[styles.confirmationValue, isDarkMode && styles.textDark]}>
                    0.000001 ZIP
                  </Text>
                </View>
              </View>

              <View style={styles.confirmationButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowConfirmation(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleConfirmSend}
                >
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
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
  keyboardAvoidingView: {
    flex: 1,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  balanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  balanceCardDark: {
    backgroundColor: '#1E1E1E',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  addressInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 12,
  },
  memoInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputDark: {
    backgroundColor: '#1E1E1E',
    borderColor: '#333333',
    color: '#FFFFFF',
  },
  inputValid: {
    borderColor: '#4CAF50',
  },
  inputInvalid: {
    borderColor: '#F44336',
  },
  addressActions: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  addressActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  maxButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  maxButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  validationText: {
    fontSize: 12,
    marginTop: 4,
  },
  validationValid: {
    color: '#4CAF50',
  },
  validationInvalid: {
    color: '#F44336',
  },
  feeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 32,
  },
  feeLabel: {
    fontSize: 16,
    color: '#666666',
  },
  feeAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  sendButton: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  sendButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  confirmationModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmationContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    width: '90%',
    maxWidth: 400,
  },
  confirmationContainerDark: {
    backgroundColor: '#1E1E1E',
  },
  confirmationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 24,
  },
  confirmationDetails: {
    marginBottom: 24,
  },
  confirmationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  confirmationLabel: {
    fontSize: 16,
    color: '#666666',
  },
  confirmationValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    flex: 1,
    textAlign: 'right',
  },
  confirmationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginLeft: 8,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  textDark: {
    color: '#FFFFFF',
  },
  textSecondaryDark: {
    color: '#CCCCCC',
  },
});

export default SendScreen; 