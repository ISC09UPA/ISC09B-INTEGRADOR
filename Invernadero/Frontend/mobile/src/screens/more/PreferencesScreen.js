/**
 * Preferencias (dentro de Perfil): unidades, idioma y tema.
 * Pantalla simple sin mockup; usa controles segmentados del sistema de diseño.
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { PrimaryButton, ScreenHeader, SegmentedControl } from '../../components';
import { colors, radii, spacing, typography } from '../../theme';

const SECCIONES = [
  {
    clave: 'unidades',
    titulo: 'Unidades',
    opciones: [
      { label: '°C y litros', value: '°C y litros' },
      { label: '°F y galones', value: '°F y galones' },
    ],
  },
  {
    clave: 'idioma',
    titulo: 'Idioma',
    opciones: [
      { label: 'Español', value: 'Español' },
      { label: 'English', value: 'English' },
    ],
  },
  {
    clave: 'tema',
    titulo: 'Tema',
    opciones: [
      { label: 'Claro', value: 'Claro' },
      { label: 'Oscuro', value: 'Oscuro' },
    ],
  },
];

export default function PreferencesScreen({ navigation }) {
  const { preferencias, actualizarPreferencias, mostrarToast } = useApp();

  const [valores, setValores] = useState({
    unidades: preferencias?.unidades ?? '°C y litros',
    idioma: preferencias?.idioma ?? 'Español',
    tema: preferencias?.tema ?? 'Claro',
  });
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setGuardando(true);
    try {
      await actualizarPreferencias(valores);
      mostrarToast('exito', 'Preferencias actualizadas.');
      navigation.goBack();
    } catch (error) {
      mostrarToast('error', error.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.pantalla}>
      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Preferencias"
          left={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Regresar"
              onPress={() => navigation.goBack()}
              style={styles.volver}
            >
              <Feather name="chevron-left" size={20} color={colors.primary} />
            </Pressable>
          }
        />

        {SECCIONES.map((seccion) => (
          <View key={seccion.clave} style={styles.seccion}>
            <Text style={styles.titulo}>{seccion.titulo}</Text>
            <SegmentedControl
              options={seccion.opciones}
              value={valores[seccion.clave]}
              onChange={(valor) => setValores((prev) => ({ ...prev, [seccion.clave]: valor }))}
            />
          </View>
        ))}

        <PrimaryButton label="Guardar cambios" onPress={guardar} loading={guardando} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contenido: {
    padding: spacing.screen,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  volver: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seccion: {
    gap: spacing.sm,
  },
  titulo: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
});
