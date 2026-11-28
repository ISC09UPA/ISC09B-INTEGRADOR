/**
 * Pantalla 12: Perfil y ajustes (dentro de Más).
 * Avatar con iniciales, datos del usuario, menú de ajustes, tarjeta del rol
 * de la cuenta, cierre de sesión con confirmación y versión de la app.
 */
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import {
  Card,
  ConfirmModal,
  MenuRow,
  ScreenHeader,
  SecondaryButton,
  StatusChip,
} from '../../components';
import { iniciales } from '../../utils/formatters';
import { colors, spacing, typography } from '../../theme';

export default function ProfileScreen({ navigation }) {
  const { sesion, perfil, cerrarSesion, mostrarToast } = useApp();

  const [confirmandoSalida, setConfirmandoSalida] = useState(false);
  const [cerrando, setCerrando] = useState(false);

  const usuario = sesion?.usuario;
  const rol = perfil?.rol ?? 'Administrador';

  const filas = [
    {
      clave: 'DatosPersonales',
      icono: 'user',
      titulo: 'Datos personales',
      subtitulo: 'Nombre, correo y contraseña',
    },
    {
      clave: 'Notificaciones',
      icono: 'bell',
      titulo: 'Notificaciones',
      subtitulo: 'Alertas y recordatorios',
    },
    {
      clave: 'Preferencias',
      icono: 'sliders',
      titulo: 'Preferencias',
      subtitulo: 'Unidades, idioma y tema',
    },
  ];

  /** Cierra la sesión (borra el almacén local y vuelve a Login). */
  const salir = async () => {
    setCerrando(true);
    try {
      await cerrarSesion();
      // RootNavigator detecta la sesión nula y muestra el Login.
    } catch (error) {
      mostrarToast('error', error.message);
      setConfirmandoSalida(false);
    } finally {
      setCerrando(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.pantalla}>
      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Perfil y ajustes" />

        {/* Avatar grande con halo y datos del usuario */}
        <View style={styles.perfil}>
          <View style={styles.halo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarTexto}>
                {usuario ? iniciales(usuario.nombreCompleto) : ''}
              </Text>
            </View>
          </View>
          <Text style={styles.nombre}>{usuario?.nombreCompleto}</Text>
          <Text style={styles.correo}>{usuario?.email}</Text>
          <StatusChip label="Administradora" tone="success" />
        </View>

        {/* Menú de ajustes */}
        <Card padded={false}>
          {filas.map((fila, indice) => (
            <View key={fila.clave}>
              <MenuRow
                icon={fila.icono}
                title={fila.titulo}
                subtitle={fila.subtitulo}
                onPress={() => navigation.navigate(fila.clave)}
                style={styles.filaMenu}
              />
              {indice < filas.length - 1 ? <View style={styles.divisor} /> : null}
            </View>
          ))}
        </Card>

        {/* Tarjeta informativa del rol */}
        <Card style={styles.rol}>
          <Text style={styles.rolEtiqueta}>Rol de la cuenta</Text>
          <Text style={styles.rolValor}>{rol}</Text>
          <Text style={styles.rolTexto}>{perfil?.rolDescripcion ?? 'Puede gestionar plantas, dispositivos y usuarios.'}</Text>
        </Card>

        {/* Cerrar sesión */}
        <SecondaryButton
          label="Cerrar sesión"
          icon="log-out"
          variant="danger"
          onPress={() => setConfirmandoSalida(true)}
        />

        {/* Versión de la app */}
        <Text style={styles.version}>Invernadero Inteligente · v1.0.0</Text>
      </ScrollView>

      {/* Confirmación de cierre de sesión */}
      <ConfirmModal
        visible={confirmandoSalida}
        title="¿Cerrar sesión?"
        message="Tendrás que iniciar sesión de nuevo para ver tu invernadero."
        confirmLabel="Cerrar sesión"
        cancelLabel="Cancelar"
        onConfirm={salir}
        onCancel={() => setConfirmandoSalida(false)}
        loading={cerrando}
        icon="log-out"
        iconBg={colors.dangerBg}
        iconColor={colors.danger}
      />
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
  perfil: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
  },
  halo: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTexto: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
  },
  nombre: {
    ...typography.title,
    color: colors.textPrimary,
  },
  correo: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  filaMenu: {
    paddingHorizontal: spacing.lg,
  },
  divisor: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    marginLeft: spacing.lg + 38 + spacing.md,
  },
  rol: {
    gap: spacing.xs,
  },
  rolEtiqueta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  rolValor: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  rolTexto: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  version: {
    ...typography.micro,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
