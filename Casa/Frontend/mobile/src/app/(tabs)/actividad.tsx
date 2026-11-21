import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Burbuja, Card, Label, Screen, Seccion, Titulo } from '@/components/ui';
import { useCasa } from '@/lib/casa';
import { fotoCercana, useFotos } from '@/lib/fotos';
import { diaTitulo, hace, horaCorta, parseHora, tipoDe, zonaDe } from '@/lib/format';
import { colors, t } from '@/lib/theme';
import { Foto, Registro } from '@/lib/types';

type Item = Registro & { origen: 'alerta' | 'acceso' };

const ESTILO = {
  ok: { icono: 'checkmark' as const, color: colors.lime, bg: colors.limeBg },
  mov: { icono: 'pulse' as const, color: colors.red, bg: colors.redBg },
  warn: { icono: 'alert' as const, color: colors.amber, bg: colors.amberBg },
};

export default function Actividad() {
  const { historial, alertas } = useCasa();
  const { fotos, cargando, error, recargar } = useFotos(60);
  const [vista, setVista] = useState<'linea' | 'fotos'>('linea');
  const [abierta, setAbierta] = useState<Foto | null>(null);

  const dias = useMemo(() => {
    const items: Item[] = [
      ...historial.map((r) => ({ ...r, origen: 'acceso' as const })),
      ...alertas.map((r) => ({ ...r, origen: 'alerta' as const })),
    ].sort((a, b) => parseHora(b.hora).getTime() - parseHora(a.hora).getTime());
    const grupos: { dia: string; items: Item[] }[] = [];
    for (const it of items) {
      const dia = diaTitulo(it.hora);
      const g = grupos[grupos.length - 1];
      if (g && g.dia === dia) g.items.push(it);
      else grupos.push({ dia, items: [it] });
    }
    return grupos;
  }, [historial, alertas]);

  return (
    <Screen>
      <Titulo kicker="Registro" derecha={<Pressable onPress={() => void recargar()} hitSlop={10}><Ionicons name="refresh" size={22} color={colors.mute} /></Pressable>}>
        Actividad
      </Titulo>

      <View style={{ flexDirection: 'row', padding: 4, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, marginBottom: 18 }}>
        {(['linea', 'fotos'] as const).map((v) => (
          <Pressable key={v} onPress={() => setVista(v)} style={{ flex: 1, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: vista === v ? colors.card2 : 'transparent' }}>
            <Text style={{ color: vista === v ? colors.text : colors.mute, fontWeight: '800', fontSize: 13 }}>{v === 'linea' ? 'Línea de tiempo' : `Fotos · ${fotos.length}`}</Text>
          </Pressable>
        ))}
      </View>

      {vista === 'linea' ? (
        dias.length === 0 ? (
          <Vacio texto="Todavía no hay actividad. Cuando alguien llegue a tu puerta aparecerá aquí." />
        ) : (
          dias.map((g) => (
            <View key={g.dia}>
              <Seccion>{g.dia}</Seccion>
              {g.items.map((it, i) => {
                const tipo = tipoDe(it.mensaje);
                const e = ESTILO[tipo];
                const foto = fotoCercana(fotos, it.hora);
                const titulo = tipo === 'warn' && it.origen === 'acceso' ? 'Rostro no reconocido' : tipo === 'mov' ? `Movimiento en ${zonaDe(it.mensaje) ?? 'la casa'}` : it.mensaje;
                return (
                  <Card key={`${it.origen}-${it.hora}-${i}`} style={{ paddingVertical: 12, marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Burbuja icono={e.icono} color={e.color} bg={e.bg} size={42} />
                      <View style={{ flex: 1 }}>
                        <Text style={t.body} numberOfLines={2}>{titulo}</Text>
                        <Text style={t.mute}>{horaCorta(it.hora)} · {hace(it.hora)}</Text>
                      </View>
                      {foto ? (
                        <Pressable onPress={() => setAbierta(foto)}>
                          <Image source={{ uri: foto.url }} style={{ width: 54, height: 54, borderRadius: 14, backgroundColor: colors.card2 }} />
                        </Pressable>
                      ) : null}
                    </View>
                  </Card>
                );
              })}
            </View>
          ))
        )
      ) : cargando ? (
        <ActivityIndicator color={colors.lime} style={{ marginTop: 40 }} />
      ) : fotos.length === 0 ? (
        <Vacio texto={error ?? 'Aún no hay fotos. La Raspberry las sube a Azure Blob Storage cuando alguien se acerca a la puerta.'} />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {fotos.map((f) => {
            const ok = f.resultado === 'autorizado';
            return (
              <Pressable key={f.nombre} onPress={() => setAbierta(f)} style={{ width: '47.5%' }}>
                <View style={{ borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: ok ? colors.limeLine : colors.redLine, backgroundColor: colors.card }}>
                  <Image source={{ uri: f.url }} style={{ width: '100%', aspectRatio: 1, backgroundColor: colors.card2 }} resizeMode="cover" />
                  <View style={{ padding: 10 }}>
                    <Label style={{ color: ok ? colors.lime : colors.red }}>{ok ? 'Autorizado' : 'Denegado'}</Label>
                    <Text style={[t.body, { fontSize: 14, marginTop: 2 }]} numberOfLines={1}>{ok ? f.etiqueta : f.zona}</Text>
                    <Text style={t.mute}>{horaCorta(f.hora)} · {diaTitulo(f.hora)}</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      <FotoModal foto={abierta} onCerrar={() => setAbierta(null)} />
    </Screen>
  );
}

function Vacio({ texto }: { texto: string }) {
  return (
    <Card style={{ alignItems: 'center', paddingVertical: 36, gap: 12 }}>
      <Ionicons name="moon-outline" size={34} color={colors.dim} />
      <Text style={[t.mute, { textAlign: 'center', lineHeight: 20 }]}>{texto}</Text>
    </Card>
  );
}

function FotoModal({ foto, onCerrar }: { foto: Foto | null; onCerrar: () => void }) {
  const insets = useSafeAreaInsets();
  if (!foto) return null;
  const ok = foto.resultado === 'autorizado';
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onCerrar}>
      <Pressable onPress={onCerrar} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', padding: 20, paddingTop: insets.top + 20 }}>
        <Image source={{ uri: foto.url }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 24 }} resizeMode="contain" />
        <View style={{ marginTop: 18, alignItems: 'center', gap: 4 }}>
          <Label style={{ color: ok ? colors.lime : colors.red }}>{ok ? 'Acceso autorizado' : 'Acceso denegado'}</Label>
          <Text style={t.h2}>{ok ? foto.etiqueta : 'Rostro no reconocido'}</Text>
          <Text style={t.mute}>{foto.zona} · {horaCorta(foto.hora)} · {diaTitulo(foto.hora)}</Text>
        </View>
      </Pressable>
    </Modal>
  );
}
