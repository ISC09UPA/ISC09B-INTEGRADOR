import React, { useState } from 'react';
import { View, Text, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme';
import { CAMERA_URL } from '../config';
import { S, Btn } from '../components';

export default function Camara() {
  const [err, setErr] = useState(false);
  const [k, setK] = useState(0);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, padding: 16 }}>
      <View style={{ height: 270, borderRadius: 20, overflow: 'hidden', backgroundColor: '#0B141A' }}>
        {err ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <Ionicons name="videocam-off-outline" size={44} color="#7F93A0" />
            <Text style={{ color: '#fff', fontWeight: '700', marginTop: 8 }}>Sin señal de la cámara</Text>
            <Text style={{ color: '#9FB2BE', textAlign: 'center', marginTop: 4 }}>Revisa que la Raspberry esté encendida y que CAMERA_URL en api.js sea correcta.</Text>
          </View>
        ) : (
          Platform.OS === 'web' ? (
            React.createElement('img', { key: k, src: CAMERA_URL, onError: () => setErr(true), style: { width: '100%', height: '100%', objectFit: 'cover' } })
          ) : (
          <WebView key={k} source={{ uri: CAMERA_URL }} onError={() => setErr(true)} onHttpError={() => setErr(true)} style={{ flex: 1, backgroundColor: '#0B141A' }} />
          )
        )}
        {!err && (
          <View style={{ position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,.55)', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.red, marginRight: 6 }} />
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>En vivo</Text>
          </View>
        )}
      </View>
      <Text style={S.h}>Cámara del almacén</Text>
      <Text style={S.sub}>Vigila los anaqueles y la zona de entrada y salida de mercancía.</Text>
      <Btn t="Reconectar cámara" kind="ghost" onPress={() => { setErr(false); setK(k + 1); }} />
    </View>
  );
}
