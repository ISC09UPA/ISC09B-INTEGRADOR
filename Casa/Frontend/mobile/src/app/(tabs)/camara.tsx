import { useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { EstadoScan, FaceScanner, ScannerHandle } from '@/components/FaceScanner';
import { Btn, Burbuja, Card, Label, Screen, Titulo } from '@/components/ui';
import { api, mensajeDe } from '@/lib/api';
import { pct } from '@/lib/format';
import { tacto } from '@/lib/haptics';
import { colors, t } from '@/lib/theme';
import { Verificacion } from '@/lib/types';

export default function Camara() {
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [enfocada, setEnfocada] = useState(false);
  const [encendida, setEncendida] = useState(false);
  const [lista, setLista] = useState(false);
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [estado, setEstado] = useState<EstadoScan>('idle');
  const [resultado, setResultado] = useState<Verificacion | null>(null);
  const [error, setError] = useState('');
  const scanner = useRef<ScannerHandle>(null);

  // Solo una vista previa de cámara puede estar activa: se apaga al salir de la pestaña.
  useFocusEffect(
    useCallback(() => {
      setEnfocada(true);
      return () => {
        setEnfocada(false);
        setEncendida(false);
        setLista(false);
      };
    }, []),
  );

  async function encender() {
    setError('');
    if (!permiso?.granted) {
      const r = await pedirPermiso();
      if (!r.granted) return setError('Sin permiso de cámara. Actívalo en los ajustes del navegador o del teléfono.');
    }
    setLista(false);
    setEncendida(true);
  }

  async function reconocer() {
    setError('');
    setResultado(null);
    setEstado('scan');
    try {
      const imagen = await scanner.current!.capturar();
      const r = await api.post<Verificacion>('/api/rostro/verificar', { imagen }, 20000);
      setResultado(r);
      setEstado(r.autorizado ? 'ok' : 'fail');
      if (r.autorizado) tacto.exito();
      else tacto.error();
    } catch (e) {
      setEstado('fail');
      setError(mensajeDe(e));
    }
    setTimeout(() => setEstado('idle'), 2200);
  }

  return (
    <Screen>
      <Titulo kicker="Azure Custom Vision">Cámara</Titulo>
      <Text style={[t.mute, { marginBottom: 18, lineHeight: 20 }]}>
        Prueba el reconocimiento facial: usa el mismo modelo que la puerta de tu casa.
      </Text>

      <FaceScanner
        ref={scanner}
        activo={enfocada && encendida}
        estado={estado}
        facing={facing}
        ancho={300}
        alto={360}
        onLista={() => setLista(true)}
        onError={(m) => {
          setEncendida(false);
          setError(m);
        }}
      />

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
        {!encendida ? (
          <Btn title="Encender cámara" icono="videocam" style={{ flex: 1 }} onPress={() => void encender()} />
        ) : (
          <>
            <Btn title="Reconocer" icono="scan" style={{ flex: 1 }} cargando={estado === 'scan'} disabled={!lista} onPress={() => void reconocer()} />
            <Btn title="" icono="camera-reverse" variante="soft" style={{ width: 54, paddingHorizontal: 0 }} onPress={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))} />
            <Btn title="" icono="power" variante="ghost" style={{ width: 54, paddingHorizontal: 0 }} onPress={() => setEncendida(false)} />
          </>
        )}
      </View>

      {!!error && <Text style={{ color: colors.red, marginTop: 14, fontWeight: '600' }}>{error}</Text>}

      {resultado && (
        <Card tono={resultado.autorizado ? 'lime' : 'danger'} style={{ marginTop: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Burbuja
              icono={resultado.autorizado ? 'checkmark-circle' : 'close-circle'}
              color={resultado.autorizado ? colors.lime : colors.red}
              bg={resultado.autorizado ? colors.limeBg : colors.redBg}
              size={54}
            />
            <View style={{ flex: 1 }}>
              <Label style={{ color: resultado.autorizado ? colors.lime : colors.red }}>{resultado.autorizado ? 'Autorizado' : 'No reconocido'}</Label>
              <Text style={[t.h1, { fontSize: 24 }]} numberOfLines={1}>{resultado.nombre || 'Sin coincidencia'}</Text>
            </View>
            <Text style={t.num}>{pct(resultado.probabilidad)}</Text>
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.card2, marginTop: 16, overflow: 'hidden' }}>
            <View style={{ width: `${Math.round(resultado.probabilidad * 100)}%`, height: 8, backgroundColor: resultado.autorizado ? colors.lime : colors.red }} />
            <View style={{ position: 'absolute', left: `${Math.round(resultado.umbral * 100)}%`, top: 0, bottom: 0, width: 2, backgroundColor: colors.text }} />
          </View>
          <Text style={[t.mono, { marginTop: 8 }]}>mínimo requerido: {pct(resultado.umbral)}</Text>
        </Card>
      )}
    </Screen>
  );
}
