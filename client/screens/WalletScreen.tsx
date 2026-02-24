import React from 'react';
import { View, StyleSheet } from 'react-native';
import UniversalWallet from '../components/UniversalWallet';
import { useAuth } from '../contexts/AuthContext';

export default function WalletScreen() {
  const { user } = useAuth();

  // Configure wallet features based on user role
  const showWithdrawals = user?.role === 'driver' || user?.role === 'business';
  const showConnectSetup = user?.role === 'driver' || user?.role === 'business';

  return (
    <View style={styles.container}>
      <UniversalWallet 
        showWithdrawals={showWithdrawals}
        showConnectSetup={showConnectSetup}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});