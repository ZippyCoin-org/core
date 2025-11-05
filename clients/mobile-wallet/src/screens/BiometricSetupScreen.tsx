import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { BiometricService } from '../services/BiometricService';
import { logger } from '../utils/logger';

type RootStackParamList = {
  BiometricSetup: undefined;
  Dashboard: undefined;
  Settings: undefined;
};

type BiometricSetupScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'BiometricSetup'
>;

type BiometricSetupScreenRouteProp = RouteProp<
  RootStackParamList,
  'BiometricSetup'
>;

interface Props {
  navigation: BiometricSetupScreenNavigationProp;
  route: BiometricSetupScreenRouteProp;
}

export const BiometricSetupScreen: React.FC<Props> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('');
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [isBiometricEnrolled, setIsBiometricEnrolled] = useState(false);

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const biometricService = new BiometricService();
      await biometricService.initialize();

      const available = await biometricService.isBiometricAvailable();
      const enrolled = await biometricService.isBiometricEnrolled();

      setIsBiometricAvailable(available);
      setIsBiometricEnrolled(enrolled);

      if (available) {
        const type = await biometricService.getBiometricType();
        setBiometricType(type);
      }
    } catch (error) {
      logger.error('Failed to check biometric availability', { error: error.message });
      Alert.alert('Error', 'Failed to check biometric availability');
    }
  };

  const handleEnableBiometric = async () => {
    setIsLoading(true);
    try {
      const biometricService = new BiometricService();
      await biometricService.initialize();

      const success = await biometricService.enableBiometric();
      if (success) {
        Alert.alert(
          'Success',
          `${biometricType} authentication has been enabled`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to enable biometric authentication');
      }
    } catch (error) {
      logger.error('Failed to enable biometric', { error: error.message });
      Alert.alert('Error', 'Failed to enable biometric authentication');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableBiometric = async () => {
    Alert.alert(
      'Disable Biometric Authentication',
      'Are you sure you want to disable biometric authentication?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              const biometricService = new BiometricService();
              await biometricService.disableBiometric();
              Alert.alert(
                'Success',
                'Biometric authentication has been disabled',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            } catch (error) {
              logger.error('Failed to disable biometric', { error: error.message });
              Alert.alert('Error', 'Failed to disable biometric authentication');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSkip = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Biometric Authentication</Text>
        <Text style={styles.subtitle}>
          Secure your wallet with biometric authentication
        </Text>
      </View>

      <View style={styles.content}>
        {!isBiometricAvailable ? (
          <View style={styles.unavailableContainer}>
            <Text style={styles.unavailableTitle}>Not Available</Text>
            <Text style={styles.unavailableText}>
              Biometric authentication is not available on this device.
            </Text>
          </View>
        ) : (
          <View style={styles.availableContainer}>
            <View style={styles.biometricInfo}>
              <Text style={styles.biometricType}>
                {biometricType} Authentication
              </Text>
              <Text style={styles.biometricStatus}>
                {isBiometricEnrolled ? 'Available' : 'Not Enrolled'}
              </Text>
            </View>

            {isBiometricEnrolled && (
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.enableButton}
                  onPress={handleEnableBiometric}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.enableButtonText}>
                      Enable {biometricType}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.disableButton}
                  onPress={handleDisableBiometric}
                  disabled={isLoading}
                >
                  <Text style={styles.disableButtonText}>Disable</Text>
                </TouchableOpacity>
              </View>
            )}

            {!isBiometricEnrolled && (
              <View style={styles.enrollmentContainer}>
                <Text style={styles.enrollmentText}>
                  Please enroll {biometricType.toLowerCase()} in your device settings first.
                </Text>
                <TouchableOpacity
                  style={styles.checkAgainButton}
                  onPress={checkBiometricAvailability}
                >
                  <Text style={styles.checkAgainButtonText}>Check Again</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <View style={styles.skipContainer}>
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip for Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
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
    flex: 1,
    paddingHorizontal: 20,
  },
  unavailableContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unavailableTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  unavailableText: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  availableContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  biometricInfo: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    alignItems: 'center',
  },
  biometricType: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  biometricStatus: {
    fontSize: 16,
    color: '#00FF88',
  },
  buttonContainer: {
    gap: 15,
  },
  enableButton: {
    backgroundColor: '#00FF88',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  enableButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disableButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF4444',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  disableButtonText: {
    color: '#FF4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
  enrollmentContainer: {
    alignItems: 'center',
  },
  enrollmentText: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  checkAgainButton: {
    backgroundColor: '#333333',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  checkAgainButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  skipContainer: {
    paddingBottom: 40,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  skipButtonText: {
    color: '#888888',
    fontSize: 16,
  },
});
