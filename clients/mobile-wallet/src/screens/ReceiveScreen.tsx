import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ReceiveScreen: React.FC = () => (
  <View style={styles.container}>
    <Text style={styles.text}>Receive Screen (Stub)</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 18, fontWeight: 'bold' },
});

export default ReceiveScreen; 