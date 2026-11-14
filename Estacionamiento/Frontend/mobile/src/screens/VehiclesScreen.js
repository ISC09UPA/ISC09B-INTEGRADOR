import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Modal,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Cargando, ErrorCarga, MensajeError } from '../components/EstadoCarga';
import PlacaModal from '../components/PlacaModal';
import { vehiculos } from '../api';
import { useCarga } from '../hooks/useCarga';
import { hora, etiquetaTipo, iconoTipo, TIPOS_VEHICULO } from '../utils/formato';
import { colors, radius } from '../theme';

// Los ids son los valores de FiltroVehiculos del back.
const FILTERS = [
  { id: 'Todos', label: 'Todos' },
  { id: 'Dentro', label: 'Dentro' },
  { id: 'Fuera', label: 'Fuera' },
  { id: 'Baja', label: 'Baja' },
];

export default function VehiclesScreen() {
  const [filter, setFilter] = useState('Todos');
  const [query, setQuery] = useState('');
  const [busqueda, setBusqueda] = useState(''); // query con retraso, para no llamar a la API en cada tecla
  const [altaVisible, setAltaVisible] = useState(false);
  const [corrigiendo, setCorrigiendo] = useState(null); // VehiculoDto
  const [errorAccion, setErrorAccion] = useState(null);

  useEffect(() => {
    const id = setTimeout(() => setBusqueda(query.trim()), 350);
    return () => clearTimeout(id);
  }, [query]);

  // El back busca por placa parcial ("123 a" encuentra "ABC-123-A") y filtra por chip.
  const { datos, cargando, error, recargar } = useCarga(
    () => vehiculos.listar(busqueda, filter),
    [busqueda, filter]
  );

  const accion = async (llamada) => {
    setErrorAccion(null);
    try {
      await llamada();
      recargar({ silencioso: true });
    } catch (err) {
      setErrorAccion(err.message); // 409 si ya estaba en ese estado
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Encabezado */}
        <View style={styles.header}>
          <Text style={styles.title}>Vehículos</Text>
          <Pressable style={styles.addBtn} onPress={() => setAltaVisible(true)}>
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

        <MensajeError mensaje={errorAccion} />

        {/* Lista: VehiculoDto[] */}
        {cargando && !datos ? (
          <Cargando />
        ) : error && !datos ? (
          <ErrorCarga mensaje={error} onReintentar={recargar} />
        ) : datos.length === 0 ? (
          <Text style={styles.empty}>No hay vehículos con ese filtro.</Text>
        ) : (
          datos.map((v) => (
            <VehicleRow
              key={v.id}
              item={v}
              onBaja={() => accion(() => vehiculos.baja(v.id))}
              onReactivar={() => accion(() => vehiculos.reactivar(v.id))}
              onCorregir={() => setCorrigiendo(v)}
            />
          ))
        )}
      </ScrollView>

      <AltaForm
        visible={altaVisible}
        onCancel={() => setAltaVisible(false)}
        onCreado={() => {
          setAltaVisible(false);
          recargar({ silencioso: true });
        }}
      />

      <PlacaModal
        visible={corrigiendo !== null}
        inicial={corrigiendo?.placa ?? ''}
        onCancel={() => setCorrigiendo(null)}
        onGuardar={async (placa) => {
          await vehiculos.corregirPlaca(corrigiendo.id, placa);
          setCorrigiendo(null);
          recargar({ silencioso: true });
        }}
      />
    </View>
  );
}

/** v: VehiculoDto { id, placa, placaLegible, tipo, estado, dentro, cajon, ultimaSalida, correoUsuario } */
function describe(v) {
  const tipo = etiquetaTipo(v.tipo);
  if (v.estado === 'Baja') return `${tipo} · Dado de baja`;
  if (v.dentro) return v.cajon ? `${tipo} · Dentro · Cajón ${v.cajon}` : `${tipo} · Dentro · sin cajón`;
  return v.ultimaSalida ? `${tipo} · Salió ${hora(v.ultimaSalida)}` : `${tipo} · Fuera`;
}

function VehicleRow({ item, onBaja, onReactivar, onCorregir }) {
  const unreadable = !item.placaLegible;

  return (
    <View style={[styles.row, unreadable && styles.rowWarn]}>
      <View
        style={[
          styles.icon,
          item.dentro && styles.iconInside,
          unreadable && styles.iconWarn,
        ]}
      >
        <Ionicons
          name={iconoTipo(item.tipo)}
          size={20}
          color={unreadable ? '#8A5A00' : colors.green900}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.plate}>{unreadable ? 'Placa no legible' : item.placa}</Text>
        <Text style={styles.meta}>{describe(item)}</Text>
        {item.correoUsuario ? <Text style={styles.meta}>{item.correoUsuario}</Text> : null}
      </View>

      {unreadable ? (
        <Pressable style={[styles.action, styles.actionDark]} onPress={onCorregir}>
          <Text style={[styles.actionText, styles.actionTextDark]}>Corregir</Text>
        </Pressable>
      ) : item.estado === 'Baja' ? (
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

/** Alta de vehículo: AltaVehiculoRequest { placa, tipo, correoUsuario? }. */
function AltaForm({ visible, onCancel, onCreado }) {
  const [placa, setPlaca] = useState('');
  const [tipo, setTipo] = useState(TIPOS_VEHICULO[0].valor);
  const [correo, setCorreo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const valida = placa.replace(/[^A-Z0-9]/gi, '').length >= 5;

  const reset = () => {
    setPlaca('');
    setTipo(TIPOS_VEHICULO[0].valor);
    setCorreo('');
    setError(null);
  };

  const guardar = async () => {
    if (!valida || guardando) return;
    setGuardando(true);
    setError(null);
    try {
      await vehiculos.alta({
        placa: placa.trim(),
        tipo,
        correoUsuario: correo.trim() || null,
      });
      onCreado();
    } catch (err) {
      // 400 placa inválida · 404 no existe ese correo · 409 placa repetida
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onShow={reset} onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Dar de alta vehículo</Text>

          <Text style={styles.fieldLabel}>Placa</Text>
          <TextInput
            style={styles.input}
            placeholder="ABC-123-A"
            placeholderTextColor={colors.inkSoft}
            autoCapitalize="characters"
            autoCorrect={false}
            value={placa}
            onChangeText={(t) => setPlaca(t.toUpperCase())}
          />

          <Text style={styles.fieldLabel}>Tipo</Text>
          <View style={styles.filters}>
            {TIPOS_VEHICULO.map((t) => {
              const active = t.valor === tipo;
              return (
                <Pressable
                  key={t.valor}
                  onPress={() => setTipo(t.valor)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{t.etiqueta}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.fieldLabel}>Correo del dueño (opcional)</Text>
          <TextInput
            style={[styles.input, styles.inputNormal]}
            placeholder="dueno@correo.com"
            placeholderTextColor={colors.inkSoft}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={correo}
            onChangeText={setCorreo}
          />
          <Text style={styles.fieldHint}>
            Con el correo de su cuenta, el dueño verá su auto y su historial en la app.
          </Text>

          <MensajeError mensaje={error} />

          <View style={styles.sheetActions}>
            <Pressable style={styles.action} onPress={onCancel}>
              <Text style={styles.actionText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[styles.action, styles.actionDark, (!valida || guardando) && { opacity: 0.4 }]}
              disabled={!valida || guardando}
              onPress={guardar}
            >
              {guardando ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={[styles.actionText, styles.actionTextDark]}>Guardar</Text>
              )}
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
  inputNormal: { letterSpacing: 0 },
  fieldHint: { fontSize: 11, lineHeight: 16, color: colors.inkSoft, marginTop: -4 },
  sheetActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
});
