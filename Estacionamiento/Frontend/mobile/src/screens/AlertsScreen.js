import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Cargando, ErrorCarga, MensajeError } from '../components/EstadoCarga';
import PlacaModal from '../components/PlacaModal';
import { alertas, vehiculos } from '../api';
import { useCarga } from '../hooks/useCarga';
import { hora, fechaLarga, TITULOS_ALERTA } from '../utils/formato';
import { colors, radius } from '../theme';

const FILTROS = [
  { id: true, label: 'Pendientes' },
  { id: false, label: 'Todas' },
];

const ICONOS = {
  EntradaNegada: 'hand-left-outline',
  PlacaNoLegible: 'eye-off-outline',
  CajonSinSalida: 'time-outline',
};

/**
 * Alertas del administrador (se abre desde "Ver" en el Panel).
 * - EntradaNegada y CajonSinSalida: solo se atienden.
 * - PlacaNoLegible: se corrige la placa del vehículo y el back la marca como atendida sola.
 */
export default function AlertsScreen({ onBack }) {
  const [soloPendientes, setSoloPendientes] = useState(true);
  const { datos, cargando, error, recargar } = useCarga(
    () => alertas.listar(soloPendientes),
    [soloPendientes]
  );
  const [corrigiendo, setCorrigiendo] = useState(null); // AlertaDto de placa no legible

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable style={styles.back} onPress={onBack}>
            <Ionicons name="chevron-back" size={20} color={colors.green900} />
          </Pressable>
          <Text style={styles.title}>Alertas</Text>
        </View>

        <View style={styles.filters}>
          {FILTROS.map((f) => {
            const active = f.id === soloPendientes;
            return (
              <Pressable
                key={f.label}
                onPress={() => setSoloPendientes(f.id)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {cargando ? (
          <Cargando />
        ) : error ? (
          <ErrorCarga mensaje={error} onReintentar={recargar} />
        ) : datos.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="checkmark-circle-outline" size={40} color={colors.green900} />
            <Text style={styles.emptyText}>
              {soloPendientes ? 'No hay alertas pendientes.' : 'No hay alertas.'}
            </Text>
          </View>
        ) : (
          datos.map((a) => (
            <TarjetaAlerta
              key={a.id}
              alerta={a}
              onAtendida={recargar}
              onCorregir={() => setCorrigiendo(a)}
            />
          ))
        )}
      </ScrollView>

      <PlacaModal
        visible={corrigiendo !== null}
        titulo="Corregir placa no legible"
        onCancel={() => setCorrigiendo(null)}
        onGuardar={async (placa) => {
          await vehiculos.corregirPlaca(corrigiendo.vehiculoId, placa);
          setCorrigiendo(null);
          recargar();
        }}
      />
    </View>
  );
}

/** alerta: AlertaDto { id, tipo, mensaje, placa, fotoUrl, vehiculoId, fecha, atendida } */
function TarjetaAlerta({ alerta, onAtendida, onCorregir }) {
  const [atendiendo, setAtendiendo] = useState(false);
  const [error, setError] = useState(null);
  const puedeCorregir = alerta.tipo === 'PlacaNoLegible' && alerta.vehiculoId && !alerta.atendida;

  const atender = async () => {
    setAtendiendo(true);
    setError(null);
    try {
      await alertas.atender(alerta.id);
      onAtendida();
    } catch (err) {
      setError(err.message); // 409 si alguien más ya la atendió
      setAtendiendo(false);
    }
  };

  return (
    <View style={[styles.card, alerta.atendida && styles.cardDone]}>
      <View style={styles.cardHeader}>
        <View style={[styles.icon, alerta.atendida && styles.iconDone]}>
          <Ionicons name={ICONOS[alerta.tipo] ?? 'warning-outline'} size={18} color="#8A5A00" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{TITULOS_ALERTA[alerta.tipo] ?? alerta.tipo}</Text>
          <Text style={styles.meta}>
            {fechaLarga(alerta.fecha)} · {hora(alerta.fecha)}
            {alerta.placa ? ` · ${alerta.placa}` : ''}
          </Text>
        </View>
        {alerta.atendida && (
          <View style={styles.doneChip}>
            <Text style={styles.doneText}>Atendida</Text>
          </View>
        )}
      </View>

      <Text style={styles.message}>{alerta.mensaje}</Text>

      {alerta.fotoUrl && (
        <Image source={{ uri: alerta.fotoUrl }} style={styles.photo} resizeMode="cover" />
      )}

      <MensajeError mensaje={error} />

      {!alerta.atendida && (
        <View style={styles.actions}>
          {puedeCorregir && (
            <Pressable style={[styles.action, styles.actionDark]} onPress={onCorregir}>
              <Text style={[styles.actionText, styles.actionTextDark]}>Corregir placa</Text>
            </Pressable>
          )}
          <Pressable style={styles.action} onPress={atender} disabled={atendiendo}>
            {atendiendo ? (
              <ActivityIndicator size="small" color={colors.ink} />
            ) : (
              <Text style={styles.actionText}>Atender</Text>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 60, gap: 12 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
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
  title: { fontSize: 26, fontWeight: '800', color: colors.ink },

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
  chipText: { fontSize: 13, fontWeight: '700', color: colors.inkSoft },
  chipTextActive: { color: '#fff' },

  empty: { alignItems: 'center', gap: 10, marginTop: 32 },
  emptyText: { fontSize: 14, color: colors.inkSoft },

  card: {
    backgroundColor: '#FFFBEF',
    borderWidth: 1,
    borderColor: colors.green300,
    borderRadius: radius.lg,
    padding: 14,
    gap: 10,
  },
  cardDone: { backgroundColor: colors.surface, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: '#FFF1C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDone: { backgroundColor: colors.green50 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
  meta: { fontSize: 12, color: colors.inkSoft, marginTop: 2 },
  message: { fontSize: 13, lineHeight: 19, color: colors.ink },
  photo: { height: 150, borderRadius: radius.md, backgroundColor: '#242424' },
  doneChip: {
    backgroundColor: colors.green50,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  doneText: { fontSize: 11, fontWeight: '800', color: colors.inkSoft },

  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  action: {
    minWidth: 76,
    alignItems: 'center',
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
});
