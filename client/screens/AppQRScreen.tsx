import React, { useState, useRef } from 'react';
import { View, StyleSheet, Pressable, Alert, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { captureRef } from 'react-native-view-shot';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius, AstroBarColors, Shadows } from '@/constants/theme';

const APP_DOWNLOAD_URL = 'https://astrobar.app/download'; // URL de descarga de la app

export default function AppQRScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const qrRef = useRef<View>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownloadQR = async () => {
    try {
      setIsGenerating(true);
      
      // Solicitar permisos
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería para guardar el QR');
        return;
      }

      // Capturar el QR como imagen
      const uri = await captureRef(qrRef, {
        format: 'png',
        quality: 1,
      });

      // Guardar en galería
      await MediaLibrary.saveToLibraryAsync(uri);
      
      Alert.alert(
        '¡Éxito!', 
        'QR de AstroBar guardado en tu galería. Ahora puedes imprimirlo o usarlo en publicidad.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error saving QR:', error);
      Alert.alert('Error', 'No se pudo guardar el QR');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShareQR = async () => {
    try {
      await Share.share({
        message: `🌙 ¡Descarga AstroBar!\n\n🍺 Promociones exclusivas en bares de Buenos Aires\n⚡ Promociones flash de 5-15 minutos\n🏆 Sistema de puntos y niveles\n\n📱 Escanea el QR o visita:\n${APP_DOWNLOAD_URL}`,
        title: 'AstroBar - Promociones Nocturnas'
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="h2">QR de la App</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={[styles.qrContainer, { backgroundColor: theme.card }, Shadows.lg]} ref={qrRef}>
          <View style={styles.qrHeader}>
            <View style={styles.logoContainer}>
              <ThemedText type="h1" style={styles.logo}>🌙</ThemedText>
              <ThemedText type="h2" style={styles.appName}>AstroBar</ThemedText>
            </View>
            <ThemedText type="small" style={styles.tagline}>
              Promociones Nocturnas en Buenos Aires
            </ThemedText>
          </View>

          <View style={styles.qrCodeWrapper}>
            <QRCode
              value={APP_DOWNLOAD_URL}
              size={200}
              color="#000000"
              backgroundColor="#FFFFFF"
              logo={require('../../assets/icon.png')}
              logoSize={40}
              logoBackgroundColor="transparent"
            />
          </View>

          <View style={styles.qrFooter}>
            <ThemedText type="small" style={styles.instructions}>
              Escanea para descargar AstroBar
            </ThemedText>
            <ThemedText type="caption" style={styles.url}>
              {APP_DOWNLOAD_URL}
            </ThemedText>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Feather name="info" size={20} color={AstroBarColors.primary} />
            <ThemedText type="h4" style={styles.infoTitle}>
              Usos del QR
            </ThemedText>
          </View>
          
          <View style={styles.useCase}>
            <Feather name="printer" size={16} color={theme.textSecondary} />
            <ThemedText type="small" style={styles.useCaseText}>
              Imprimir en cartelería de bares
            </ThemedText>
          </View>
          
          <View style={styles.useCase}>
            <Feather name="smartphone" size={16} color={theme.textSecondary} />
            <ThemedText type="small" style={styles.useCaseText}>
              Mostrar en pantallas digitales
            </ThemedText>
          </View>
          
          <View style={styles.useCase}>
            <Feather name="share-2" size={16} color={theme.textSecondary} />
            <ThemedText type="small" style={styles.useCaseText}>
              Compartir en redes sociales
            </ThemedText>
          </View>
          
          <View style={styles.useCase}>
            <Feather name="map-pin" size={16} color={theme.textSecondary} />
            <ThemedText type="small" style={styles.useCaseText}>
              Colocar en mesas y espacios físicos
            </ThemedText>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Pressable
            style={[styles.button, styles.downloadButton]}
            onPress={handleDownloadQR}
            disabled={isGenerating}
          >
            <Feather name="download" size={20} color="#FFFFFF" />
            <ThemedText style={styles.buttonText}>
              {isGenerating ? 'Guardando...' : 'Guardar QR'}
            </ThemedText>
          </Pressable>

          <Pressable
            style={[styles.button, styles.shareButton, { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }]}
            onPress={handleShareQR}
          >
            <Feather name="share-2" size={20} color={theme.text} />
            <ThemedText style={[styles.buttonText, { color: theme.text }]}>
              Compartir
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  qrContainer: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  qrHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  logo: {
    fontSize: 32,
  },
  appName: {
    color: AstroBarColors.primary,
    fontWeight: '700',
  },
  tagline: {
    textAlign: 'center',
    opacity: 0.7,
  },
  qrCodeWrapper: {
    padding: Spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  qrFooter: {
    alignItems: 'center',
  },
  instructions: {
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  url: {
    opacity: 0.6,
    fontSize: 10,
  },
  infoCard: {
    backgroundColor: AstroBarColors.primary + '10',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  infoTitle: {
    color: AstroBarColors.primary,
  },
  useCase: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  useCaseText: {
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  downloadButton: {
    backgroundColor: AstroBarColors.primary,
  },
  shareButton: {
    // Styles applied inline
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});