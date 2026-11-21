import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Btn, Burbuja, Card, Label, Screen, Seccion, Titulo } from '@/components/ui';
import { api, mensajeDe } from '@/lib/api';
import { useCasa } from '@/lib/casa';
import { confirmar } from '@/lib/confirmar';
import { useServicios } from '@/lib/fotos';
import { useSession } from '@/lib/session';
import { colors, radius, t } from '@/lib/theme';
import { Diagnostico } from '@/lib/types';

export default function Ajustes() {
  const { nombre, serverUrl, setServerUrl, signOut } = useSession();
  const c = useCasa();
  const { estado, recargar } = useServicios();
  const [url, setUrl] = useState(serverUrl);
  const [nueva, setNueva] = useState('');
  const [diag, setDiag] = useState<Diagnostico | null>(null);
  const [probando, setProbando] = useState<'' | 'todo' | 'correo'>('');
  const [errorDiag, setErrorDiag] = useState('');

  async function probar(correo: boolean) {
    setProbando(correo ? 'correo' : 'todo');
    setErrorDiag('');
    try {
      setDiag(await api.get<Diagnostico>(`/api/diagnostico${correo ? '?correo=true' : ''}`, 30000));
      void recargar();
    } catch (e) {
      setErrorDiag(mensajeDe(e));
    } finally {
      setProbando('');
    }
  }

  const servicios: { clave: keyof Diagnostico; nombre: string; icono: keyof typeof Ionicons.glyphMap; ok: boolean | undefined }[] = [
    { clave: 'customVision', nombre: 'Reconocimiento facial', icono: 'scan', ok: estado?.customVision },
    { clave: 'blob', nombre: 'Fotos en Blob Storage', icono: 'images', ok: estado?.blob },
    { clave: 'correo', nombre: 'Correo de alertas', icono: 'mail', ok: estado?.correo },
    { clave: 'mapas', nombre: 'Azure Maps', icono: 'map', ok: estado?.mapas },
    { clave: 'raspberry', nombre: 'Raspberry Pi', icono: 'hardware-chip', ok: estado?.raspberry },
  ];

  return (
    <Screen>
      <Titulo kicker="Cuenta y casa">Ajustes</Titulo>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 54, height: 54, borderRadius: 20, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#0A1200', fontSize: 24, fontWeight: '800' }}>{(nombre || 'C').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={t.h2}>{nombre || 'Sesión iniciada'}</Text>
            <Text style={t.mono}>{serverUrl.replace(/^https?:\/\//, '')}</Text>
          </View>
        </View>
      </Card>

      <Seccion>Conexiones</Seccion>
      <Card>
        {servicios.map((s, i) => {
          const d = diag?.[s.clave];
          const ok = d ? d.ok : s.ok;
          return (
            <View key={s.clave} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderColor: colors.lineSoft }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Burbuja icono={s.icono} color={ok ? colors.lime : colors.dim} bg={ok ? colors.limeBg : colors.card2} size={36} />
                <Text style={[t.body, { flex: 1 }]}>{s.nombre}</Text>
                <Text style={{ color: ok ? colors.lime : colors.amber, fontSize: 11, fontWeight: '800', letterSpacing: 1.3 }}>
                  {ok === undefined ? '…' : ok ? 'LISTO' : 'REVISAR'}
                </Text>
              </View>
              {d && <Text style={[t.mute, { marginTop: 6, marginLeft: 48 }]}>{d.mensaje}</Text>}
            </View>
          );
        })}
        {!!errorDiag && <Text style={{ color: colors.red, marginTop: 8 }}>{errorDiag}</Text>}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <Btn title="Probar todo" variante="soft" pequeno icono="pulse" style={{ flex: 1 }} cargando={probando === 'todo'} onPress={() => void probar(false)} />
          <Btn title="Correo de prueba" variante="soft" pequeno icono="mail" style={{ flex: 1 }} cargando={probando === 'correo'} onPress={() => void probar(true)} />
        </View>
      </Card>

      <Seccion derecha={<Text style={t.mono}>{c.personas.length} personas</Text>}>Personas reconocidas</Seccion>
      <Card>
        <Text style={[t.mute, { marginBottom: 10, lineHeight: 19 }]}>
          Son las etiquetas de tu proyecto de Custom Vision. Quien Azure reconozca puede abrir la puerta y entrar a esta app.
        </Text>
        {c.personas.map((p, i) => (
          <View key={p} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderColor: colors.lineSoft }}>
            <View style={{ width: 36, height: 36, borderRadius: 13, backgroundColor: colors.card2, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.lime, fontWeight: '800' }}>{p.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={[t.body, { flex: 1 }]}>{p}</Text>
            <Pressable
              hitSlop={10}
              onPress={() => confirmar({ titulo: 'Quitar acceso', mensaje: `¿Quitar a ${p} de las personas reconocidas?`, confirmarTexto: 'Quitar', destructivo: true, onConfirmar: () => void c.quitarPersona(p) })}
            >
              <Ionicons name="trash-outline" size={19} color={colors.dim} />
            </Pressable>
          </View>
        ))}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <View style={{ flex: 1, height: 46, borderRadius: radius.s, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg2, justifyContent: 'center', paddingHorizontal: 14 }}>
            <TextInput
              value={nueva}
              onChangeText={setNueva}
              placeholder="Nombre igual que en Azure"
              placeholderTextColor={colors.dim}
              style={{ color: colors.text, fontSize: 15, outlineStyle: 'none' } as object}
              onSubmitEditing={() => { if (nueva.trim()) { void c.addPersona(nueva.trim()); setNueva(''); } }}
            />
          </View>
          <Btn title="Agregar" pequeno disabled={!nueva.trim()} onPress={() => { void c.addPersona(nueva.trim()); setNueva(''); }} />
        </View>
      </Card>

      <Seccion>Servidor</Seccion>
      <Card>
        <Label style={{ marginBottom: 8 }}>Dirección del backend</Label>
        <View style={{ height: 46, borderRadius: radius.s, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg2, justifyContent: 'center', paddingHorizontal: 14 }}>
          <TextInput value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} placeholderTextColor={colors.dim} style={{ color: colors.text, fontSize: 15, outlineStyle: 'none' } as object} />
        </View>
        <Btn title="Guardar" variante="soft" pequeno style={{ marginTop: 10 }} disabled={url.trim() === serverUrl} onPress={() => void setServerUrl(url)} />
      </Card>

      <Btn title="Cerrar sesión" variante="ghost" icono="log-out-outline" onPress={() => confirmar({ titulo: 'Cerrar sesión', mensaje: '¿Quieres salir de CasaLink?', confirmarTexto: 'Salir', destructivo: true, onConfirmar: () => void signOut() })} />
    </Screen>
  );
}
