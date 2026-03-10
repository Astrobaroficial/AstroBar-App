import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius, AstroBarColors } from '@/constants/theme';

export default function TermsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme } = useTheme();

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <ThemedText type="h4" style={styles.sectionTitle}>{title}</ThemedText>
      {children}
    </View>
  );

  const Paragraph = ({ children }: { children: React.ReactNode }) => (
    <ThemedText type="body" style={[styles.paragraph, { color: theme.textSecondary }]}>
      {children}
    </ThemedText>
  );

  const BulletPoint = ({ children }: { children: string }) => (
    <View style={styles.bulletContainer}>
      <View style={[styles.bullet, { backgroundColor: AstroBarColors.primary }]} />
      <ThemedText type="body" style={[styles.bulletText, { color: theme.textSecondary }]}>
        {children}
      </ThemedText>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="h3">Términos y Condiciones</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={[styles.badge, { backgroundColor: AstroBarColors.primary + '20' }]}>
          <ThemedText type="small" style={{ color: AstroBarColors.primary, fontWeight: '600' }}>
            Última actualización: Febrero 2025
          </ThemedText>
        </View>

        <Section title="1. Aceptación de los Términos">
          <Paragraph>
            Al acceder y utilizar AstroBar, usted acepta estar legalmente vinculado por estos Términos y Condiciones. 
            AstroBar es una plataforma tecnológica que conecta usuarios con bares nocturnos mediante promociones flash y comunes en Buenos Aires, Argentina.
          </Paragraph>
        </Section>

        <Section title="2. Servicios de la Plataforma">
          <ThemedText type="body" style={[styles.subsectionTitle, { color: theme.text }]}>
            Para Usuarios/Clientes:
          </ThemedText>
          <BulletPoint>Explorar bares nocturnos en Buenos Aires</BulletPoint>
          <BulletPoint>Acceder a promociones flash (5-15 minutos)</BulletPoint>
          <BulletPoint>Aceptar promociones comunes programadas</BulletPoint>
          <BulletPoint>Sistema de puntos y niveles (Copper → Platinum)</BulletPoint>
          <BulletPoint>Códigos QR únicos para canjear en el bar</BulletPoint>

          <ThemedText type="body" style={[styles.subsectionTitle, { color: theme.text }]}>
            Para Bares:
          </ThemedText>
          <BulletPoint>Panel de gestión de promociones</BulletPoint>
          <BulletPoint>Control de menú y productos</BulletPoint>
          <BulletPoint>Estadísticas de ventas y canjes</BulletPoint>
          <BulletPoint>Comisión progresiva: Mes 1 gratis, Mes 2: 5%, Mes 3: 10%, Mes 4+: 15%</BulletPoint>
          <BulletPoint>El bar recibe 100% del precio del producto</BulletPoint>
        </Section>

        <Section title="3. Sistema de Pagos y Comisiones">
          <Paragraph>
            Por cada promoción aceptada, la distribución es:
          </Paragraph>
          <BulletPoint>Bar: 100% del precio del producto promocional</BulletPoint>
          <BulletPoint>AstroBar: Comisión progresiva adicional que paga el usuario</BulletPoint>
          <BulletPoint>Primer mes: 0% (gratis para nuevos bares)</BulletPoint>
          <BulletPoint>Segundo mes: 5% adicional</BulletPoint>
          <BulletPoint>Tercer mes: 10% adicional</BulletPoint>
          <BulletPoint>Cuarto mes en adelante: 15% adicional</BulletPoint>
          <Paragraph>
            Los pagos se procesan de forma segura mediante Stripe. El usuario tiene 60 segundos para cancelar después de aceptar.
          </Paragraph>
        </Section>

        <Section title="4. Cancelaciones y Política de Uso">
          <BulletPoint>Cancelación dentro de 60 segundos: Reembolso 100%</BulletPoint>
          <BulletPoint>Después de 60 segundos: Sin reembolso</BulletPoint>
          <BulletPoint>QR codes son únicos y de un solo uso</BulletPoint>
          <BulletPoint>Las promociones flash tienen duración limitada (5-15 minutos)</BulletPoint>
          <BulletPoint>Stock limitado por promoción</BulletPoint>
        </Section>

        <Section title="5. Sistema de Puntos y Niveles">
          <Paragraph>
            Los usuarios ganan 10 puntos por cada promoción canjeada exitosamente. Los niveles son:
          </Paragraph>
          <BulletPoint>Copper: 0-99 puntos</BulletPoint>
          <BulletPoint>Bronze: 100-249 puntos</BulletPoint>
          <BulletPoint>Silver: 250-499 puntos</BulletPoint>
          <BulletPoint>Gold: 500-999 puntos</BulletPoint>
          <BulletPoint>Platinum: 1000+ puntos</BulletPoint>
        </Section>

        <Section title="6. Privacidad y Datos">
          <Paragraph>
            Recopilamos información necesaria para operar el servicio: nombre, teléfono, ubicación (durante uso), 
            historial de pedidos. Ver Política de Privacidad completa para más detalles.
          </Paragraph>
        </Section>

        <Section title="7. Limitación de Responsabilidad">
          <Paragraph>
            AstroBar es una plataforma tecnológica intermediaria entre usuarios y bares. No somos responsables de la calidad de productos, 
            servicios o acciones de los bares participantes. El servicio se proporciona "tal cual" sin garantías de 
            disponibilidad ininterrumpida. Los usuarios deben ser mayores de 18 años.
          </Paragraph>
        </Section>

        <Section title="8. Conducta Prohibida">
          <Paragraph>
            Está prohibido: usar la plataforma para actividades ilegales, crear múltiples cuentas para abusar de promociones, 
            revender códigos QR, acosar a otros usuarios o personal de bares. Consecuencia: suspensión permanente.
            Solo usuarios mayores de 18 años pueden usar la plataforma.
          </Paragraph>
        </Section>

        <Section title="9. Modificaciones">
          <Paragraph>
            AstroBar puede modificar estos términos en cualquier momento. Los cambios serán notificados 
            mediante la app y email. El uso continuado constituye aceptación.
          </Paragraph>
        </Section>

        <Section title="10. Contacto">
          <Paragraph>
            Email: support@astrobar.app{'\n'}
            Ubicación: Buenos Aires, Argentina{'\n'}
            Soporte disponible en la app
          </Paragraph>
        </Section>

        <View style={[styles.footer, { backgroundColor: theme.card }]}>
          <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: 'center' }}>
            🌙 AstroBar - Conectando bares con usuarios en Buenos Aires
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: 'center', marginTop: Spacing.xs }}>
            © 2025 AstroBar. Todos los derechos reservados.
          </ThemedText>
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing['4xl'],
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
    fontWeight: '700',
  },
  subsectionTitle: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    fontWeight: '600',
  },
  paragraph: {
    lineHeight: 24,
    marginBottom: Spacing.md,
  },
  bulletContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
    paddingLeft: Spacing.md,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    marginRight: Spacing.sm,
  },
  bulletText: {
    flex: 1,
    lineHeight: 22,
  },
  footer: {
    marginTop: Spacing.xl,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
});
