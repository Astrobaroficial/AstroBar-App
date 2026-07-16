import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  FadeIn,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";

import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, AstroBarColors, Shadows } from "@/constants/theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const ONBOARDING_KEY = "@AstroBar_onboarding_completed";

// 🎨 Paleta de colores corporativos extraída de tu nueva identidad visual
const CORPORATE_COLORS = {
  orange: "#F16A30",       // Naranja de la marca
  darkPurple: "#1A042B",   // Púrpura oscuro para el fondo degradado (Superior)
  deepPurple: "#11011E",   // Púrpura ultra profundo (Inferior)
  glassBorder: "rgba(241, 106, 48, 0.15)", // Borde de vidrio con sutil naranja
  textMuted: "#D3C2DC"     // Texto secundario suavizado en tonos lavanda/gris
};

interface OnboardingSlide {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  points?: string[];
}

// 📝 Textos reestructurados en base a la información de tu presentación corporativa
const slides: OnboardingSlide[] = [
  {
    id: 1,
    title: "¿Quiénes somos?",
    subtitle: "AstroBar Plataforma",
    description:
      "Una plataforma digital diseñada para evolucionar la forma en que conectás con los establecimientos gastronómicos de la ciudad, transformando tus salidas en beneficios exclusivos.",
    icon: "users",
    iconColor: CORPORATE_COLORS.orange,
  },
  {
    id: 2,
    title: "Misión y Visión",
    subtitle: "Nuestra meta",
    description:
      'Facilitamos encuentros memorables y accesibles optimizando la relación entre vos y los comercios locales.\n\nBuscamos ser la aplicación indispensable en tu teléfono en cada salida gastronómica.',
    icon: "target",
    iconColor: CORPORATE_COLORS.orange,
  },
  {
    id: 3,
    title: "Público Objetivo",
    subtitle: "Para amantes de la gastronomía",
    description: "Un ecosistema colaborativo ideal para vos si buscás:",
    icon: "award",
    iconColor: CORPORATE_COLORS.orange,
    points: [
      "1. Descubrir locales desde tu smartphone",
      "2. Acceso ágil a beneficios exclusivos",
      "3. Potenciar el valor de cada salida",
      "4. Formar parte de una comunidad activa",
    ],
  },
];

function StarFieldEffect({ x, y, size, delay }: { x: number; y: number; size: number; delay: number }) {
  const opacity = useSharedValue(0.1);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(withTiming(0.7, { duration: 1500 + Math.random() * 1000 }), -1, true)
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.star,
        animatedStyle,
        {
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    />
  );
}

interface OnboardingOverlayProps {
  onComplete: () => void;
}

function SlideContent({
  slide,
  isActive,
}: {
  slide: OnboardingSlide;
  isActive: boolean;
}) {
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(0.92);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      scale.value = withSpring(1, { damping: 14, stiffness: 140 });
      opacity.value = withTiming(1, { duration: 350 });
    } else {
      scale.value = 0.92;
      opacity.value = 0;
    }
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={[styles.slideContainer, { paddingTop: insets.top + Spacing.md }]}>
      <Animated.View style={[styles.slideContent, animatedStyle]}>
        
        {/* Tarjeta Cristal con tono y bordes ajustados a la nueva marca */}
        <BlurView intensity={25} tint="dark" style={styles.glassCard}>
          
          {/* Contenedor circular con aura en naranja corporativo */}
          <View style={[styles.iconContainer, { shadowColor: slide.iconColor, borderColor: "rgba(241, 106, 48, 0.3)" }]}>
            <Feather name={slide.icon} size={40} color={slide.iconColor} />
          </View>

          <ThemedText type="h1" style={styles.title}>
            {slide.title}
          </ThemedText>

          <ThemedText type="h4" style={styles.subtitle}>
            {slide.subtitle}
          </ThemedText>

          <View style={[styles.divider, { backgroundColor: slide.iconColor + "50", shadowColor: slide.iconColor }]} />

          <ThemedText type="body" style={styles.description}>
            {slide.description}
          </ThemedText>

          {slide.points && (
            <View style={styles.pointsWrapper}>
              {slide.points.map((item, idx) => (
                <View key={idx} style={styles.pointRow}>
                  <ThemedText style={styles.pointText}>{item}</ThemedText>
                </View>
              ))}
            </View>
          )}
        </BlurView>

      </Animated.View>
    </View>
  );
}

export function OnboardingOverlay({ onComplete }: OnboardingOverlayProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [stars, setStars] = useState<{ id: number; x: number; y: number; size: number; delay: number }[]>([]);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const generated = Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      x: Math.random() * SCREEN_WIDTH,
      y: Math.random() * SCREEN_HEIGHT,
      size: Math.random() * 2 + 1,
      delay: Math.random() * 1500,
    }));
    setStars(generated);
  }, []);

  const handleNext = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      await AsyncStorage.setItem(ONBOARDING_KEY, "true");
      onComplete();
    }
  };

  const handleSkip = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    onComplete();
  };

  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={styles.overlay}
    >
      {/* 🔮 Fondo degradado corporativo unificado de la marca (Púrpura profundo) */}
      <LinearGradient 
        colors={[CORPORATE_COLORS.darkPurple, CORPORATE_COLORS.deepPurple]} 
        style={StyleSheet.absoluteFillObject} 
      />
      
      {/* Capa sutil de polvo estelar parpadeando */}
      {stars.map((s) => (
        <StarFieldEffect key={s.id} x={s.x} y={s.y} size={s.size} delay={s.delay} />
      ))}

      <Pressable style={styles.touchArea} onPress={handleNext}>
        <SlideContent slide={slides[currentSlide]} isActive={true} />
      </Pressable>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <View style={styles.pagination}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, index === currentSlide && styles.dotActive]}
            />
          ))}
        </View>

        <View style={styles.buttons}>
          {!isLastSlide ? (
            <Pressable onPress={handleSkip} style={styles.skipButton}>
              <ThemedText type="body" style={styles.skipText}>
                Saltar
              </ThemedText>
            </Pressable>
          ) : (
            <View style={styles.skipButtonPlaceholder} />
          )}

          {/* Botón "Siguiente / Comenzar" con la nueva paleta de color naranja de AstroBar */}
          <Pressable
            onPress={handleNext}
            style={[
              styles.nextButton,
              { backgroundColor: CORPORATE_COLORS.orange }
            ]}
          >
            <ThemedText type="body" style={[styles.nextText, { color: "#FFFFFF" }]}>
              {isLastSlide ? "Comenzar" : "Siguiente"}
            </ThemedText>
            <Feather
              name={isLastSlide ? "check" : "arrow-right"}
              size={16}
              color="#FFFFFF"
            />
          </Pressable>
        </View>

        <ThemedText type="small" style={styles.tapHint}>
          Toca la pantalla para continuar
        </ThemedText>
      </View>
    </Animated.View>
  );
}

export async function checkOnboardingCompleted(): Promise<boolean> {
  try {
    const completed = await AsyncStorage.getItem(ONBOARDING_KEY);
    return completed === "true";
  } catch {
    return false;
  }
}

export async function resetOnboarding(): Promise<void> {
  await AsyncStorage.removeItem(ONBOARDING_KEY);
}

const styles = StyleSheet.create({
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 },
  touchArea: { flex: 1 },
  star: { position: "absolute", backgroundColor: "rgba(255, 255, 255, 0.4)" },
  slideContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: Spacing.xl },
  slideContent: { width: "100%", maxWidth: 350 },
  
  // Tarjeta con borde naranja translúcido y fondo de cristal adaptado
  glassCard: { 
    width: "100%", 
    borderRadius: BorderRadius.xl, 
    padding: Spacing.xl, 
    borderWidth: 1.5, 
    borderColor: CORPORATE_COLORS.glassBorder, 
    alignItems: "center", 
    overflow: "hidden", 
    backgroundColor: "rgba(26, 4, 43, 0.35)" 
  },
  iconContainer: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: "rgba(26, 4, 43, 0.8)", 
    justifyContent: "center", 
    alignItems: "center", 
    marginBottom: Spacing.md, 
    borderWidth: 1.5, 
    shadowOffset: { width: 0, height: 0 }, 
    shadowOpacity: 0.6, 
    shadowRadius: 10, 
    elevation: 5 
  },
  title: { color: "#FFFFFF", fontSize: 26, fontWeight: "900", textAlign: "center", letterSpacing: 0.5 },
  subtitle: { color: CORPORATE_COLORS.textMuted, textAlign: "center", marginTop: 4, fontWeight: "700", fontSize: 13, textTransform: "uppercase", letterSpacing: 1 },
  divider: { width: 45, height: 2.5, borderRadius: 1.25, marginVertical: Spacing.md, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 3 },
  description: { color: "#F1EDF5", textAlign: "center", lineHeight: 22, fontSize: 14, fontWeight: "500" },
  
  pointsWrapper: { width: "100%", marginTop: Spacing.md, gap: 8 },
  pointRow: { width: "100%", paddingVertical: 8, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: "rgba(241, 106, 48, 0.06)", borderWidth: 0.5, borderColor: "rgba(241, 106, 48, 0.1)" },
  pointText: { color: "#F1EDF5", fontSize: 13, fontWeight: "600", textAlign: "left" },

  footer: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, backgroundColor: "transparent" },
  pagination: { flexDirection: "row", justifyContent: "center", marginBottom: Spacing.md },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: "rgba(255, 255, 255, 0.15)", marginHorizontal: 4 },
  
  // El indicador de la paginación activa se tiñe de color naranja corporativo
  dotActive: { backgroundColor: CORPORATE_COLORS.orange, width: 18 },
  buttons: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%" },
  skipButton: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.sm, backgroundColor: "rgba(255,255,255,0.04)" },
  skipButtonPlaceholder: { width: 60 },
  skipText: { color: CORPORATE_COLORS.textMuted, fontWeight: "700", fontSize: 13 },
  nextButton: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: Spacing.xl, borderRadius: BorderRadius.md, gap: 8, ...Shadows.sm },
  nextText: { fontWeight: "800", fontSize: 14 },
  tapHint: { color: "rgba(255,255,255,0.3)", textAlign: "center", marginTop: Spacing.sm, fontWeight: '500', fontSize: 11 },
});