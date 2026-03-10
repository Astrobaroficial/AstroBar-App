import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/constants/theme';

interface ThemedScreenWrapperProps {
  children: React.ReactNode;
}

export function ThemedScreenWrapper({ children }: ThemedScreenWrapperProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});