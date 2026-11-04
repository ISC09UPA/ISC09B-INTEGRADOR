import { useState } from 'react';
import { View, Text, Image, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Pantalla from '../components/Pantalla';
import Encabezado from '../components/Encabezado';
import Tarjeta from '../components/Tarjeta';
import Etiqueta from '../components/Etiqueta';
import Boton from '../components/Boton';
import { clasificarFoto, createReporte } from '../services/reportesService';
import { colores } from '../constants/theme';

const TIPOS = ['Vehículo mal estacionado', 'Accidente', 'Obstrucción'];

export default function ReportarScreen({ navigation }) {
  const [foto, setFoto] = useState(null);       // uri de la foto tomada
  const [clasif, setClasif] = useState(null);   // { tipo, confianza } que regresa la API
  const [tipo, setTipo] = useState('Obstrucción');
  const [comentario, setComentario] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function tomarFoto() {
    try {
      const permiso = await ImagePicker.requestCameraPermissionsAsync();
      if (!permiso.granted) {
        setError('Necesitamos permiso para usar la cámara');
        return;
      }

      const resultado = await ImagePicker.launchCameraAsync({ quality: 0.5 });
      if (resultado.canceled) return;

      setFoto(resultado.assets[0].uri);
      setError('');

      // La API clasifica el vehículo (por ahora simulado; luego Azure Custom Vision)
      const datos = await clasificarFoto();
      setClasif(datos);
    } catch (err) {
      setError('No se pudo tomar o clasificar la foto');
    }
  }

  function quitarFoto() {
    setFoto(null);
    setClasif(null);
  }

  async function enviarReporte() {
    if (!foto) {
      setError('Toma una foto del incidente');
      return;
    }
    try {
      setEnviando(true);
      const creado = await createReporte({
        titulo: tipo,
        clasificacion: clasif ? clasif.tipo : 'Sin clasificar',
        confianza: clasif ? clasif.confianza : 0,
        ubicacion: 'Av. Central × Calle Reforma',
        comentario,
      });

      quitarFoto();
      setComentario('');
      setError('');
      navigation.navigate('Exito', { folio: creado.folio, hora: creado.hora });
    } catch (err) {
      setError('No se pudo enviar el reporte');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Pantalla error={error}>
      <Encabezado titulo="Reportar incidente" subtitulo="Ayuda a mejorar tu ciudad" />

      <Tarjeta style={styles.captura}>
        {foto ? (
          <>
            <Image source={{ uri: foto }} style={styles.preview} />
            <TouchableOpacity onPress={quitarFoto} style={{ marginTop: 10 }}>
              <Text style={styles.link}>Volver a tomar</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.iconoCamara}>
              <Ionicons name="camera-outline" size={30} color={colores.azulClaro} />
            </View>
            <Text style={styles.h3}>Tomar una foto</Text>
            <Text style={styles.sub}>Enfoca el vehículo o incidente</Text>
            <View style={{ width: '100%', marginTop: 14 }}>
              <Boton titulo="Usar cámara" onPress={tomarFoto} />
            </View>
          </>
        )}
      </Tarjeta>

      {clasif && (
        <Tarjeta style={styles.resultadoIA}>
          <View style={styles.icono}>
            <Ionicons name="sparkles-outline" size={20} color={colores.azulClaro} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sub}>Clasificación por IA</Text>
            <Text style={styles.h3}>{clasif.tipo}</Text>
            <Text style={styles.sub}>{clasif.confianza}% de confianza</Text>
          </View>
          <Etiqueta texto="Detectado" tono="green" />
        </Tarjeta>
      )}

      <Text style={styles.label}>Tipo de incidente</Text>
      <View style={styles.tipos}>
        {TIPOS.map((t) => (
          <TouchableOpacity key={t} style={[styles.tipo, tipo === t && styles.tipoActivo]} onPress={() => setTipo(t)}>
            <Text style={[styles.tipoTexto, tipo === t && { color: colores.texto }]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>
        Comentario <Text style={styles.opcional}>Opcional</Text>
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Agrega detalles que puedan ayudar…"
        placeholderTextColor={colores.gris}
        value={comentario}
        onChangeText={setComentario}
        multiline
      />

      <View style={{ marginTop: 18 }}>
        <Boton titulo="Enviar reporte" onPress={enviarReporte} cargando={enviando} />
      </View>
      <Text style={styles.anonimo}>Tu reporte se comparte de forma anónima</Text>
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  captura: { alignItems: 'center', paddingVertical: 24 },
  iconoCamara: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  preview: { width: '100%', height: 190, borderRadius: 12 },
  h3: { color: colores.texto, fontWeight: '700', fontSize: 15 },
  sub: { color: colores.gris, fontSize: 12, marginTop: 2 },
  link: { color: colores.azulClaro, fontWeight: '700', fontSize: 13 },
  resultadoIA: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icono: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { color: colores.gris, fontSize: 13, fontWeight: '600', marginTop: 8, marginBottom: 8 },
  opcional: { fontSize: 11, fontWeight: '400' },
  tipos: { gap: 8 },
  tipo: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colores.linea,
    backgroundColor: colores.tarjeta,
  },
  tipoActivo: { borderColor: colores.azul, backgroundColor: '#1e3a5f' },
  tipoTexto: { color: colores.gris, fontWeight: '600', fontSize: 14 },
  input: {
    minHeight: 90,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    backgroundColor: colores.tarjeta,
    color: colores.texto,
  },
  anonimo: { textAlign: 'center', color: colores.gris, fontSize: 11, marginTop: 14 },
});
