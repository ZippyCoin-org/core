import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';

type Props = StackScreenProps<RootStackParamList, 'Unlock'>;

const UnlockScreen: React.FC<Props> = ({ route, navigation }) => {
  const onUnlock = () => {
    route.params?.onUnlock?.();
    navigation.replace('Main');
  };
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Unlock Wallet (Stub)</Text>
      <Button title="Unlock" onPress={onUnlock} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
});

export default UnlockScreen; 