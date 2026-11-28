/**
 * Pantalla 1: Inicio (pestaña «Inicio»).
 * Saludo según la hora + avatar, banner de modo sin conexión, tarjeta hero
 * del estado de la planta, cuadrícula 2×2 de lecturas actuales, tarjeta de
 * alerta activa, botón «Regar ahora» y estado de la Raspberry Pi con la
 * última sincronización. Pull-to-refresh para forzar la sincronización.
 */
import React, { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import {
  EmptyState,
  IconBox,
  OfflineBanner,
  PrimaryButton,
  SectionHeader,
  SensorCard,
  Skeleton,
} from '../../components';
import { colors, radii, shadows, spacing, typography } from '../../theme';
import {
  haceMinutos,
  horaCorta,
  iniciales,
  luxCompacto,
  saludoPorHora,
} from '../../utils/formatters';
import { estadoPlanta, textosHero } from '../../utils/plantStatus';

export default function HomeScreen({ navigation }) {
  const {
    sesion,
    plantaActiva,
    lecturas,
    lecturasCargando,
    lecturasError,
    alertasActivas,
    modoSinConexion,
    conectividad,
    sincronizar,
  } = useApp();

  const [refrescando, setRefrescando] = useState(false);
  // «Ahora» se recalcula cada minuto para mantener «Hace X min» actualizado.
  const [ahora, setAhora] = useState(null);

  useEffect(() => {
    const actualizar = () => setAhora(Date.now());
    actualizar();
    const intervalo = setInterval(actualizar, 60000);
    return () => clearInterval(intervalo);
  }, []);

  const usuario = sesion?.usuario;
  const estado = lecturas ? estadoPlanta(lecturas) : null;
  const textos = estado && plantaActiva ? textosHero(estado.estado, plantaActiva.nombre) : null;

  // Minutos transcurridos desde la última lectura («Hace 2 min»).
  const minutosDesdeLectura =
    lecturas && ahora ? Math.max(0, Math.round((ahora - lecturas.actualizadoEn) / 60000)) : 0;

  /** Pull-to-refresh: fuerza la sincronización con la Raspberry Pi. */
  const refrescar = async () => {
    setRefrescando(true);
    try {
      await sincronizar();
    } finally {
      setRefrescando(false);
    }
  };

  // Navegaciones descritas en el documento.
  const irAPerfil = () => navigation.navigate('Más', { screen: 'Perfil' });
  const irAPlanta = () => navigation.navigate('Planta');
  const irARiego = () => navigation.navigate('Riego');
  const irAAlertas = () => navigation.navigate('Más', { screen: 'Alertas' });
  // Sugerido: tocar una tarjeta lleva al Historial de ese sensor.
  const irAHistorialSensor = (sensor) => navigation.navigate('Historial', { sensor });

  const tarjetasSensores = [
    {
      clave: 'suelo',
      icon: 'droplet',
      iconBg: colors.soilBg,
      iconColor: colors.soil,
      label: 'Suelo',
    },
    {
      clave: 'temperatura',
      icon: 'thermometer',
      iconBg: colors.temperatureBg,
      iconColor: colors.temperature,
      label: 'Temperatura',
    },
    {
      clave: 'ambiente',
      icon: 'water-outline',
      familia: 'Ionicons',
      iconBg: colors.ambientBg,
      iconColor: colors.ambient,
      label: 'Ambiente',
    },
    {
      clave: 'luminosidad',
      icon: 'sun',
      iconBg: colors.lightBg,
      iconColor: colors.light,
      label: 'Luminosidad',
      esLux: true,
    },
  ];

  return (
    <SafeAreaView edges={['top']} style={styles.pantalla}>
      <ScrollView
        contentContainerStyle={styles.contenido}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={refrescar}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Encabezado: saludo + avatar con iniciales */}
        <View style={styles.encabezado}>
          <View style={styles.saludo}>
            <Text style={styles.saludoTexto}>{saludoPorHora()}</Text>
            <Text style={styles.nombre}>{usuario?.nombre}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir perfil y ajustes"
            onPress={irAPerfil}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarTexto}>
                {usuario ? iniciales(usuario.nombreCompleto) : ''}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Banner de modo sin conexión (solo sin internet) */}
        <OfflineBanner visible={modoSinConexion} style={styles.bannerOffline} />

        {/* Tarjeta hero del estado de la planta */}
        <View style={styles.hero}>
          {/* Decoración: círculo semitransparente en la esquina inferior derecha */}
          <View style={styles.heroDecoracion} />

          <View style={styles.heroSuperior}>
            <IconBox
              icon="leaf"
              familia="Ionicons"
              size={44}
              iconSize={20}
              bg={colors.primaryLight}
              color={colors.primaryDark}
            />
            {estado ? (
              <View style={styles.heroChip}>
                <View style={styles.heroChipPunto} />
                <Text style={styles.heroChipTexto}>{estado.etiqueta}</Text>
              </View>
            ) : null}
          </View>

          {textos ? (
            <>
              <Text style={styles.heroTitulo}>{textos.titulo}</Text>
              <Text style={styles.heroSubtitulo}>{textos.subtitulo}</Text>
            </>
          ) : (
            // Skeletons mientras llegan las lecturas
            <>
              <Skeleton height={22} width="85%" radius={6} style={styles.heroSkeleton} />
              <Skeleton height={14} width="60%" radius={6} style={styles.heroSkeleton} />
            </>
          )}

          <Pressable accessibilityRole="button" onPress={irAPlanta} style={styles.heroEnlace} hitSlop={8}>
            <Text style={styles.heroEnlaceTexto}>Ver estado completo ›</Text>
          </Pressable>
        </View>

        {/* Sección «Lecturas actuales» */}
        <SectionHeader
          title="Lecturas actuales"
          right={
            <Text style={styles.tiempoLectura}>
              {lecturas ? haceMinutos(minutosDesdeLectura) : '—'}
            </Text>
          }
          style={styles.seccion}
        />

        {lecturasCargando && !lecturas ? (
          // Estado cargando: skeletons de las tarjetas
          <View style={styles.cuadricula}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={styles.celda}>
                <Skeleton width="100%" height={104} radius={radii.lg} />
              </View>
            ))}
          </View>
        ) : lecturas ? (
          <View style={styles.cuadricula}>
            {tarjetasSensores.map((tarjeta) => {
              const lectura = lecturas[tarjeta.clave];
              return (
                <SensorCard
                  key={tarjeta.clave}
                  icon={tarjeta.icon}
                  familia={tarjeta.familia}
                  iconBg={tarjeta.iconBg}
                  iconColor={tarjeta.iconColor}
                  label={tarjeta.label}
                  valor={tarjeta.esLux ? luxCompacto(lectura.valor) : lectura.valor}
                  unidad={tarjeta.esLux ? 'k lux' : lectura.unidad}
                  onPress={() => irAHistorialSensor(tarjeta.clave)}
                  style={styles.celda}
                />
              );
            })}
          </View>
        ) : (
          // Estado de error: sin lecturas disponibles
          <EmptyState
            icon="wifi-off"
            title="No se pudieron cargar las lecturas"
            description={lecturasError}
            actionLabel="Reintentar"
            onAction={refrescar}
          />
        )}

        {/* Tarjeta de alerta activa (o «Todo bajo control») */}
        {alertasActivas > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={irAAlertas}
            style={({ pressed }) => [styles.alerta, pressed && styles.pulsado]}
          >
            <IconBox icon="bell" size={38} bg="rgba(239, 217, 106, 0.45)" color={colors.warning} />
            <View style={styles.alertaTextos}>
              <Text style={styles.alertaTitulo}>
                {alertasActivas === 1 ? '1 alerta activa' : `${alertasActivas} alertas activas`}
              </Text>
              <Text style={styles.alertaDetalle}>Humedad prevista bajo el umbral en 2 h</Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.warning} />
          </Pressable>
        ) : (
          <View style={styles.todoBajoControl}>
            <IconBox icon="check" size={38} bg={colors.successBg} color={colors.success} />
            <View style={styles.alertaTextos}>
              <Text style={styles.alertaTitulo}>Todo bajo control</Text>
              <Text style={styles.alertaDetalle}>Sin alertas activas en este momento.</Text>
            </View>
          </View>
        )}

        {/* Acceso directo al riego manual */}
        <PrimaryButton icon="droplet" label="Regar ahora" onPress={irARiego} style={styles.regar} />

        {/* Estado del dispositivo y última sincronización */}
        <View style={styles.pie}>
          <View style={styles.pieEstado}>
            <View
              style={[
                styles.punto,
                {
                  backgroundColor: conectividad.raspberryEnLinea
                    ? colors.onlineDot
                    : colors.offlineDot,
                },
              ]}
            />
            <Text style={styles.pieTexto}>
              Raspberry Pi · {conectividad.raspberryEnLinea ? 'En línea' : 'Sin conexión'}
            </Text>
          </View>
          <Text style={styles.pieTexto}>
            {conectividad.ultimaSincronizacion
              ? `Sincronizado hoy, ${horaCorta(conectividad.ultimaSincronizacion)}`
              : 'Sin sincronizar'}
          </Text>
        </View>
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
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  saludo: {
    gap: 2,
  },
  saludoTexto: {
    ...typography.body,
    color: colors.textSecondary,
  },
  nombre: {
    ...typography.title,
    color: colors.textPrimary,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTexto: {
    ...typography.captionBold,
    color: colors.white,
  },
  bannerOffline: {
    marginTop: -spacing.xs,
  },
  hero: {
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.sm,
    overflow: 'hidden',
    ...shadows.card,
  },
  heroDecoracion: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    right: -36,
    bottom: -40,
  },
  heroSuperior: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.xs,
  },
  heroChipPunto: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.white,
  },
  heroChipTexto: {
    ...typography.micro,
    fontWeight: '700',
    color: colors.white,
  },
  heroTitulo: {
    ...typography.hero,
    color: colors.white,
  },
  heroSubtitulo: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  heroEnlace: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  heroEnlaceTexto: {
    ...typography.captionBold,
    color: colors.white,
  },
  heroSkeleton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  seccion: {
    marginTop: spacing.sm,
  },
  tiempoLectura: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  cuadricula: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  celda: {
    flexBasis: '47%',
    flexGrow: 1,
  },
  alerta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.warningBg,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  todoBajoControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
  pulsado: {
    opacity: 0.8,
  },
  alertaTextos: {
    flex: 1,
    gap: 2,
  },
  alertaTitulo: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  alertaDetalle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  regar: {
    marginTop: spacing.sm,
  },
  pie: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: -spacing.xs,
  },
  pieEstado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  punto: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pieTexto: {
    ...typography.micro,
    color: colors.textSecondary,
  },
});
