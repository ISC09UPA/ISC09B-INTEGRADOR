import { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { HISTORY, HISTORY_STATS } from '../data/history';
import { colors, radius } from '../theme';

const FILTERS = [
  { id: 'semana', label: 'Esta semana', groups: ['semana'] },
  { id: 'mes', label: 'Este mes', groups: ['semana', 'mes'] },
  { id: 'todo', label: 'Todo', groups: ['semana', 'mes', 'antes'] },
];

export default function HistoryScreen() {
  const [filter, setFilter] = useState('semana');
  const groups = FILTERS.find((f) => f.id === filter).groups;
  const items = HISTORY.filter((h) => groups.includes(h.group));

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Mi historial</Text>

      {/* Resumen */}
      <View style={styles.statsRow}>
        <View style={[styles.stat, styles.statAccent]}>
          <Text style={styles.statValue}>{HISTORY_STATS.visits}</Text>
          <Text style={styles.statLabel}>visitas en {HISTORY_STATS.month}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{HISTORY_STATS.avgTime}</Text>
          <Text style={styles.statLabel}>h promedio</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{HISTORY_STATS.favoriteSlot}</Text>
          <Text style={styles.statLabel}>cajón frecuente</Text>
        </View>
      </View>

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
      <View style={styles.list}>
        {items.map((h, i) => (
          <HistoryRow key={h.id} item={h} last={i === items.length - 1} />
        ))}
      </View>
    </ScrollView>
  );
}

function HistoryRow({ item, last }) {
  const active = item.end === null;
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={[styles.date, active && styles.dateActive]}>
        <Text style={styles.dateDay}>{item.day}</Text>
        <Text style={styles.dateDow}>{item.dow}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.time}>
          {item.start} → {active ? 'en curso' : item.end}
        </Text>
        <Text style={styles.meta}>
          Cajón {item.slot} · {item.plate}
        </Text>
      </View>

      {active ? (
        <View style={styles.livePill}>
          <Text style={styles.liveText}>En curso</Text>
        </View>
      ) : (
        <Text style={styles.duration}>{item.duration}</Text>
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
