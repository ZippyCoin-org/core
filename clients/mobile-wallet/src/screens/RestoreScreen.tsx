import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { WalletService } from '../services/WalletService';
import { logger } from '../utils/logger';

type RootStackParamList = {
  Restore: undefined;
  Dashboard: undefined;
  Settings: undefined;
};

type RestoreScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Restore'
>;

type RestoreScreenRouteProp = RouteProp<
  RootStackParamList,
  'Restore'
>;

interface Props {
  navigation: RestoreScreenNavigationProp;
  route: RestoreScreenRouteProp;
}

export const RestoreScreen: React.FC<Props> = ({ navigation }) => {
  const [mnemonic, setMnemonic] = useState('');
  const [walletName, setWalletName] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [walletService] = useState(() => new WalletService());

  const handleRestore = async () => {
    if (!walletName.trim()) {
      Alert.alert('Error', 'Please enter a wallet name');
      return;
    }

    const words = mnemonic.trim().split(/\s+/);
    if (words.length !== 12) {
      Alert.alert('Error', 'Recovery phrase must contain exactly 12 words');
      return;
    }

    // Validate that all words are present
    if (words.some(word => !word.trim())) {
      Alert.alert('Error', 'All words in the recovery phrase are required');
      return;
    }

    setIsLoading(true);
    try {
      const cleanMnemonic = words.join(' ');
      const wallet = await walletService.restoreHDWallet(
        walletName.trim(),
        cleanMnemonic,
        passphrase || undefined
      );

      Alert.alert(
        'Success',
        `Wallet "${wallet.name}" has been restored successfully`,
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Dashboard'),
          },
        ]
      );
    } catch (error) {
      logger.error('Failed to restore wallet', { error: error.message });
      Alert.alert('Error', 'Failed to restore wallet. Please check your recovery phrase and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    // In a real implementation, you would use Clipboard.getString()
    // For now, we'll show a placeholder
    Alert.alert('Info', 'Paste functionality would be implemented here');
  };

  const handleScanQR = () => {
    // In a real implementation, you would open QR scanner
    Alert.alert('Info', 'QR scanner would be implemented here');
  };

  const renderMnemonicInput = () => {
    return (
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Recovery Phrase (12 words)</Text>
        <TextInput
          style={styles.mnemonicInput}
          value={mnemonic}
          onChangeText={setMnemonic}
          placeholder="Enter your 12-word recovery phrase"
          placeholderTextColor="#888888"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={styles.inputActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handlePasteFromClipboard}
          >
            <Text style={styles.actionButtonText}>Paste</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleScanQR}
          >
            <Text style={styles.actionButtonText}>Scan QR</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderWalletNameInput = () => {
    return (
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Wallet Name</Text>
        <TextInput
          style={styles.textInput}
          value={walletName}
          onChangeText={setWalletName}
          placeholder="Enter wallet name"
          placeholderTextColor="#888888"
          autoCapitalize="words"
        />
      </View>
    );
  };

  const renderPassphraseInput = () => {
    return (
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Passphrase (Optional)</Text>
        <TextInput
          style={styles.textInput}
          value={passphrase}
          onChangeText={setPassphrase}
          placeholder="Enter BIP39 passphrase (if used)"
          placeholderTextColor="#888888"
          secureTextEntry
          autoCapitalize="none"
        />
        <Text style={styles.helperText}>
          Only enter if you used a passphrase when creating the wallet
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Restore Wallet</Text>
          <Text style={styles.subtitle}>
            Enter your recovery phrase to restore your wallet
          </Text>
        </View>

        <View style={styles.content}>
          <View style={styles.warningContainer}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningTitle}>Security Notice</Text>
            <Text style={styles.warningText}>
              Only restore wallets from sources you trust. Scammers may try to trick you into restoring fake wallets.
            </Text>
          </View>

          {renderWalletNameInput()}
          {renderMnemonicInput()}
          {renderPassphraseInput()}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.restoreButton, (!walletName.trim() || !mnemonic.trim()) && styles.buttonDisabled]}
              onPress={handleRestore}
              disabled={isLoading || !walletName.trim() || !mnemonic.trim()}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.restoreButtonText}>Restore Wallet</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 30,
    alignItems: 'center',
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
    textAlign: 'center',
    lineHeight: 24,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  warningContainer: {
    backgroundColor: '#2A1A0A',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    borderLeftWidth: 4,
    borderLeftColor: '#FFAA00',
  },
  warningIcon: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 10,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  warningText: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 25,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#333333',
  },
  mnemonicInput: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#333333',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  actionButton: {
    backgroundColor: '#333333',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    minWidth: 80,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  helperText: {
    fontSize: 12,
    color: '#888888',
    marginTop: 5,
  },
  buttonContainer: {
    gap: 15,
    marginTop: 20,
  },
  restoreButton: {
    backgroundColor: '#00FF88',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  restoreButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF4444',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FF4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
