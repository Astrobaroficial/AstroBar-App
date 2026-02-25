import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { CameraView, Camera } from "expo-camera";
import { useTheme } from "@/hooks/useTheme";
import { apiRequest } from "@/lib/query-client";
import { AstroBarColors } from "@/constants/theme";

export default function QRScannerScreen() {
  const { theme } = useTheme();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || loading) return;
    
    setScanned(true);
    setLoading(true);

    try {
      const response = await apiRequest("/api/promotions/redeem", {
        method: "POST",
        body: JSON.stringify({ qrCode: data }),
      });

      if (response.success) {
        Alert.alert(
          "✅ Promoción Canjeada",
          `Cliente: ${response.transaction.userId}\nMonto: $${response.transaction.amountPaid}`,
          [{ text: "OK", onPress: () => { setScanned(false); setLoading(false); } }]
        );
      }
    } catch (error: any) {
      Alert.alert("❌ Error", error.message || "No se pudo canjear la promoción", [
        { text: "Reintentar", onPress: () => { setScanned(false); setLoading(false); } }
      ]);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={AstroBarColors.primary} />
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.text, { color: theme.text }]}>
          Se necesita permiso de cámara para escanear códigos QR
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
      />
      <View style={styles.overlay}>
        <View style={styles.scanArea} />
        <Text style={styles.instructions}>
          {loading ? "Validando..." : "Apunta al código QR del cliente"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 16,
    textAlign: "center",
    padding: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  scanArea: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: AstroBarColors.primary,
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  instructions: {
    marginTop: 20,
    fontSize: 16,
    color: "#fff",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
});
