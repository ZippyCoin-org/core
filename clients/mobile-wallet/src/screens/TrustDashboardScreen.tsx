import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const TrustDashboardScreen: React.FC = () => (
  <View style={styles.container}>
    <Text style={styles.text}>Trust Dashboard (Stub)</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 18, fontWeight: 'bold' },
});

export default TrustDashboardScreen; 