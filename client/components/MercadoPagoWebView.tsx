import React from 'react';
import { View, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, AstroBarColors } from '@/constants/theme';

interface MercadoPagoWebViewProps {
  authUrl: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function MercadoPagoWebView({ authUrl, onSuccess, onCancel }: MercadoPagoWebViewProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const handleNavigationStateChange = (navState: any) => {
    const { url } = navState;
    
    // Detectar cuando Mercado Pago redirige al callback
    if (url.includes('astrobar://mp-connected')) {
      if (url.includes('success=true')) {
        onSuccess();
      } else {
        onCancel();
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md, backgroundColor: AstroBarColors.primary }]}>
        <Pressable onPress={onCancel} style={styles.closeButton}>
          <Feather name="x" size={24} color="#FFFFFF" />
        </Pressable>
        <ThemedText type="h4" style={{ color: '#FFFFFF', flex: 1, textAlign: 'center' }}>
          Conectar Mercado Pago
        </ThemedText>
        <View style={{ width: 40 }} />
      </View>
      
      <WebView
        source={{ uri: authUrl }}
        onNavigationStateChange={handleNavigationStateChange}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={AstroBarColors.primary} />
            <ThemedText style={{ marginTop: Spacing.md }}>Cargando...</ThemedText>
          </View>
        )}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
});
