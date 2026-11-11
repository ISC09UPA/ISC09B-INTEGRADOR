import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Modal,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VEHICLES, VEHICLE_TYPES } from '../data/admin';
import { colors, radius } from '../theme';

const FILTERS = [
  { id: 'todos', label: 'Todos' },
  { id: 'dentro', label: 'Dentro' },
  { id: 'fuera', label: 'Fuera' },
  { id: 'baja', label: 'Baja' },
];

const TYPE_ICONS = {
  Carro: 'car-outline',
  Camioneta: 'car-sport-outline',
  Moto: 'bicycle-outline',
  Camión: 'bus-outline',
};

export default function VehiclesScreen() {
  const [vehicles, setVehicles] = useState(VEHICLES);
  const [filter, setFilter] = useState('todos');
  const [query, setQuery] = useState('');
  // modal: null | { mode: 'alta' } | { mode: 'corregir', id }
  const [modal, setModal] = useState(null);

  const q = query.trim().toUpperCase();
  const items = vehicles.filter((v) => {
    if (filter !== 'todos' && v.status !== filter) return false;
    if (q && !(v.plate ?? '').toUpperCase().includes(q)) return false;
    return true;
  });

  const update = (id, changes) =>
    setVehicles((list) => list.map((v) => (v.id === id ? { ...v, ...changes } : v)));

  const handleSave = ({ plate, type }) => {
    if (modal.mode === 'alta') {
      setVehicles((list) => [
        { id: Date.now(), plate, type, status: 'fuera', exitTime: null },
        ...list,
      ]);
    } else {
      update(modal.id, { plate });
    }
    setModal(null);
  };

  const editing = modal?.mode === 'corregir' ? vehicles.find((v) => v.id === modal.id) : null;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Encabezado */}
        <View style={styles.header}>
          <Text style={styles.title}>Vehículos</Text>
          <Pressable style={styles.addBtn} onPress={() => setModal({ mode: 'alta' })}>
            <Ionicons name="add" size={18} color={colors.green900} />
            <Text style={styles.addText}>Dar de alta</Text>
          </Pressable>
        </View>

        {/* Búsqueda */}
        <View style={styles.search}>
          <Ionicons name="search-outline" size={18} color={colors.inkSoft} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por placa"
            placeholderTextColor={colors.inkSoft}
            autoCapitalize="characters"
            value={query}
            onChangeText={setQuery}
          />
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
        {items.map((v) => (
          <VehicleRow
            key={v.id}
            item={v}
            onBaja={() => update(v.id, { status: 'baja', slot: undefined })}
            onReactivar={() => update(v.id, { status: 'fuera', exitTime: null })}
            onCorregir={() => setModal({ mode: 'corregir', id: v.id })}
          />
        ))}

        {items.length === 0 && (
          <Text style={styles.empty}>No hay vehículos con ese filtro.</Text>
        )}
      </ScrollView>

      <VehicleForm
        visible={modal !== null}
        mode={modal?.mode}
        initialType={editing?.type}
        onCancel={() => setModal(null)}
        onSave={handleSave}
      />
    </View>
  );
}

function describe(v) {
  if (v.status === 'dentro') return `${v.type} · Dentro · Cajón ${v.slot}`;
  if (v.status === 'baja') return `${v.type} · Dado de baja`;
  return v.exitTime ? `${v.type} · Salió ${v.exitTime}` : `${v.type} · Fuera`;
}

function VehicleRow({ item, onBaja, onReactivar, onCorregir }) {
  const unreadable = item.plate === null;
  const inside = item.status === 'dentro';

  return (
    <View style={[styles.row, unreadable && styles.rowWarn]}>
      <View
        style={[
          styles.icon,
          inside && styles.iconInside,
          unreadable && styles.iconWarn,
        ]}
      >
        <Ionicons
          name={TYPE_ICONS[item.type] ?? 'car-outline'}
          size={20}
          color={unreadable ? '#8A5A00' : colors.green900}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.plate}>{unreadable ? 'Placa no legible' : item.plate}</Text>
        <Text style={styles.meta}>{describe(item)}</Text>
      </View>

      {unreadable ? (
        <Pressable style={[styles.action, styles.actionDark]} onPress={onCorregir}>
          <Text style={[styles.actionText, styles.actionTextDark]}>Corregir</Text>
        </Pressable>
      ) : item.status === 'baja' ? (
        <Pressable style={styles.action} onPress={onReactivar}>
          <Text style={styles.actionText}>Reactivar</Text>
        </Pressable>
      ) : (
        <Pressable style={styles.action} onPress={onBaja}>
          <Text style={styles.actionText}>Dar de baja</Text>
        </Pressable>
      )}
    </View>
  );
}

function VehicleForm({ visible, mode, initialType, onCancel, onSave }) {
  const [plate, setPlate] = useState('');
  const [type, setType] = useState(VEHICLE_TYPES[0]);
  const isAlta = mode === 'alta';
  const valid = plate.trim().length >= 5;

  const reset = () => {
    setPlate('');
    setType(initialType ?? VEHICLE_TYPES[0]);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onShow={reset} onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{isAlta ? 'Dar de alta vehículo' : 'Corregir placa'}</Text>

          <Text style={styles.fieldLabel}>Placa</Text>
          <TextInput
            style={styles.input}
            placeholder="ABC-123-A"
            placeholderTextColor={colors.inkSoft}
            autoCapitalize="characters"
            value={plate}
            onChangeText={(t) => setPlate(t.toUpperCase())}
          />

          {isAlta && (
            <>
              <Text style={styles.fieldLabel}>Tipo</Text>
              <View style={styles.filters}>
                {VEHICLE_TYPES.map((t) => {
                  const active = t === type;
                  return (
                    <Pressable
                      key={t}
                      onPress={() => setType(t)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{t}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          <View style={styles.sheetActions}>
            <Pressable style={styles.action} onPress={onCancel}>
              <Text style={styles.actionText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[styles.action, styles.actionDark, !valid && { opacity: 0.4 }]}
              disabled={!valid}
              onPress={() => onSave({ plate: plate.trim(), type })}
            >
              <Text style={[styles.actionText, styles.actionTextDark]}>Guardar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 60, gap: 12 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: { fontSize: 26, fontWeight: '800', color: colors.ink },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.green700,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 24,
  },
  addText: { fontSize: 14, fontWeight: '800', color: colors.green900 },

  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, paddingVertical: 13, fontSize: 15, color: colors.ink },

  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.green900, borderColor: colors.green900 },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.inkSoft },
  chipTextActive: { color: '#fff' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 12,
  },
  rowWarn: { borderColor: colors.green300, backgroundColor: '#FFFBEF' },
  icon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.green50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInside: { backgroundColor: colors.green700 },
  iconWarn: { backgroundColor: '#FFF1C7' },
  plate: { fontSize: 15, fontWeight: '800', letterSpacing: 0.5, color: colors.ink },
  meta: { fontSize: 12, color: colors.inkSoft, marginTop: 2 },

  action: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  actionDark: { backgroundColor: colors.green900, borderColor: colors.green900 },
  actionText: { fontSize: 12, fontWeight: '800', color: colors.ink },
  actionTextDark: { color: '#fff' },

  empty: { textAlign: 'center', color: colors.inkSoft, marginTop: 24 },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl - 8,
    padding: 20,
    gap: 10,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.ink, marginBottom: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: colors.inkSoft },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    letterSpacing: 1,
    color: colors.ink,
  },
  sheetActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
});
