import React from 'react';
import { Modal, View, Text, StyleSheet, Button } from 'react-native';

interface Props {
  visible: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

const BiometricAuthModal: React.FC<Props> = ({ visible, onSuccess, onCancel }) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={styles.container}>
      <View style={styles.box}>
        <Text style={styles.text}>Authenticate (Stub)</Text>
        <Button title="Unlock" onPress={onSuccess} />
        <Button title="Cancel" onPress={onCancel} />
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  box: { backgroundColor: '#fff', padding: 24, borderRadius: 8, width: 250, alignItems: 'center' },
  text: { marginBottom: 12, fontSize: 16 },
});

export default BiometricAuthModal; 