import { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Cargando, ErrorCarga } from '../components/EstadoCarga';
import { historial } from '../api';
import { useCarga } from '../hooks/useCarga';
import { hora, duracion, diaYSemana, horasMinutos, mesCorto, cajonCorto } from '../utils/formato';
import { colors, radius } from '../theme';

// Los ids son los valores de PeriodoHistorial del back (últimos 7 días, últimos 30 días, todo).
const FILTERS = [
  { id: 'Semana', label: 'Esta semana' },
  { id: 'Mes', label: 'Este mes' },
  { id: 'Todo', label: 'Todo' },
];

export default function HistoryScreen() {
  const [filter, setFilter] = useState('Semana');
  const resumen = useCarga(() => historial.resumen(), []);
  const lista = useCarga(() => historial.listar(filter), [filter]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Mi historial</Text>

      {/* Resumen del mes: ResumenMesDto { mes, visitas, minutosPromedio, cajonFrecuente } */}
      {resumen.datos && (
        <View style={styles.statsRow}>
          <View style={[styles.stat, styles.statAccent]}>
            <Text style={styles.statValue}>{resumen.datos.visitas}</Text>
            <Text style={styles.statLabel}>visitas en {mesCorto(resumen.datos.mes)}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{horasMinutos(resumen.datos.minutosPromedio)}</Text>
            <Text style={styles.statLabel}>h promedio</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{cajonCorto(resumen.datos.cajonFrecuente)}</Text>
            <Text style={styles.statLabel}>cajón frecuente</Text>
          </View>
        </View>
      )}

      {/* Filtros */}
      <View style={styles.filters}>
        {FILTERS.map((f) => {
          const active = f.id === filter;
          return (
            <Pressable
              key={f.id}
              onPress={() => setFilter(f.id)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Lista */}
      {lista.cargando ? (
        <Cargando />
      ) : lista.error ? (
        <ErrorCarga mensaje={lista.error} onReintentar={lista.recargar} />
      ) : lista.datos.length === 0 ? (
        <Text style={styles.empty}>No tienes entradas en este periodo.</Text>
      ) : (
        <View style={styles.list}>
          {lista.datos.map((h, i) => (
            <HistoryRow key={h.accesoId} item={h} last={i === lista.datos.length - 1} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

/** item: HistorialItemDto { accesoId, horaEntrada, horaSalida, cajon, placa, minutosEstancia, enCurso } */
function HistoryRow({ item, last }) {
  const { dia, diaSemana } = diaYSemana(item.horaEntrada);
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={[styles.date, item.enCurso && styles.dateActive]}>
        <Text style={styles.dateDay}>{dia}</Text>
        <Text style={styles.dateDow}>{diaSemana}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.time}>
          {hora(item.horaEntrada)} → {item.enCurso ? 'en curso' : hora(item.horaSalida)}
        </Text>
        <Text style={styles.meta}>
          {item.cajon ? `Cajón ${item.cajon}` : 'Sin cajón'} · {item.placa ?? 'Placa no legible'}
        </Text>
      </View>

      {item.enCurso ? (
        <View style={styles.livePill}>
          <Text style={styles.liveText}>En curso</Text>
        </View>
      ) : (
        <Text style={styles.duration}>{duracion(item.minutosEstancia)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 60, gap: 16 },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink },

  statsRow: { flexDirection: 'row', gap: 10 },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 4,
  },
  statAccent: { backgroundColor: colors.green700, borderColor: colors.green700 },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.green900 },
  statLabel: { fontSize: 11, color: colors.green900 },

  filters: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.green900, borderColor: colors.green900 },
  chipText: { fontSize: 12, fontWeight: '700', color: colors.inkSoft },
  chipTextActive: { color: '#fff' },

  empty: { textAlign: 'center', color: colors.inkSoft, marginTop: 16 },

  list: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.green50 },

  date: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.green50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateActive: { backgroundColor: colors.green700 },
  dateDay: { fontSize: 16, fontWeight: '800', color: colors.green900 },
  dateDow: { fontSize: 9, fontWeight: '800', color: colors.green900 },

  time: { fontSize: 14, fontWeight: '800', color: colors.ink },
  meta: { fontSize: 12, color: colors.inkSoft, marginTop: 2 },
  duration: { fontSize: 13, fontWeight: '800', color: colors.ink },

  livePill: {
    backgroundColor: colors.green700,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveText: { fontSize: 11, fontWeight: '800', color: colors.green900 },
});
