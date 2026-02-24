import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { CameraView, Camera } from "expo-camera";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AstroBarColors } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";

export default function ScanQRScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned || isProcessing) return;
    setScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    redeemPromotion(data);
  };

  const redeemPromotion = async (qrCode: string) => {
    setIsProcessing(true);

    try {
      const response = await apiRequest('POST', '/api/promotions/redeem', {
        qrCode: qrCode.trim(),
      });
      const data = await response.json();

      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        alert('✅ Promoción canjeada exitosamente!\n\nEl cliente ganó 10 puntos.');
        setScanned(false);
        setManualCode("");
      }
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      alert(`❌ Error: ${error.message || 'Código QR inválido'}`);
      setScanned(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSubmit = () => {
    if (!manualCode.trim()) {
      alert('Ingresá un código QR');
      return;
    }
    redeemPromotion(manualCode);
  };

  if (hasPermission === null) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={AstroBarColors.primary} />
        <ThemedText type="body" style={{ marginTop: Spacing.md }}>
          Solicitando permisos de cámara...
        </ThemedText>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Feather name="camera-off" size={64} color={theme.textSecondary} />
        <ThemedText type="h3" style={{ marginTop: Spacing.lg }}>
          Sin acceso a cámara
        </ThemedText>
        <ThemedText type="body" style={{ marginTop: Spacing.sm, textAlign: 'center', paddingHorizontal: Spacing.xl }}>
          Necesitamos acceso a la cámara para escanear códigos QR
        </ThemedText>
        <Button
          onPress={requestCameraPermission}
          style={{ marginTop: Spacing.xl }}
        >
          Solicitar Permiso
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.fullContainer}>
      <LinearGradient
        colors={['rgba(0,0,0,0.8)', 'transparent', 'rgba(0,0,0,0.8)']}
        style={styles.overlay}
      >
        <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="x" size={24} color="#FFFFFF" />
          </Pressable>
          <ThemedText type="h3" style={{ color: '#FFFFFF' }}>
            Escanear QR
          </ThemedText>
          <Pressable onPress={() => setShowManual(!showManual)} style={styles.backButton}>
            <Feather name="edit-3" size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        {!showManual && Platform.OS !== 'web' && (
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
          />
        )}

        <View style={styles.content}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>

          <ThemedText type="body" style={styles.instruction}>
            {isProcessing ? 'Procesando...' : 'Apuntá la cámara al código QR del cliente'}
          </ThemedText>

          {showManual && (
            <View style={[styles.manualCard, { backgroundColor: theme.card }]}>
              <ThemedText type="body" style={{ marginBottom: Spacing.md }}>
                Ingresar código manualmente:
              </ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                placeholder="ASTRO-XXXXXXXX"
                placeholderTextColor={theme.textSecondary}
                value={manualCode}
                onChangeText={setManualCode}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <Button
                onPress={handleManualSubmit}
                disabled={isProcessing}
                style={{ marginTop: Spacing.md }}
              >
                {isProcessing ? <ActivityIndicator color="#FFFFFF" /> : 'CANJEAR'}
              </Button>
            </View>
          )}

          {isProcessing && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <ThemedText type="body" style={{ color: '#FFFFFF', marginTop: Spacing.md }}>
                Validando...
              </ThemedText>
            </View>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#FFD700',
    borderWidth: 4,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  instruction: {
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: Spacing.xl,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  manualCard: {
    width: '100%',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginTop: Spacing.xl,
  },
  input: {
    height: 52,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 2,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
