import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const C = {
  tinta: '#16302f',
  gris: '#5f7776',
  fondo: '#f4f8f8',
  linea: '#d5e0e0',
  verde: '#0f766e',
  verdeClaro: '#d9f0ec',
  ambar: '#b45309',
  ambarClaro: '#fdeccd',
};

type Props = {
  paciente?: string;
  hora?: string;
  doctor?: string;
  consultorio?: string;
  turno?: string;
  pacientesAntes?: number;
  onAbrirNfc?: () => void;
};

export default function CitaScreen({
  paciente = 'María López',
  hora = '9:30 a. m.',
  doctor = 'Dra. Ana Torres',
  consultorio = 'Consultorio 1',
  turno = 'A-018',
  pacientesAntes = 2,
  onAbrirNfc = () => {},
}: Props) {
  const minutos = (pacientesAntes + 1) * 8;

  return (
    <SafeAreaView style={styles.pantalla} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.contenido}>
        <Text style={styles.etiqueta}>Paciente · {paciente}</Text>
        <Text style={styles.titulo}>Mi cita</Text>

        <View style={[styles.tarjeta, { alignItems: 'center', paddingVertical: 24 }]}>
          <Text style={styles.etiqueta}>Tu turno</Text>
          <Text style={styles.turno}>{turno}</Text>
          <Text style={styles.aviso}>
            {pacientesAntes === 0 ? 'Eres el siguiente' : `Tienes ${pacientesAntes} paciente(s) antes`}
          </Text>
        </View>

        <View style={styles.tarjeta}>
          <Fila nombre="Cita de hoy" valor={hora} />
          <Fila nombre="Doctor" valor={doctor} />
          <Fila nombre="Consultorio" valor={consultorio} />
          <Fila nombre="Espera estimada" valor={`${minutos} min`} />
        </View>

        <Pressable style={styles.boton} onPress={onAbrirNfc}>
          <Text style={styles.textoBoton}>Abrir llave NFC</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Fila({ nombre, valor }: { nombre: string; valor: string }) {
  return (
    <View style={styles.fila}>
      <Text style={styles.etiqueta}>{nombre}</Text>
      <Text style={styles.valor}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: C.fondo },
  contenido: { padding: 16, gap: 12 },
  titulo: { fontSize: 26, fontWeight: '700', color: C.tinta },
  etiqueta: { fontSize: 13, color: C.gris },
  tarjeta: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: C.linea,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  turno: { fontSize: 56, fontWeight: '800', color: C.verde },
  aviso: {
    backgroundColor: C.ambarClaro,
    color: C.ambar,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 99,
    overflow: 'hidden',
  },
  fila: { flexDirection: 'row', justifyContent: 'space-between' },
  valor: { fontSize: 15, fontWeight: '700', color: C.tinta },
  boton: { backgroundColor: C.verde, borderRadius: 10, padding: 14, alignItems: 'center' },
  textoBoton: { color: '#fff', fontWeight: '700', fontSize: 16 },
});