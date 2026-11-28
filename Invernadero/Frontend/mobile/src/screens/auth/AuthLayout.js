/**
 * Plantilla compartida de las pantallas de autenticación:
 *  - Cabecera verde oscuro: icono de hoja en cuadro verde claro,
 *    «Invernadero Inteligente» y lema «Tu cultivo, siempre cuidado.»
 *  - Tarjeta clara con esquinas superiores muy redondeadas que se
 *    superpone a la cabecera y contiene el formulario.
 *  - Franja inferior verde oscuro con el texto legal.
 */
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { colors, radii, spacing, typography } from '../../theme';

export default function AuthLayout({ children }) {
  const { mostrarToast } = useApp();

  // Los enlaces legales aún no tienen documento asociado.
  const abrirDocumentoLegal = () =>
    mostrarToast('info', 'El documento legal estará disponible próximamente.');

  return (
    <View style={styles.raiz}>
      {/* Cabecera verde oscuro */}
      <SafeAreaView edges={['top']} style={styles.cabecera}>
        <View style={styles.logo}>
          <Ionicons name="leaf" size={22} color={colors.primary} />
        </View>
        <Text style={styles.nombreApp}>Invernadero Inteligente</Text>
        <Text style={styles.lema}>Tu cultivo, siempre cuidado.</Text>
      </SafeAreaView>

      {/* Tarjeta clara superpuesta con el formulario */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.tarjeta}>
          <ScrollView
            contentContainerStyle={styles.contenido}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* Franja legal inferior */}
      <SafeAreaView edges={['bottom']} style={styles.legal}>
        <Text style={styles.legalTexto}>
          Al continuar aceptas los{' '}
          <Text style={styles.legalEnlace} onPress={abrirDocumentoLegal}>
            Términos
          </Text>{' '}
          y la{' '}
          <Text style={styles.legalEnlace} onPress={abrirDocumentoLegal}>
            Política de privacidad
          </Text>
          .
        </Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: {
    flex: 1,
    backgroundColor: colors.primaryDark,
  },
  flex: {
    flex: 1,
  },
  cabecera: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  nombreApp: {
    ...typography.title,
    color: colors.onPrimary,
    textAlign: 'center',
  },
  lema: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  tarjeta: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  contenido: {
    padding: spacing.screen,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
  },
  legal: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  legalTexto: {
    ...typography.micro,
    color: 'rgba(255, 255, 255, 0.75)',
    textAlign: 'center',
    lineHeight: 18,
  },
  legalEnlace: {
    fontWeight: '700',
    color: colors.white,
    textDecorationLine: 'underline',
  },
});
