import { useEffect, useRef, useState } from 'react';
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
import { SLOTS, GATE_CLOSED } from '../data/mock';
import { VEHICLES, SCAN_SAMPLES } from '../data/admin';
import { colors, radius } from '../theme';

const GATE_OPEN_MS = 5000; // la pluma se vuelve a cerrar sola

export default function ScannerScreen() {
  const [sampleIndex, setSampleIndex] = useState(0);
  const [reading, setReading] = useState(SCAN_SAMPLES[0]);
  const [scanning, setScanning] = useState(false);
  const [gateOpen, setGateOpen] = useState(!GATE_CLOSED);
  const [editing, setEditing] = useState(false);
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));

  const free = SLOTS.filter((s) => s.status === 'libre').length;

  // Si la placa tiene una entrada abierta, el paso cuenta como salida.
  const inside = reading
    ? VEHICLES.find((v) => v.status === 'dentro' && v.plate === reading.plate)
    : null;
  const isExit = Boolean(inside);
  const full = !isExit && free === 0;

  const scan = () => {
    if (scanning) return;
    setScanning(true);
    const next = (sampleIndex + 1) % SCAN_SAMPLES.length;
    later(() => {
      setSampleIndex(next);
      setReading(SCAN_SAMPLES[next]);
      setScanning(false);
    }, 900);
  };

  const openGate = () => {
    if (gateOpen) return;
    setGateOpen(true);
    later(() => setGateOpen(false), GATE_OPEN_MS);
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Encabezado */}
        <View style={styles.header}>
          <Text style={styles.title}>Escáner de placas</Text>
          <View style={[styles.badge, free === 0 && styles.badgeFull]}>
            <Text style={[styles.badgeText, free === 0 && styles.badgeTextFull]}>
              {free === 0 ? 'Lleno' : `${free} ${free === 1 ? 'libre' : 'libres'}`}
            </Text>
          </View>
        </View>

        {/* Vista de cámara (marcador de lugar) */}
        <View style={styles.camera}>
          <Text style={styles.cameraLabel}>[Vista de la cámara del celular]</Text>

          <View style={styles.frame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            {scanning ? (
              <ActivityIndicator color={colors.green700} />
            ) : (
              <View style={styles.plateBox}>
                <Text style={styles.plateBoxText}>{reading?.plate ?? '———'}</Text>
              </View>
            )}
          </View>

          <Text style={styles.cameraHint}>
            {scanning ? 'Leyendo placa…' : 'Centra la placa dentro del recuadro'}
          </Text>
        </View>

        {/* Resultado de la lectura */}
        {reading && (
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardLabel}>Placa detectada · Computer Vision</Text>
              <Text style={styles.confidence}>{reading.confidence} %</Text>
            </View>

            <View style={styles.rowBetween}>
              <Text style={styles.plate}>{reading.plate}</Text>
              <Pressable style={styles.editBtn} onPress={() => setEditing(true)}>
                <Text style={styles.editText}>Editar</Text>
              </Pressable>
            </View>

            <View style={styles.tags}>
              <Tag label={`${reading.type} · Custom Vision`} />
              <Tag
                label={
                  isExit
                    ? `Entrada abierta ${inside.entryTime ?? ''}`.trim()
                    : 'Sin entrada abierta'
                }
              />
              {full ? (
                <Tag label="Sin lugares: se negará la entrada" tone="warn" />
              ) : (
                <Tag
                  label={isExit ? 'Se registrará como salida' : 'Se registrará como entrada'}
                  tone="strong"
                />
              )}
            </View>
          </View>
        )}

        {/* Estado de la pluma */}
        <View style={styles.gateRow}>
          <View style={[styles.gateDot, gateOpen && styles.gateDotOpen]} />
          <Text style={styles.gateText}>{gateOpen ? 'Pluma abierta' : 'Pluma cerrada'}</Text>
          {gateOpen && <Text style={styles.gateSub}>Se cierra sola en unos segundos</Text>}
        </View>

        {/* Acciones */}
        <View style={styles.actions}>
          <Pressable
            style={[styles.cameraBtn, scanning && styles.disabled]}
            onPress={scan}
            disabled={scanning}
            accessibilityLabel="Tomar foto de la placa"
          >
            <Ionicons name="camera-outline" size={22} color={colors.ink} />
          </Pressable>
          <Pressable
            style={[styles.openBtn, gateOpen && styles.disabled]}
            onPress={openGate}
            disabled={gateOpen}
          >
            <Ionicons
              name={gateOpen ? 'lock-open' : 'lock-open-outline'}
              size={18}
              color={colors.green900}
            />
            <Text style={styles.openText}>{gateOpen ? 'Pluma abierta' : 'Abrir pluma'}</Text>
          </Pressable>
        </View>
      </ScrollView>

      <EditPlateModal
        visible={editing}
        initial={reading?.plate ?? ''}
        onCancel={() => setEditing(false)}
        onSave={(plate) => {
          setReading((r) => ({ ...r, plate }));
          setEditing(false);
        }}
      />
    </View>
  );
}

function Tag({ label, tone }) {
  return (
    <View
      style={[styles.tag, tone === 'strong' && styles.tagStrong, tone === 'warn' && styles.tagWarn]}
    >
      <Text
        style={[
          styles.tagText,
          tone === 'strong' && styles.tagTextStrong,
          tone === 'warn' && styles.tagTextWarn,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function EditPlateModal({ visible, initial, onCancel, onSave }) {
  const [plate, setPlate] = useState(initial);
  const valid = plate.trim().length >= 5;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onShow={() => setPlate(initial)}
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Corregir placa</Text>
          <Text style={styles.fieldLabel}>Placa</Text>
          <TextInput
            style={styles.input}
            placeholder="ABC-123-A"
            placeholderTextColor={colors.inkSoft}
            autoCapitalize="characters"
            value={plate}
            onChangeText={(t) => setPlate(t.toUpperCase())}
          />
          <View style={styles.sheetActions}>
            <Pressable style={styles.action} onPress={onCancel}>
              <Text style={styles.actionText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[styles.action, styles.actionDark, !valid && { opacity: 0.4 }]}
              disabled={!valid}
              onPress={() => onSave(plate.trim())}
            >
              <Text style={[styles.actionText, styles.actionTextDark]}>Guardar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const CORNER = 26;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 60, gap: 14 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: colors.ink },
  badge: {
    backgroundColor: colors.green100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeFull: { backgroundColor: colors.red },
  badgeText: { fontSize: 12, fontWeight: '800', color: colors.green900 },
  badgeTextFull: { color: '#fff' },

  camera: {
    backgroundColor: colors.green900,
    borderRadius: radius.lg + 4,
    padding: 16,
    height: 270,
    justifyContent: 'space-between',
  },
  cameraLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  frame: {
    alignSelf: 'center',
    width: 240,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: colors.green700 },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 6 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 6 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 6 },
  plateBox: {
    backgroundColor: '#fff',
    borderRadius: radius.sm,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  plateBoxText: { fontSize: 24, fontWeight: '800', letterSpacing: 3, color: colors.ink },
  cameraHint: { fontSize: 12, fontWeight: '600', color: '#fff', textAlign: 'center' },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
  },
  cardLabel: { fontSize: 12, fontWeight: '600', color: colors.inkSoft },
  confidence: { fontSize: 12, fontWeight: '800', color: colors.ink },
  plate: { fontSize: 24, fontWeight: '800', letterSpacing: 2, color: colors.ink },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editText: { fontSize: 12, fontWeight: '800', color: colors.ink },

  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    backgroundColor: colors.green50,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm - 2,
  },
  tagStrong: { backgroundColor: colors.green100 },
  tagWarn: { backgroundColor: '#FDECEA' },
  tagText: { fontSize: 12, fontWeight: '600', color: colors.inkSoft },
  tagTextStrong: { fontWeight: '800', color: colors.green900 },
  tagTextWarn: { fontWeight: '800', color: colors.red },

  gateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.green50,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  gateDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.inkSoft },
  gateDotOpen: { backgroundColor: colors.green700 },
  gateText: { fontSize: 14, fontWeight: '800', color: colors.ink },
  gateSub: { fontSize: 11, color: colors.inkSoft, flex: 1, textAlign: 'right' },

  actions: { flexDirection: 'row', gap: 10 },
  cameraBtn: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openBtn: {
    flex: 1,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.md,
    backgroundColor: colors.green700,
  },
  openText: { fontSize: 16, fontWeight: '800', color: colors.green900 },
  disabled: { opacity: 0.5 },

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
});
