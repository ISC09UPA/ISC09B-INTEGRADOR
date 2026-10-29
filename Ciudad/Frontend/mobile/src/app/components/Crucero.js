import { View, Text, StyleSheet } from 'react-native';
import { colores, colorSemaforo } from '../constants/theme';

function buscar(carriles, nombre) {
  return carriles.find((c) => c.Nombre === nombre || c.nombre === nombre);
}

// Semáforo pequeño con 3 luces (rojo, amarillo, verde)
function LuzSemaforo({ color, estilo }) {
  return (
    <View style={[styles.luz, estilo]}>
      <View style={styles.luces}>
        <View style={[styles.foco, { backgroundColor: color === 'red' ? colores.rojo : '#3b2a30' }]} />
        <View style={[styles.foco, { backgroundColor: color === 'yellow' ? colores.amarillo : '#3d3a22' }]} />
        <View style={[styles.foco, { backgroundColor: color === 'green' ? colores.verde : '#1f3a2c' }]} />
      </View>
    </View>
  );
}

// Dibujo del cruce.
// modo="admin": muestra los 4 semáforos. modo="ciudadano": colorea cada calle según su tráfico.
export default function Crucero({ carriles = [], modo = 'admin' }) {
  const norte = buscar(carriles, 'Norte')?.semaforo || 'red';
  const sur = buscar(carriles, 'Sur')?.semaforo || 'red';
  const este = buscar(carriles, 'Este')?.semaforo || 'green';
  const oeste = buscar(carriles, 'Oeste')?.semaforo || 'green';

  // Para el mapa ciudadano se usa el nivel de densidad de cada calle
  const colorDensidad = (nombre) => {
    const nivel = buscar(carriles, nombre)?.nivelDensidad;
    if (nivel === 'Alta') return colores.rojo;
    if (nivel === 'Media') return colores.amarillo;
    return colores.verde;
  };

  return (
    <View style={styles.mapa}>
      <View style={styles.calleVertical} />
      <View style={styles.calleHorizontal} />

      <Text style={[styles.nombreCalle, { top: 8, left: '50%', marginLeft: 40 }]}>Av. Central</Text>
      <Text style={[styles.nombreCalle, { right: 8, top: '50%', marginTop: 38 }]}>Calle Reforma</Text>

      {modo === 'admin' ? (
        <>
          <LuzSemaforo color={norte} estilo={{ top: 14, left: 24 }} />
          <LuzSemaforo color={este} estilo={{ top: 14, right: 24 }} />
          <LuzSemaforo color={oeste} estilo={{ bottom: 14, left: 24 }} />
          <LuzSemaforo color={sur} estilo={{ bottom: 14, right: 24 }} />
        </>
      ) : (
        <>
          <View style={[styles.tramoV, { top: 0, backgroundColor: colorDensidad('Norte') }]} />
          <View style={[styles.tramoV, { bottom: 0, backgroundColor: colorDensidad('Sur') }]} />
          <View style={[styles.tramoH, { left: 0, backgroundColor: colorDensidad('Oeste') }]} />
          <View style={[styles.tramoH, { right: 0, backgroundColor: colorDensidad('Este') }]} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mapa: {
    height: 220,
    borderRadius: 14,
    backgroundColor: '#1b2a41',
    overflow: 'hidden',
  },
  calleVertical: {
    position: 'absolute',
    left: '50%',
    marginLeft: -32,
    width: 64,
    top: 0,
    bottom: 0,
    backgroundColor: '#334155',
  },
  calleHorizontal: {
    position: 'absolute',
    top: '50%',
    marginTop: -32,
    height: 64,
    left: 0,
    right: 0,
    backgroundColor: '#334155',
  },
  nombreCalle: { position: 'absolute', fontSize: 10, color: colores.gris },
  luz: {
    position: 'absolute',
    backgroundColor: '#0b1220',
    borderRadius: 8,
    padding: 4,
  },
  luces: { gap: 3 },
  foco: { width: 10, height: 10, borderRadius: 5 },
  tramoV: { position: 'absolute', left: '50%', marginLeft: -3, width: 6, height: 70, borderRadius: 3 },
  tramoH: { position: 'absolute', top: '50%', marginTop: -3, height: 6, width: 70, borderRadius: 3 },
});
