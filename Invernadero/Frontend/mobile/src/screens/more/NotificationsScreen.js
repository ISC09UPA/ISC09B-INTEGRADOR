/**
 * Notificaciones (dentro de Perfil): configura qué alertas se reciben
 * (por tipo) y los recordatorios. Pantalla simple sin mockup.
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { Card, PrimaryButton, ScreenHeader, Skeleton } from '../../components';
import { colors, radii, spacing, typography } from '../../theme';

const OPCIONES = [
  { clave: 'humedadBaja', titulo: 'Humedad baja', detalle: 'Avisa cuando el suelo baje del umbral.' },
  { clave: 'temperaturaAlta', titulo: 'Temperatura alta', detalle: 'Avisa cuando haga demasiado calor.' },
  { clave: 'desconexion', titulo: 'Dispositivo sin conexión', detalle: 'Avisa cuando la Raspberry Pi pierda conexión.' },
  { clave: 'recordatorios', titulo: 'Recordatorios de riego', detalle: 'Recuerda revisar la humedad cada día.' },
];

export default function NotificationsScreen({ navigation }) {
  const { notificaciones, actualizarNotificaciones, mostrarToast } = useApp();

  // Copia local de la configuración (se sincroniza al llegar del contexto).
  const [config, setConfig] = useState(notificaciones);
  const [guardando, setGuardando] = useState(false);

  if (!config) {
    // El contexto aún no trae la configuración: skeleton.
    return (
      <SafeAreaView edges={['top']} style={styles.pantalla}>
        <View style={styles.contenido}>
          <ScreenHeader
            title="Notificaciones"
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
          <Card>
            <Skeleton width="80%" height={16} />
            <Skeleton width="100%" height={40} style={styles.skeleton} />
            <Skeleton width="100%" height={40} style={styles.skeleton} />
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  const alternar = (clave) => setConfig((prev) => ({ ...prev, [clave]: !prev[clave] }));

  const guardar = async () => {
    setGuardando(true);
    try {
      await actualizarNotificaciones(config);
      mostrarToast('exito', 'Notificaciones actualizadas.');
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
          title="Notificaciones"
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

        <Card padded={false}>
          {OPCIONES.map((opcion, indice) => (
            <View key={opcion.clave}>
              <View style={styles.fila}>
                <View style={styles.filaTextos}>
                  <Text style={styles.filaTitulo}>{opcion.titulo}</Text>
                  <Text style={styles.filaDetalle}>{opcion.detalle}</Text>
                </View>
                <Switch
                  accessibilityLabel={opcion.titulo}
                  value={config[opcion.clave]}
                  onValueChange={() => alternar(opcion.clave)}
                  trackColor={{ false: colors.surfaceMuted, true: colors.primary }}
                  thumbColor={colors.white}
                />
              </View>
              {indice < OPCIONES.length - 1 ? <View style={styles.divisor} /> : null}
            </View>
          ))}
        </Card>

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
  skeleton: {
    marginTop: spacing.lg,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  filaTextos: {
    flex: 1,
    gap: 2,
  },
  filaTitulo: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  filaDetalle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  divisor: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    marginLeft: spacing.lg,
  },
});
