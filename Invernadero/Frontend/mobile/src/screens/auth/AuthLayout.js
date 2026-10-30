
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
import { colors, radii, spacing, typography } from '../../theme';

export default function AuthLayout({ children }) {
  return (
    <View style={styles.raiz}>
      
      <SafeAreaView edges={['top']} style={styles.cabecera}>
        <View style={styles.logo}>
          <Ionicons name="leaf" size={22} color={colors.primary} />
        </View>
        <Text style={styles.nombreApp}>Invernadero Inteligente</Text>
        <Text style={styles.lema}>Tu cultivo, siempre cuidado.</Text>
      </SafeAreaView>

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

      <SafeAreaView edges={['bottom']} style={styles.legal}>
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
