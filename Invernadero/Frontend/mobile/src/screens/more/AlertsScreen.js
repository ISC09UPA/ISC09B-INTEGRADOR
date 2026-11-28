/**
 * Pantalla 8: Alertas (dentro de Más).
 * Lista de alertas con borde izquierdo por severidad, acción «Marcar leídas»
 * y bloque «Todo bajo control» cuando no hay alertas sin revisar.
 */
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { Card, IconBox, ScreenHeader, StatusChip } from '../../components';
import { plural } from '../../utils/formatters';
import { colors, spacing, typography } from '../../theme';

/** Estilos por severidad: Alta (rojo), Media (amarillo), Info (gris). */
const SEVERIDADES = {
  alta: { etiqueta: 'Alta', tone: 'danger', color: colors.danger, bg: colors.dangerBg },
  media: { etiqueta: 'Media', tone: 'warning', color: colors.warning, bg: colors.warningBg },
  info: { etiqueta: 'Info', tone: 'info', color: colors.info, bg: colors.infoBg },
};

/** Sugerido: cada tipo de alerta lleva a su pantalla relacionada. */
const DESTINOS = {
  droplet: 'Riego',
  thermometer: 'Historial',
  'wifi-off': 'PlantasDispositivos',
};

export default function AlertsScreen({ navigation }) {
  const { alertas, alertasActivas, marcarAlertasLeidas, mostrarToast } = useApp();

  const marcar = async () => {
    try {
      await marcarAlertasLeidas();
      mostrarToast('exito', 'Alertas marcadas como leídas.');
    } catch (error) {
      mostrarToast('error', error.message);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.pantalla}>
      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        {/* Encabezado con acción «Marcar leídas» */}
        <ScreenHeader
          title="Alertas"
          subtitle={`${alertas.length} ${plural(alertas.length, 'evento reciente', 'eventos recientes')}`}
          right={
            alertasActivas > 0 ? (
              <Pressable accessibilityRole="button" onPress={marcar} hitSlop={8}>
                <Text style={styles.marcar}>Marcar leídas</Text>
              </Pressable>
            ) : null
          }
        />

        {/* Lista de alertas */}
        <View style={styles.lista}>
          {alertas.map((alerta) => {
            const severidad = SEVERIDADES[alerta.severidad] ?? SEVERIDADES.info;
            const leida = alerta.leida;
            return (
              <Pressable
                key={alerta.id}
                accessibilityRole="button"
                onPress={() => {
                  // Sugerido: navega a la pantalla relacionada con la alerta.
                  const destino = DESTINOS[alerta.icono];
                  if (destino) navigation.navigate(destino);
                }}
                style={({ pressed }) => [pressed && styles.pulsado, leida && styles.leida]}
              >
                <Card
                  style={[
                    styles.tarjeta,
                    { borderLeftWidth: 4, borderLeftColor: severidad.color },
                  ]}
                >
                  <View style={styles.superior}>
                    <IconBox icon={alerta.icono} size={38} bg={severidad.bg} color={severidad.color} />
                    <Text style={styles.titulo} numberOfLines={1}>
                      {alerta.titulo}
                    </Text>
                    <StatusChip label={severidad.etiqueta} tone={severidad.tone} />
                  </View>
                  <Text style={styles.descripcion}>{alerta.descripcion}</Text>
                  <Text style={styles.hora}>{alerta.fechaEtiqueta}</Text>
                </Card>
              </Pressable>
            );
          })}
        </View>

        {/* Estado «Todo bajo control» cuando no hay alertas sin revisar */}
        {alertasActivas === 0 ? (
          <View style={styles.todo}>
            <View style={styles.todoIcono}>
              <Feather name="check" size={18} color={colors.success} />
            </View>
            <Text style={styles.todoTitulo}>Todo bajo control</Text>
            <Text style={styles.todoTexto}>No hay alertas sin revisar.</Text>
          </View>
        ) : null}
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
  marcar: {
    ...typography.captionBold,
    color: colors.primary,
  },
  lista: {
    gap: spacing.md,
  },
  pulsado: {
    opacity: 0.85,
  },
  leida: {
    opacity: 0.55, // Alertas leídas atenuadas (sugerido)
  },
  tarjeta: {
    gap: spacing.sm,
  },
  superior: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  titulo: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    flex: 1,
  },
  descripcion: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  hora: {
    ...typography.micro,
    color: colors.textTertiary,
  },
  todo: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
  },
  todoIcono: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  todoTitulo: {
    ...typography.section,
    color: colors.textPrimary,
  },
  todoTexto: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
