
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import {
  Card,
  IconBox,
  MenuRow,
  OfflineBanner,
  ScreenHeader,
  SecondaryButton,
} from '../../components';
import { plural } from '../../utils/formatters';
import { colors, spacing, typography } from '../../theme';

export default function MoreScreen({ navigation }) {
  const {
    alertasActivas,
    galeria,
    plantas,
    eventosRiego,
    perfil,
    modoSinConexion,
  } = useApp();

  const fotos = galeria.fotos.length;
  const plantasEnLinea = plantas.filter((p) => p.enLinea).length;
  const eventosDelMes = eventosRiego.length;

  // Filas del menú con subtítulos dinámicos.
  const filas = [
    {
      clave: 'Alertas',
      icono: 'bell',
      titulo: 'Alertas',
      subtitulo:
        alertasActivas > 0
          ? `${alertasActivas} ${plural(alertasActivas, 'alerta activa', 'alertas activas')}`
          : 'Sin alertas pendientes',
    },
    {
      clave: 'Galeria',
      icono: 'image',
      titulo: 'Galería',
      subtitulo: `${fotos} ${plural(fotos, 'imagen', 'imágenes')}`,
    },
    {
      clave: 'PlantasDispositivos',
      icono: 'grid',
      titulo: 'Plantas y dispositivos',
      subtitulo: `${plantas.length} ${plural(plantas.length, 'planta', 'plantas')} · ${plantasEnLinea} ${plural(plantasEnLinea, 'en línea', 'en línea')}`,
    },
    {
      clave: 'HistorialRiego',
      icono: 'bar-chart-2',
      titulo: 'Historial de riego',
      subtitulo: `${eventosDelMes} ${plural(eventosDelMes, 'evento este mes', 'eventos este mes')}`,
    },
    {
      clave: 'Perfil',
      icono: 'user',
      titulo: 'Perfil y ajustes',
      subtitulo: perfil?.rol ?? 'Administrador',
    },
  ];

  return (
    <SafeAreaView edges={['top']} style={styles.pantalla}>
      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Más" subtitle="Gestión del invernadero" />

        {/* Banner de modo sin conexión (mismo componente que en Inicio) */}
        <OfflineBanner visible={modoSinConexion} />

        {/* Menú de secciones */}
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

        {/* Bloque de ayuda */}
        <Card style={styles.ayuda}>
          <IconBox icon="smartphone" size={44} iconSize={20} />
          <Text style={styles.ayudaTitulo}>¿Necesitas ayuda?</Text>
          <Text style={styles.ayudaTexto}>
            Consulta la guía de conexión y diagnóstico de tu Raspberry Pi.
          </Text>
          <SecondaryButton
            label="Ver guía de soporte"
            onPress={() => navigation.navigate('GuiaSoporte')}
            style={styles.ayudaBoton}
          />
        </Card>
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
  filaMenu: {
    paddingHorizontal: spacing.lg,
  },
  divisor: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    marginLeft: spacing.lg + 38 + spacing.md,
  },
  ayuda: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
  },
  ayudaTitulo: {
    ...typography.section,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  ayudaTexto: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  ayudaBoton: {
    marginTop: spacing.lg,
  },
});
