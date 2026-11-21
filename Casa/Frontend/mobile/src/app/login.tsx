import { Ionicons } from '@expo/vector-icons';
import { useCameraPermissions } from 'expo-camera';
import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Aurora, Btn, Pill } from '@/components/ui';
import { EstadoScan, FaceScanner, ScannerHandle } from '@/components/FaceScanner';
import { mensajeDe } from '@/lib/api';
import { tacto } from '@/lib/haptics';
import { useSession } from '@/lib/session';
import { colors, radius, t } from '@/lib/theme';

const INTENTOS = 3;

export default function Login() {
  const insets = useSafeAreaInsets();
  const { signIn, signInFace, serverUrl, setServerUrl } = useSession();
  const [permiso, pedirPermiso] = useCameraPermissions();

  const [modo, setModo] = useState<'rostro' | 'correo'>('rostro');
  const [camara, setCamara] = useState(false);
  const [lista, setLista] = useState(false);
  const [estado, setEstado] = useState<EstadoScan>('idle');
  const [mensaje, setMensaje] = useState('Activa la cámara y mira de frente');
  const [intento, setIntento] = useState(0);

  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState('');

  const [editarUrl, setEditarUrl] = useState(false);
  const [url, setUrl] = useState(serverUrl);

  const scanner = useRef<ScannerHandle>(null);
  const ocupado = useRef(false);

  const activarCamara = useCallback(async () => {
    if (!permiso?.granted) {
      const r = await pedirPermiso();
      if (!r.granted) {
        setEstado('fail');
        setMensaje('Sin permiso de cámara. Actívalo en los ajustes del navegador o del teléfono.');
        return;
      }
    }
    setLista(false);
    setIntento(0);
    setEstado('idle');
    setMensaje('Iniciando cámara…');
    setCamara(true);
  }, [permiso, pedirPermiso]);

  const escanear = useCallback(async () => {
    if (ocupado.current || !scanner.current) return;
    ocupado.current = true;
    setEstado('scan');
    setMensaje('Verificando con Azure…');
    try {
      const imagen = await scanner.current.capturar();
      const nombre = await signInFace(imagen);
      tacto.exito();
      setEstado('ok');
      setMensaje(`Hola, ${nombre}`);
    } catch (e) {
      tacto.error();
      setEstado('fail');
      setMensaje(mensajeDe(e));
      setTimeout(() => setEstado((s) => (s === 'fail' ? 'idle' : s)), 1600);
      setIntento((n) => n + 1);
    } finally {
      ocupado.current = false;
    }
  }, [signInFace]);

  // Escaneo automático: 3 intentos, uno cada 3.5 s, en cuanto la cámara está lista.
  useEffect(() => {
    if (modo !== 'rostro' || !camara || !lista || estado === 'ok' || intento >= INTENTOS) return;
    const id = setTimeout(() => void escanear(), intento === 0 ? 1500 : 3500);
    return () => clearTimeout(id);
  }, [modo, camara, lista, intento, estado, escanear]);

  async function entrarConCorreo() {
    setError('');
    setTrabajando(true);
    try {
      await signIn(usuario, clave);
      tacto.exito();
    } catch (e) {
      tacto.error();
      setError(mensajeDe(e));
    } finally {
      setTrabajando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Aurora alarma={estado === 'fail'} />
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 28, paddingBottom: insets.bottom + 30, paddingHorizontal: 24, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="home" size={18} color="#0A1200" />
            </View>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.5 }}>casalink</Text>
          </View>
          <Pill texto={modo === 'rostro' ? 'ROSTRO' : 'CORREO'} icono={modo === 'rostro' ? 'scan' : 'mail'} />
        </View>

        <Text style={[t.hero, { marginTop: 30, fontSize: 40, lineHeight: 42 }]}>
          Tu casa,{'\n'}
          <Text style={{ color: colors.lime }}>a tu mando.</Text>
        </Text>
        <Text style={[t.mute, { marginTop: 10, fontSize: 15 }]}>
          {modo === 'rostro' ? 'Entra con tu cara: reconocida por Azure, igual que en la puerta.' : 'Inicia sesión con tu correo y contraseña.'}
        </Text>

        {modo === 'rostro' ? (
          <View style={{ marginTop: 26 }}>
            <FaceScanner
              ref={scanner}
              activo={camara}
              estado={estado}
              onLista={() => {
                setLista(true);
                setMensaje('Mira de frente a la cámara');
              }}
              onError={(m) => {
                setCamara(false);
                setEstado('fail');
                setMensaje(m);
              }}
            />
            <View style={{ alignItems: 'center', marginTop: 14, minHeight: 44 }}>
              <Text style={{ color: estado === 'fail' ? colors.red : estado === 'ok' ? colors.ok : colors.mute, fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
                {mensaje}
              </Text>
              {camara && intento > 0 && intento < INTENTOS && estado !== 'ok' ? (
                <Text style={t.mono}>
                  intento {intento + 1} de {INTENTOS}
                </Text>
              ) : null}
            </View>

            {!camara ? (
              <Btn title="Activar cámara" icono="videocam" onPress={() => void activarCamara()} />
            ) : intento >= INTENTOS && estado !== 'ok' ? (
              <Btn title="Intentar de nuevo" icono="refresh" onPress={() => setIntento(0)} />
            ) : (
              <Btn title="Escanear ahora" icono="scan" cargando={estado === 'scan'} disabled={!lista || estado === 'ok'} onPress={() => void escanear()} />
            )}
            <Btn title="Usar correo y contraseña" variante="ghost" style={{ marginTop: 10 }} onPress={() => { setCamara(false); setModo('correo'); }} />
          </View>
        ) : (
          <View style={{ marginTop: 28, gap: 12 }}>
            <Campo icono="mail-outline" valor={usuario} onCambio={setUsuario} placeholder="correo@ejemplo.com" teclado="email-address" />
            <Campo icono="lock-closed-outline" valor={clave} onCambio={setClave} placeholder="Contraseña" secreto onEnviar={() => void entrarConCorreo()} />
            {!!error && <Text style={{ color: colors.red, fontSize: 14, fontWeight: '600' }}>{error}</Text>}
            <Btn title="Entrar" icono="arrow-forward" cargando={trabajando} disabled={!usuario.trim() || !clave} onPress={() => void entrarConCorreo()} />
            <Btn title="Entrar con mi rostro" variante="ghost" icono="scan" onPress={() => setModo('rostro')} />
          </View>
        )}

        <View style={{ flex: 1 }} />
        <Pressable onPress={() => setEditarUrl((v) => !v)} style={{ marginTop: 28, alignSelf: 'center', flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <Ionicons name="server-outline" size={14} color={colors.dim} />
          <Text style={t.mono}>{serverUrl.replace(/^https?:\/\//, '')}</Text>
        </Pressable>
        {editarUrl && (
          <View style={{ marginTop: 10, gap: 10 }}>
            <Campo icono="link-outline" valor={url} onCambio={setUrl} placeholder="http://192.168.1.50:5107" teclado="url" />
            <Btn title="Guardar servidor" variante="soft" pequeno onPress={() => { void setServerUrl(url); setEditarUrl(false); }} />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Campo({
  icono,
  valor,
  onCambio,
  placeholder,
  secreto,
  teclado,
  onEnviar,
}: {
  icono: keyof typeof Ionicons.glyphMap;
  valor: string;
  onCambio: (v: string) => void;
  placeholder: string;
  secreto?: boolean;
  teclado?: 'email-address' | 'url';
  onEnviar?: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        height: 56,
        paddingHorizontal: 16,
        borderRadius: radius.m,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.card,
      }}
    >
      <Ionicons name={icono} size={19} color={colors.dim} />
      <TextInput
        value={valor}
        onChangeText={onCambio}
        placeholder={placeholder}
        placeholderTextColor={colors.dim}
        secureTextEntry={secreto}
        keyboardType={teclado}
        autoCapitalize="none"
        autoCorrect={false}
        onSubmitEditing={onEnviar}
        style={{ flex: 1, color: colors.text, fontSize: 16, fontWeight: '500', outlineStyle: 'none' } as object}
      />
    </View>
  );
}
