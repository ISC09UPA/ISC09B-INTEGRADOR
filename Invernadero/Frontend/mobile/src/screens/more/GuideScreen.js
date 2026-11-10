/**
 * Guía de soporte (enlace «Ver guía de soporte» de Más).
 * Muestra las secciones de conexión y diagnóstico de la Raspberry Pi.
 */
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { Card, EmptyState, ScreenHeader, Skeleton } from '../../components';
import { colors, radii, spacing, typography } from '../../theme';

export default function GuideScreen({ navigation }) {
  const { guia, cargarGuia } = useApp();
  const [cargando, setCargando] = useState(true);

  // Carga el contenido de la guía al abrir la pantalla.
  useEffect(() => {
    let activo = true;
    cargarGuia().finally(() => {
      if (activo) setCargando(false);
    });
    return () => {
      activo = false;
    };
  }, [cargarGuia]);

  return (
    <SafeAreaView edges={['top']} style={styles.pantalla}>
      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Guía de soporte"
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

        {cargando ? (
          <Card>
            <Skeleton width="70%" height={16} />
            <Skeleton width="100%" height={12} style={styles.skeleton} />
            <Skeleton width="100%" height={12} style={styles.skeleton} />
            <Skeleton width="100%" height={12} style={styles.skeleton} />
          </Card>
        ) : guia ? (
          guia.secciones.map((seccion) => (
            <Card key={seccion.titulo}>
              <Text style={styles.tituloSeccion}>{seccion.titulo}</Text>
              <Text style={styles.textoSeccion}>{seccion.texto}</Text>
            </Card>
          ))
        ) : (
          <EmptyState
            icon="file-text"
            title="Guía no disponible"
            description="No se pudo cargar la guía de soporte."
            actionLabel="Reintentar"
            onAction={cargarGuia}
          />
        )}
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
  skeleton: {
    marginTop: spacing.md,
  },
  tituloSeccion: {
    ...typography.section,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  textoSeccion: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
