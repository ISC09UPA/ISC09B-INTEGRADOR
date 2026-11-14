import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Modal,
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { MensajeError } from '../components/EstadoCarga';
import PlacaModal from '../components/PlacaModal';
import { cajones, escaner, pluma } from '../api';
import { useCarga } from '../hooks/useCarga';
import { hora, duracion, etiquetaTipo, MOTIVOS } from '../utils/formato';
import { colors, radius } from '../theme';

const GATE_OPEN_MS = 5000; // la pluma se vuelve a cerrar sola
const MAX_BYTES = 4 * 1024 * 1024; // igual que EscanerService.TamanoMaximoBytes

/**
 * Escáner de placas (pantalla 7), en dos pasos:
 * 1. Tomar foto → POST /api/escaner/analizar (vista previa, no guarda nada).
 * 2. "Registrar paso" → POST /api/escaner/registrar (mismas reglas que la maqueta;
 *    si el resultado es Abrir, el back abre la pluma solo).
 * "Abrir manualmente" es aparte: abre sin registrar entrada ni salida.
 */
export default function ScannerScreen() {
  const mapa = useCarga(() => cajones.mapa(), [], { cadaMs: 10000 });
  const estadoPluma = useCarga(() => pluma.estado(), [], { cadaMs: 5000 });

  const [analisis, setAnalisis] = useState(null); // AnalisisPlacaDto
  const [placa, setPlaca] = useState(null); // la detectada, o la que corrigió el admin
  const [resultado, setResultado] = useState(null); // ResultadoPasoDto
  const [analizando, setAnalizando] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [manualVisible, setManualVisible] = useState(false);
  const [plumaAbiertaLocal, setPlumaAbiertaLocal] = useState(false);
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Mientras no exista SignalR, la pluma se muestra abierta unos segundos tras abrirla desde aquí.
  const marcarPlumaAbierta = () => {
    setPlumaAbiertaLocal(true);
    timers.current.push(setTimeout(() => setPlumaAbiertaLocal(false), GATE_OPEN_MS));
  };
  const gateOpen = plumaAbiertaLocal || estadoPluma.datos?.abierta === true;

  const libres = analisis?.lugaresLibres ?? mapa.datos?.libres ?? null;

  const capturar = async (desdeGaleria) => {
    if (analizando) return;
    setError(null);

    const permiso = desdeGaleria
      ? await ImagePicker.requestMediaLibraryPermissionsAsync()
      : await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) {
      setError(desdeGaleria ? 'Se necesita permiso para ver tus fotos.' : 'Se necesita permiso para usar la cámara.');
      return;
    }

    const opciones = { mediaTypes: ['images'], quality: 0.6 };
    const r = desdeGaleria
      ? await ImagePicker.launchImageLibraryAsync(opciones)
      : await ImagePicker.launchCameraAsync(opciones);
    if (r.canceled) return;

    const foto = r.assets[0];
    if (foto.fileSize && foto.fileSize > MAX_BYTES) {
      setError('La foto pesa más de 4 MB. Toma otra con menos resolución.');
      return;
    }

    setAnalizando(true);
    setResultado(null);
    try {
      const a = await escaner.analizar(foto.uri, foto.mimeType ?? 'image/jpeg');
      setAnalisis(a);
      setPlaca(a.placa);
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalizando(false);
    }
  };

  const registrar = async () => {
    if (!analisis || registrando) return;
    setRegistrando(true);
    setError(null);
    try {
      const r = await escaner.registrar({ placa, tipo: analisis.tipo, fotoBlob: analisis.fotoBlob });
      setResultado(r);
      setAnalisis(null); // la foto ya se usó; para el siguiente auto hay que tomar otra
      if (r.accion === 'Abrir') marcarPlumaAbierta();
      mapa.recargar({ silencioso: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setRegistrando(false);
    }
  };

  const placaEditada = analisis && placa !== analisis.placa;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Encabezado */}
        <View style={styles.header}>
          <Text style={styles.title}>Escáner de placas</Text>
          {libres !== null && (
            <View style={[styles.badge, libres === 0 && styles.badgeFull]}>
              <Text style={[styles.badgeText, libres === 0 && styles.badgeTextFull]}>
                {libres === 0 ? 'Lleno' : `${libres} ${libres === 1 ? 'libre' : 'libres'}`}
              </Text>
            </View>
          )}
        </View>

        {/* Foto */}
        <Pressable style={styles.camera} onPress={() => capturar(false)} disabled={analizando}>
          {analisis?.fotoUrl ? (
            <Image source={{ uri: analisis.fotoUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : null}
          <Text style={styles.cameraLabel}>
            {analisis ? 'Foto analizada' : 'Toca para tomar la foto de la placa'}
          </Text>

          <View style={styles.frame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            {analizando ? (
              <ActivityIndicator color={colors.green700} />
            ) : (
              <View style={styles.plateBox}>
                <Text style={styles.plateBoxText}>{analisis ? placa ?? '———' : '———'}</Text>
              </View>
            )}
          </View>

          <Text style={styles.cameraHint}>
            {analizando ? 'Leyendo placa…' : 'Centra la placa dentro del recuadro'}
          </Text>
        </Pressable>

        <MensajeError mensaje={error} />

        {/* Vista previa: AnalisisPlacaDto */}
        {analisis && (
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardLabel}>Placa detectada · Computer Vision</Text>
              <Text style={styles.confidence}>{Math.round(analisis.confianza * 100)} %</Text>
            </View>

            <View style={styles.rowBetween}>
              <Text style={styles.plate}>{placa ?? 'No legible'}</Text>
              <Pressable style={styles.editBtn} onPress={() => setEditing(true)}>
                <Text style={styles.editText}>{placa ? 'Editar' : 'Escribir'}</Text>
              </Pressable>
            </View>

            <View style={styles.tags}>
              <Tag label={`${etiquetaTipo(analisis.tipo)} · Custom Vision`} />
              <Tag
                label={
                  analisis.entradaAbierta
                    ? `Entrada abierta ${hora(analisis.entradaAbierta)}`
                    : 'Sin entrada abierta'
                }
              />
              {analisis.seAbriraPluma ? (
                <Tag
                  label={`Se registrará como ${analisis.seRegistraraComo === 'Salida' ? 'salida' : 'entrada'}`}
                  tone="strong"
                />
              ) : (
                <Tag
                  label={
                    analisis.seRegistraraComo === 'Entrada' && analisis.lugaresLibres === 0
                      ? 'Sin lugares: se negará la entrada'
                      : 'Lectura repetida: no se abrirá la pluma'
                  }
                  tone="warn"
                />
              )}
            </View>

            {placaEditada && (
              <Text style={styles.note}>
                Corregiste la placa: al registrar, el sistema vuelve a decidir con la placa nueva.
              </Text>
            )}
          </View>
        )}

        {/* Resultado: ResultadoPasoDto */}
        {resultado && <Resultado resultado={resultado} />}

        {/* Estado de la pluma */}
        <View style={styles.gateRow}>
          <View style={[styles.gateDot, gateOpen && styles.gateDotOpen]} />
          <Text style={styles.gateText}>{gateOpen ? 'Pluma abierta' : 'Pluma cerrada'}</Text>
          {gateOpen && <Text style={styles.gateSub}>Se cierra sola en unos segundos</Text>}
        </View>

        {/* Acciones */}
        <View style={styles.actions}>
          <Pressable
            style={[styles.cameraBtn, analizando && styles.disabled]}
            onPress={() => capturar(false)}
            disabled={analizando}
            accessibilityLabel="Tomar foto de la placa"
          >
            <Ionicons name="camera-outline" size={22} color={colors.ink} />
          </Pressable>
          <Pressable
            style={[styles.cameraBtn, analizando && styles.disabled]}
            onPress={() => capturar(true)}
            disabled={analizando}
            accessibilityLabel="Elegir foto de la galería"
          >
            <Ionicons name="images-outline" size={22} color={colors.ink} />
          </Pressable>
          <Pressable
            style={[styles.openBtn, (!analisis || registrando) && styles.disabled]}
            onPress={registrar}
            disabled={!analisis || registrando}
          >
            {registrando ? (
              <ActivityIndicator color={colors.green900} />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.green900} />
                <Text style={styles.openText}>Registrar paso</Text>
              </>
            )}
          </Pressable>
        </View>

        <Pressable style={styles.manualBtn} onPress={() => setManualVisible(true)}>
          <Ionicons name="lock-open-outline" size={16} color={colors.red} />
          <Text style={styles.manualText}>Abrir manualmente</Text>
        </Pressable>
      </ScrollView>

      <PlacaModal
        visible={editing}
        inicial={placa ?? ''}
        onCancel={() => setEditing(false)}
        onGuardar={(nueva) => {
          setPlaca(nueva);
          setEditing(false);
        }}
      />

      <AperturaManualModal
        visible={manualVisible}
        onCancel={() => setManualVisible(false)}
        onAbierta={() => {
          setManualVisible(false);
          marcarPlumaAbierta();
        }}
      />
    </View>
  );
}

function Resultado({ resultado }) {
  const abrio = resultado.accion === 'Abrir';
  return (
    <View style={[styles.result, abrio ? styles.resultOk : styles.resultDenied]}>
      <Ionicons
        name={abrio ? 'checkmark-circle' : 'close-circle'}
        size={24}
        color={abrio ? colors.green900 : colors.red}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.resultTitle}>
          {abrio ? 'Pluma abierta' : 'Pluma cerrada'} · {resultado.placa ?? 'placa no legible'}
        </Text>
        <Text style={styles.resultText}>
          {MOTIVOS[resultado.motivo] ?? resultado.motivo}
          {resultado.minutosEstancia != null ? ` · estancia de ${duracion(resultado.minutosEstancia)}` : ''}
        </Text>
      </View>
    </View>
  );
}

/** Apertura manual: POST /api/pluma/abrir. No registra entrada ni salida. */
function AperturaManualModal({ visible, onCancel, onAbierta }) {
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const abrir = async () => {
    setEnviando(true);
    setError(null);
    try {
      await pluma.abrir(motivo.trim());
      onAbierta();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onShow={() => {
        setMotivo('');
        setError(null);
      }}
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Abrir pluma manualmente</Text>
          <Text style={styles.sheetText}>
            La pluma se abre sin revisar el cupo y no se registra entrada ni salida. Queda guardado
            quién la abrió.
          </Text>
          <Text style={styles.fieldLabel}>Motivo (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej. entrega de material"
            placeholderTextColor={colors.inkSoft}
            maxLength={200}
            value={motivo}
            onChangeText={setMotivo}
          />
          <MensajeError mensaje={error} />
          <View style={styles.sheetActions}>
            <Pressable style={styles.action} onPress={onCancel}>
              <Text style={styles.actionText}>Cancelar</Text>
            </Pressable>
            <Pressable style={[styles.action, styles.actionDark]} onPress={abrir} disabled={enviando}>
              {enviando ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={[styles.actionText, styles.actionTextDark]}>Abrir</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
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
    overflow: 'hidden',
  },
  cameraLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
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
  note: { fontSize: 12, lineHeight: 17, color: colors.inkSoft },

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

  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 14,
  },
  resultOk: { backgroundColor: colors.green100, borderColor: colors.green700 },
  resultDenied: { backgroundColor: '#FDECEA', borderColor: colors.red },
  resultTitle: { fontSize: 14, fontWeight: '800', color: colors.ink },
  resultText: { fontSize: 12, color: colors.inkSoft, marginTop: 2 },

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

  manualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.red,
    backgroundColor: colors.surface,
  },
  manualText: { fontSize: 14, fontWeight: '800', color: colors.red },

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
  sheetText: { fontSize: 13, lineHeight: 19, color: colors.inkSoft },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: colors.inkSoft },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.ink,
  },
  sheetActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
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
