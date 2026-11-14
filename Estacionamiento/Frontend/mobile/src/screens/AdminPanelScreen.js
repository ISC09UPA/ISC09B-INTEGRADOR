import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Cargando, ErrorCarga } from '../components/EstadoCarga';
import { estadisticas, alertas } from '../api';
import { useCarga } from '../hooks/useCarga';
import { hora, duracion, cajonCorto, TITULOS_ALERTA } from '../utils/formato';
import { colors, radius } from '../theme';

const CHART_HEIGHT = 100;

// El back manda las 24 horas; la gráfica muestra el horario de uso de la maqueta.
const PRIMERA_HORA = 7;
const ULTIMA_HORA = 21;

const RECARGA_MS = 30000;

/** onSeeAlert: abre la lista de alertas. */
export default function AdminPanelScreen({ onLogout, onSeeAlert }) {
  const panel = useCarga(() => estadisticas.panel(), [], { cadaMs: RECARGA_MS });
  const horas = useCarga(() => estadisticas.ocupacionPorHora(), [], { cadaMs: RECARGA_MS });
  const uso = useCarga(() => estadisticas.usoPorCajon(), []);
  const pendientes = useCarga(() => alertas.listar(true), [], { cadaMs: RECARGA_MS });

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* Encabezado */}
      <View style={styles.header}>
        <View>
          <Text style={styles.role}>ADMINISTRADOR</Text>
          <Text style={styles.title}>Panel</Text>
        </View>
        <View style={styles.headerActions}>
          <View style={styles.rangeBtn}>
            <Text style={styles.rangeText}>Hoy</Text>
            <Ionicons name="caret-down" size={12} color={colors.ink} />
          </View>
          <Pressable style={styles.iconBtn} onPress={onLogout}>
            <Ionicons name="log-out-outline" size={18} color={colors.red} />
          </Pressable>
        </View>
      </View>

      {/* Alertas pendientes */}
      <TarjetaAlertas lista={pendientes.datos} onVer={onSeeAlert} />

      {/* Tarjetas: PanelDto */}
      {panel.cargando && !panel.datos ? (
        <Cargando />
      ) : panel.error && !panel.datos ? (
        <ErrorCarga mensaje={panel.error} onReintentar={panel.recargar} />
      ) : (
        <>
          <View style={styles.grid}>
            <StatCard
              accent
              label="Ocupación ahora"
              value={`${panel.datos.ocupados} / ${panel.datos.total}`}
            />
            <StatCard
              label="Entradas hoy"
              value={panel.datos.entradasHoy}
              sub={
                panel.datos.entradasNegadasHoy > 0
                  ? `${panel.datos.entradasNegadasHoy} negadas`
                  : null
              }
            />
          </View>
          <View style={styles.grid}>
            <StatCard
              label="Estancia promedio"
              value={panel.datos.minutosPromedio ? duracion(panel.datos.minutosPromedio) : '—'}
            />
            <StatCard label="Cajón más usado" value={cajonCorto(panel.datos.cajonMasUsado)} />
          </View>
        </>
      )}

      {/* Ocupación por hora: [{ hora, cajonesOcupados, entradas }] */}
      {horas.datos && <GraficaHoras datos={horas.datos} />}

      {/* Uso por cajón: [{ cajon, usos }] */}
      {uso.datos && <UsoPorCajon datos={uso.datos} />}
    </ScrollView>
  );
}

function GraficaHoras({ datos }) {
  const visibles = datos.filter((h) => h.hora >= PRIMERA_HORA && h.hora <= ULTIMA_HORA);
  const maximo = Math.max(1, ...visibles.map((h) => h.cajonesOcupados));

  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.cardTitle}>Ocupación por hora</Text>
        <Text style={styles.source}>Cajones ocupados · hoy</Text>
      </View>
      <View style={styles.chart}>
        {visibles.map((h) => {
          const pico = h.cajonesOcupados === maximo && maximo > 0;
          return (
            <View key={h.hora} style={styles.barCol}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    { height: (h.cajonesOcupados / maximo) * CHART_HEIGHT },
                    pico && styles.barPeak,
                  ]}
                />
              </View>
              <Text style={styles.barLabel}>{h.hora}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function UsoPorCajon({ datos }) {
  const maximo = Math.max(1, ...datos.map((s) => s.usos));
  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.cardTitle}>Uso por cajón</Text>
        <Text style={styles.source}>Este mes</Text>
      </View>
      {datos.map((s) => (
        <View key={s.cajon} style={styles.usageRow}>
          <Text style={styles.usageSlot}>C{s.cajon}</Text>
          <View style={styles.usageTrack}>
            <View style={[styles.usageFill, { width: `${(s.usos / maximo) * 100}%` }]} />
          </View>
          <Text style={styles.usageCount}>{s.usos} {s.usos === 1 ? 'uso' : 'usos'}</Text>
        </View>
      ))}
    </View>
  );
}

/** lista: alertas pendientes (AlertaDto[]), de la más reciente a la más antigua. */
function TarjetaAlertas({ lista, onVer }) {
  if (!lista) return null;

  if (lista.length === 0) {
    return (
      <Pressable style={[styles.alert, styles.alertOk]} onPress={onVer}>
        <Ionicons name="checkmark-circle-outline" size={20} color={colors.green900} />
        <Text style={[styles.alertTitle, { flex: 1, color: colors.ink }]}>Sin alertas pendientes</Text>
        <Text style={styles.alertLink}>Historial</Text>
      </Pressable>
    );
  }

  const ultima = lista[0];
  return (
    <Pressable style={styles.alert} onPress={onVer}>
      <Ionicons name="warning-outline" size={20} color="#8A5A00" />
      <View style={{ flex: 1 }}>
        <Text style={styles.alertTitle}>
          {TITULOS_ALERTA[ultima.tipo] ?? ultima.tipo} · {hora(ultima.fecha)}
        </Text>
        <Text style={styles.alertText}>
          {lista.length === 1 ? ultima.mensaje : `${lista.length} alertas pendientes`}
        </Text>
      </View>
      <Text style={styles.alertLink}>Ver</Text>
    </Pressable>
  );
}

function StatCard({ label, value, sub, accent }) {
  return (
    <View style={[styles.stat, accent && styles.statAccent]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 60, gap: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  role: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: colors.red },
  title: { fontSize: 26, fontWeight: '800', color: colors.ink },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  rangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rangeText: { fontSize: 13, fontWeight: '700', color: colors.ink },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  grid: { flexDirection: 'row', gap: 12 },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 6,
  },
  statAccent: { backgroundColor: colors.green700, borderColor: colors.green700 },
  statLabel: { fontSize: 12, fontWeight: '600', color: colors.green900 },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.green900 },
  statSub: { fontSize: 11, fontWeight: '700', color: colors.red },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
  source: { fontSize: 11, fontWeight: '600', color: colors.inkSoft },

  chart: { flexDirection: 'row', gap: 4, alignItems: 'flex-end' },
  barCol: { flex: 1, alignItems: 'center', gap: 6 },
  barTrack: { height: CHART_HEIGHT, width: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 4, backgroundColor: colors.green300 },
  barPeak: { backgroundColor: colors.green900 },
  barLabel: { fontSize: 9, color: colors.inkSoft },

  usageRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  usageSlot: { width: 24, fontSize: 13, fontWeight: '800', color: colors.ink },
  usageTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.green50,
    overflow: 'hidden',
  },
  usageFill: { height: '100%', borderRadius: 4, backgroundColor: colors.green900 },
  usageCount: { width: 56, textAlign: 'right', fontSize: 12, color: colors.inkSoft },

  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF4D6',
    borderWidth: 1,
    borderColor: colors.green300,
    borderRadius: radius.lg,
    padding: 14,
  },
  alertOk: { backgroundColor: colors.surface, borderColor: colors.border },
  alertTitle: { fontSize: 14, fontWeight: '800', color: '#5C3D00' },
  alertText: { fontSize: 13, color: '#5C3D00', marginTop: 2 },
  alertLink: { fontSize: 14, fontWeight: '800', color: colors.ink },
});
