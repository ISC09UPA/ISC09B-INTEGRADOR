import { View, Text, ScrollView, Pressable, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { varianteCajon } from '../components/ParkingSlot';
import { Cargando, ErrorCarga } from '../components/EstadoCarga';
import { cajones } from '../api';
import { useCarga } from '../hooks/useCarga';
import { hora, duracion, fechaLarga, etiquetaTipo } from '../utils/formato';
import { colors, radius } from '../theme';

const BADGES = {
  mio: { text: 'Ocupado · Tu auto', box: { backgroundColor: colors.green700 }, color: colors.green900 },
  ocupado: { text: 'Ocupado', box: { backgroundColor: colors.green900 }, color: '#fff' },
  libre: {
    text: 'Libre',
    box: { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.green700 },
    color: colors.green900,
  },
};

/** numero: número del cajón. El back decide qué datos del vehículo se pueden ver. */
export default function SlotDetailScreen({ numero, onBack }) {
  const { datos, cargando, error, recargar } = useCarga(() => cajones.detalle(numero), [numero]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* Encabezado */}
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={onBack}>
          <Ionicons name="chevron-back" size={20} color={colors.green900} />
        </Pressable>
        <Text style={styles.title}>Cajón {numero}</Text>
        {datos && <Badge cajon={datos} />}
      </View>

      {cargando && !datos ? (
        <Cargando />
      ) : error && !datos ? (
        <ErrorCarga mensaje={error} onReintentar={recargar} />
      ) : (
        <Contenido cajon={datos} />
      )}
    </ScrollView>
  );
}

function Badge({ cajon }) {
  const badge = BADGES[varianteCajon(cajon)];
  return (
    <View style={[styles.badge, badge.box]}>
      <Text style={[styles.badgeText, { color: badge.color }]}>{badge.text}</Text>
    </View>
  );
}

/** cajon: DetalleCajonDto { numero, estado, esMio, vehiculo } */
function Contenido({ cajon }) {
  // El back solo manda "vehiculo" si es el auto del usuario o si quien consulta es administrador.
  if (cajon.vehiculo) return <DetalleVehiculo vehiculo={cajon.vehiculo} esMio={cajon.esMio} />;

  if (cajon.estado === 'Ocupado') {
    return (
      <EmptyState
        icon="car-sport"
        title="Cajón ocupado"
        text="Este cajón lo está usando otro vehículo."
      />
    );
  }

  return (
    <EmptyState
      icon="checkmark-circle-outline"
      title="Cajón libre"
      text="Puedes estacionarte aquí. Tu entrada se registra sola cuando la cámara lea tu placa en la pluma."
    />
  );
}

/** vehiculo: VehiculoEnCajonDto { placa, tipo, fotoUrl, horaEntrada, horaSalida, minutosEstancia } */
function DetalleVehiculo({ vehiculo, esMio }) {
  const placa = vehiculo.placa ?? 'No legible';
  return (
    <>
      {/* Foto de entrada (Blob Storage) */}
      <View style={styles.photo}>
        {vehiculo.fotoUrl ? (
          <Image source={{ uri: vehiculo.fotoUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={styles.photoCenter}>
            <Ionicons name="camera-outline" size={32} color="#ddd" />
            <Text style={styles.photoText}>Sin foto de entrada</Text>
          </View>
        )}
        <View style={styles.photoFooter}>
          <View style={styles.plateChip}>
            <Text style={styles.plateText}>{placa}</Text>
          </View>
        </View>
      </View>

      {/* Hora y tiempo */}
      <View style={styles.statsRow}>
        <View style={[styles.stat, styles.statLight]}>
          <Text style={styles.statLabel}>Hora de entrada</Text>
          <Text style={styles.statValue}>{hora(vehiculo.horaEntrada)}</Text>
        </View>
        <View style={[styles.stat, styles.statAccent]}>
          <Text style={styles.statLabel}>Tiempo de estancia</Text>
          <Text style={styles.statValue}>{duracion(vehiculo.minutosEstancia)}</Text>
        </View>
      </View>

      {/* Datos */}
      <View style={styles.infoCard}>
        <InfoRow label="Placa" value={placa} />
        <InfoRow label="Vehículo" value={etiquetaTipo(vehiculo.tipo)} />
        <InfoRow label="Día" value={fechaLarga(vehiculo.horaEntrada)} />
        <InfoRow
          label="Hora de salida"
          value={vehiculo.horaSalida ? hora(vehiculo.horaSalida) : 'Pendiente'}
          muted={!vehiculo.horaSalida}
          last
        />
      </View>

      {/* Aviso */}
      <View style={styles.note}>
        <Ionicons name="information-circle-outline" size={20} color={colors.inkSoft} />
        <Text style={styles.noteText}>
          {esMio
            ? 'Tu salida se registra sola cuando la cámara lea tu placa en la pluma.'
            : 'La salida se registra sola cuando la cámara lea la placa en la pluma.'}
        </Text>
      </View>
    </>
  );
}

function InfoRow({ label, value, muted, last }) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, muted && styles.infoValueMuted]}>{value}</Text>
    </View>
  );
}

function EmptyState({ icon, title, text }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={44} color={colors.green900} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 60, gap: 16 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, fontSize: 22, fontWeight: '800', color: colors.ink },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '800' },

  photo: {
    height: 190,
    borderRadius: radius.xl - 8,
    backgroundColor: '#242424',
    padding: 14,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  photoCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  photoText: { fontSize: 12, color: '#ddd' },
  photoFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  plateChip: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  plateText: { fontSize: 12, fontWeight: '800', letterSpacing: 1, color: colors.ink },

  statsRow: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, borderRadius: radius.lg, padding: 14, gap: 6, borderWidth: 1 },
  statLight: { backgroundColor: colors.surface, borderColor: colors.border },
  statAccent: { backgroundColor: colors.green700, borderColor: colors.green700 },
  statLabel: { fontSize: 12, fontWeight: '600', color: colors.green900 },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.green900 },

  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.green50 },
  infoLabel: { fontSize: 14, color: colors.inkSoft },
  infoValue: { fontSize: 14, fontWeight: '800', color: colors.ink },
  infoValueMuted: { color: colors.red },

  note: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: colors.green50,
    borderRadius: radius.md,
    padding: 14,
  },
  noteText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.inkSoft },

  empty: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 28,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.ink },
  emptyText: { fontSize: 13, lineHeight: 19, textAlign: 'center', color: colors.inkSoft },
});
