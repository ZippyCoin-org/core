import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Clipboard,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { WalletService } from '../services/WalletService';
import { logger } from '../utils/logger';

type RootStackParamList = {
  Backup: { walletId: string };
  Dashboard: undefined;
  Settings: undefined;
};

type BackupScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Backup'
>;

type BackupScreenRouteProp = RouteProp<
  RootStackParamList,
  'Backup'
>;

interface Props {
  navigation: BackupScreenNavigationProp;
  route: BackupScreenRouteProp;
}

export const BackupScreen: React.FC<Props> = ({ navigation, route }) => {
  const { walletId } = route.params;
  const [isLoading, setIsLoading] = useState(true);
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [backupComplete, setBackupComplete] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [walletService] = useState(() => new WalletService());

  const steps = [
    {
      title: 'Important Warning',
      content: 'Never share your recovery phrase with anyone. Store it in a safe place.',
      icon: '⚠️',
    },
    {
      title: 'Write it Down',
      content: 'Write down all 12 words in order on paper. Do not take a screenshot.',
      icon: '📝',
    },
    {
      title: 'Verify Words',
      content: 'Verify that you have written down the words correctly.',
      icon: '✅',
    },
    {
      title: 'Store Securely',
      content: 'Store the paper in a safe place, like a bank vault or fireproof safe.',
      icon: '🔒',
    },
  ];

  useEffect(() => {
    loadWalletMnemonic();
  }, []);

  const loadWalletMnemonic = async () => {
    try {
      setIsLoading(true);
      const wallet = await walletService.getWallet(walletId);

      if (!wallet) {
        Alert.alert('Error', 'Wallet not found');
        navigation.goBack();
        return;
      }

      // For security, we don't store mnemonic in the wallet object
      // In a real implementation, you would need to securely retrieve it
      // For now, we'll generate a new one for demonstration
      const newMnemonic = await generateDemoMnemonic();
      setMnemonic(newMnemonic);
    } catch (error) {
      logger.error('Failed to load wallet mnemonic', { error: error.message });
      Alert.alert('Error', 'Failed to load wallet backup information');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const generateDemoMnemonic = async (): Promise<string[]> => {
    // This is a demo mnemonic - in real implementation, this would be securely retrieved
    const demoWords = [
      'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
      'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid'
    ];
    return demoWords.slice(0, 12);
  };

  const handleCopyToClipboard = () => {
    const mnemonicText = mnemonic.join(' ');
    Clipboard.setString(mnemonicText);
    Alert.alert('Copied', 'Recovery phrase copied to clipboard');
  };

  const handleNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowMnemonic(true);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleConfirmBackup = () => {
    Alert.alert(
      'Backup Complete',
      'Have you written down and securely stored your recovery phrase?',
      [
        {
          text: 'Not Yet',
          style: 'cancel',
        },
        {
          text: 'Yes, I have',
          onPress: () => {
            setBackupComplete(true);
            // In a real implementation, you would mark the backup as complete
            setTimeout(() => {
              navigation.goBack();
            }, 2000);
          },
        },
      ]
    );
  };

  const renderStepContent = () => {
    if (showMnemonic) {
      return (
        <View style={styles.mnemonicContainer}>
          <Text style={styles.mnemonicTitle}>Your Recovery Phrase</Text>
          <Text style={styles.mnemonicWarning}>
            Write these words down in order. Do not take screenshots.
          </Text>

          <View style={styles.mnemonicGrid}>
            {mnemonic.map((word, index) => (
              <View key={index} style={styles.mnemonicWord}>
                <Text style={styles.wordNumber}>{index + 1}</Text>
                <Text style={styles.wordText}>{word}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.copyButton}
            onPress={handleCopyToClipboard}
          >
            <Text style={styles.copyButtonText}>Copy to Clipboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirmBackup}
          >
            <Text style={styles.confirmButtonText}>I've Written It Down</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const step = steps[currentStep];
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepIcon}>{step.icon}</Text>
        <Text style={styles.stepTitle}>{step.title}</Text>
        <Text style={styles.stepContent}>{step.content}</Text>

        <View style={styles.stepIndicator}>
          {steps.map((_, index) => (
            <View
              key={index}
              style={[
                styles.stepDot,
                index === currentStep && styles.stepDotActive,
                index < currentStep && styles.stepDotCompleted,
              ]}
            />
          ))}
        </View>

        <View style={styles.stepButtons}>
          {currentStep > 0 && (
            <TouchableOpacity
              style={styles.stepButton}
              onPress={handlePreviousStep}
            >
              <Text style={styles.stepButtonText}>Previous</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.stepButtonPrimary}
            onPress={handleNextStep}
          >
            <Text style={styles.stepButtonPrimaryText}>
              {currentStep === steps.length - 1 ? 'Show Recovery Phrase' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00FF88" />
        <Text style={styles.loadingText}>Loading backup information...</Text>
      </View>
    );
  }

  if (backupComplete) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successIcon}>🎉</Text>
        <Text style={styles.successTitle}>Backup Complete!</Text>
        <Text style={styles.successText}>
          Your wallet is now backed up. Keep your recovery phrase safe and secure.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Backup Wallet</Text>
        <Text style={styles.subtitle}>
          Create a backup of your wallet recovery phrase
        </Text>
      </View>

      <View style={styles.content}>
        {renderStepContent()}
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
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    paddingHorizontal: 20,
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  successText: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    lineHeight: 24,
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
  stepContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  stepIcon: {
    fontSize: 48,
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
    textAlign: 'center',
  },
  stepContent: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  stepIndicator: {
    flexDirection: 'row',
    marginBottom: 40,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#333333',
    marginHorizontal: 6,
  },
  stepDotActive: {
    backgroundColor: '#00FF88',
  },
  stepDotCompleted: {
    backgroundColor: '#00FF88',
  },
  stepButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  stepButton: {
    backgroundColor: '#333333',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 100,
    alignItems: 'center',
  },
  stepButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  stepButtonPrimary: {
    backgroundColor: '#00FF88',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 150,
    alignItems: 'center',
  },
  stepButtonPrimaryText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  mnemonicContainer: {
    alignItems: 'center',
  },
  mnemonicTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  mnemonicWarning: {
    fontSize: 14,
    color: '#FFAA00',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  mnemonicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 30,
  },
  mnemonicWord: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    margin: 4,
    minWidth: 100,
    alignItems: 'center',
  },
  wordNumber: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 2,
  },
  wordText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  copyButton: {
    backgroundColor: '#333333',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 15,
  },
  copyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  confirmButton: {
    backgroundColor: '#00FF88',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  confirmButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
