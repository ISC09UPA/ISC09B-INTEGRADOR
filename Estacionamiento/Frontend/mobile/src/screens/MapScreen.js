import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ParkingSlot from '../components/ParkingSlot';
import { Cargando, ErrorCarga } from '../components/EstadoCarga';
import { cajones, historial } from '../api';
import { useCarga } from '../hooks/useCarga';
import { hora, duracion } from '../utils/formato';
import { colors, radius } from '../theme';

// "En vivo": mientras no exista SignalR en el back, el mapa se recarga solo cada 10 s.
const RECARGA_MS = 10000;

/** showMyCar: solo el rol Usuario tiene "Tu auto está en el cajón N". */
export default function MapScreen({ name = 'Usuario', onSelectSlot, showMyCar = true }) {
  const mapa = useCarga(() => cajones.mapa(), [], { cadaMs: RECARGA_MS });
  // GET /api/historial/actual responde 204 (null) si el usuario no tiene auto dentro.
  const actual = useCarga(
    () => (showMyCar ? historial.actual() : Promise.resolve(null)),
    [showMyCar],
    { cadaMs: RECARGA_MS }
  );

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* Encabezado */}
      <View style={styles.header}>
        <View>
          <Text style={styles.hello}>Hola, {name}</Text>
          <Text style={styles.title}>Estacionamiento</Text>
        </View>
        <View style={styles.avatar}>
          <Ionicons name="person-outline" size={20} color={colors.green900} />
        </View>
      </View>

      {mapa.cargando && !mapa.datos ? (
        <Cargando />
      ) : mapa.error && !mapa.datos ? (
        <ErrorCarga mensaje={mapa.error} onReintentar={mapa.recargar} />
      ) : (
        <Mapa datos={mapa.datos} onSelectSlot={onSelectSlot} />
      )}

      {/* Tu auto (solo rol usuario y si está dentro) */}
      {showMyCar && actual.datos && <MiAuto acceso={actual.datos} onPress={onSelectSlot} />}
    </ScrollView>
  );
}

/** datos: MapaCajonesDto { libres, total, plumaAbierta, cajones: [{ numero, estado, esMio }] } */
function Mapa({ datos, onSelectSlot }) {
  return (
    <>
      {/* Lugares libres */}
      <View style={styles.freeCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.freeLabel}>Lugares libres ahora</Text>
          <View style={styles.live}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>En vivo</Text>
          </View>
        </View>
        <Text style={styles.freeNumber}>
          {datos.libres} <Text style={styles.freeOf}>de {datos.total} cajones</Text>
        </Text>
        <View style={styles.bars}>
          {datos.cajones.map((c) => (
            <View key={c.numero} style={[styles.bar, c.estado === 'Libre' && styles.barFree]} />
          ))}
        </View>
      </View>

      {/* Mapa */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Mapa de cajones</Text>
          <Text style={styles.hint}>Toca un cajón</Text>
        </View>

        <View style={styles.slots}>
          {datos.cajones.map((c) => (
            <ParkingSlot key={c.numero} cajon={c} onPress={onSelectSlot} />
          ))}
        </View>

        <View style={styles.lane}>
          <Text style={styles.laneText}>CARRIL ENTRADA / SALIDA</Text>
          <View style={styles.gate}>
            <Ionicons
              name={datos.plumaAbierta ? 'lock-open-outline' : 'remove-outline'}
              size={16}
              color={colors.red}
            />
            <Text style={styles.gateText}>
              {datos.plumaAbierta ? 'Pluma abierta' : 'Pluma cerrada'}
            </Text>
          </View>
        </View>

        <View style={styles.legend}>
          <LegendItem color={colors.surface} border={colors.green700} label="Libre" />
          <LegendItem color={colors.green900} border={colors.green900} label="Ocupado" />
          <LegendItem color={colors.green700} border={colors.green900} label="Tu auto" />
        </View>
      </View>
    </>
  );
}

/** acceso: AccesoActualDto { accesoId, cajon, placa, horaEntrada, minutosEstancia } */
function MiAuto({ acceso, onPress }) {
  const estacionado = acceso.cajon !== null;
  return (
    <Pressable
      style={styles.myCar}
      onPress={estacionado ? () => onPress?.(acceso.cajon) : undefined}
    >
      <View style={styles.myCarIcon}>
        <Ionicons name="time-outline" size={18} color={colors.green900} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.myCarTitle}>
          {estacionado
            ? `Tu auto está en el cajón ${acceso.cajon}`
            : 'Tu auto entró y aún no se estaciona'}
        </Text>
        <Text style={styles.myCarSub}>
          Entraste a las {hora(acceso.horaEntrada)} · {duracion(acceso.minutosEstancia)}
        </Text>
      </View>
      {estacionado && <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />}
    </Pressable>
  );
}

function LegendItem({ color, border, label }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendBox, { backgroundColor: color, borderColor: border }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 60, gap: 16 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hello: { fontSize: 13, color: colors.inkSoft },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.green700,
    alignItems: 'center',
    justifyContent: 'center',
  },

  freeCard: {
    backgroundColor: colors.green900,
    borderRadius: radius.lg,
    padding: 18,
    gap: 6,
  },
  freeLabel: { fontSize: 12, color: colors.green100 },
  live: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green700 },
  liveText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  freeNumber: { fontSize: 40, fontWeight: '800', color: colors.green700 },
  freeOf: { fontSize: 14, fontWeight: '600', color: '#fff' },
  bars: { flexDirection: 'row', gap: 6, marginTop: 4 },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)' },
  barFree: { backgroundColor: colors.green700 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
  hint: { fontSize: 11, color: colors.inkSoft },
  slots: { flexDirection: 'row', gap: 10 },

  lane: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.green50,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  laneText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, color: colors.inkSoft },
  gate: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  gateText: { fontSize: 11, fontWeight: '700', color: colors.red },

  legend: { flexDirection: 'row', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendBox: { width: 12, height: 12, borderRadius: 3, borderWidth: 2 },
  legendText: { fontSize: 11, color: colors.inkSoft },

  myCar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  myCarIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.green700,
    alignItems: 'center',
    justifyContent: 'center',
  },
  myCarTitle: { fontSize: 14, fontWeight: '700', color: colors.ink },
  myCarSub: { fontSize: 12, color: colors.inkSoft, marginTop: 2 },
});
