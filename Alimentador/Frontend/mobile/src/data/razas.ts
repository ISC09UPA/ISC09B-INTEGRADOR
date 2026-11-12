import type { Especie } from '@/api/types';

/** Ficha descriptiva de una raza (pantalla de resultado). */
export interface FichaRaza {
  alimentacion: string;
  habitat: string;
  tamano: string;
  esperanzaVida: string;
  temperamento: string;
  cuidados: string;
}

// El backend no guarda la raza; esta lista alimenta el selector del registro y la ficha del resultado.
export const RAZAS: Record<Especie, string[]> = {
  Perro: [
    'Mestizo',
    'Chihuahua',
    'Labrador retriever',
    'Golden retriever',
    'Pastor alemán',
    'Beagle',
    'Bulldog francés',
    'Poodle',
    'Schnauzer',
    'Pug',
    'Husky siberiano',
    'Yorkshire terrier',
  ],
  Gato: ['Mestizo', 'Gato persa', 'Siamés', 'Maine coon', 'Bengalí', 'Británico de pelo corto', 'Sphynx', 'Ragdoll'],
};

const FICHAS: Record<string, FichaRaza> = {
  'Labrador retriever': {
    alimentacion: 'Croquetas altas en proteína, 2 comidas al día',
    habitat: 'Interior con espacio y paseos diarios',
    tamano: 'Grande · 25 a 36 kg',
    esperanzaVida: '10 a 12 años',
    temperamento: 'Amigable, activo y sociable',
    cuidados: 'Ejercicio diario y control de peso',
  },
  'Golden retriever': {
    alimentacion: 'Croquetas para raza grande, 2 comidas al día',
    habitat: 'Casa con patio o paseos largos',
    tamano: 'Grande · 25 a 34 kg',
    esperanzaVida: '10 a 12 años',
    temperamento: 'Dócil, cariñoso y paciente',
    cuidados: 'Cepillado frecuente y ejercicio',
  },
  Chihuahua: {
    alimentacion: 'Croquetas pequeñas, 3 comidas al día',
    habitat: 'Interior, sensible al frío',
    tamano: 'Miniatura · 1.5 a 3 kg',
    esperanzaVida: '14 a 16 años',
    temperamento: 'Alerta, leal y valiente',
    cuidados: 'Higiene dental y abrigo en invierno',
  },
  'Pastor alemán': {
    alimentacion: 'Croquetas para raza grande, 2 comidas al día',
    habitat: 'Espacios amplios y actividad diaria',
    tamano: 'Grande · 22 a 40 kg',
    esperanzaVida: '9 a 13 años',
    temperamento: 'Inteligente, protector y obediente',
    cuidados: 'Entrenamiento y cuidado de cadera',
  },
  Beagle: {
    alimentacion: 'Porciones medidas, tiende a comer de más',
    habitat: 'Casa con paseos y olfateo',
    tamano: 'Mediano · 9 a 11 kg',
    esperanzaVida: '12 a 15 años',
    temperamento: 'Curioso, alegre y sociable',
    cuidados: 'Control de peso y limpieza de orejas',
  },
  'Gato persa': {
    alimentacion: 'Croquetas para pelo largo, 2 a 3 comidas al día',
    habitat: 'Interior tranquilo',
    tamano: 'Mediano · 3 a 5.5 kg',
    esperanzaVida: '12 a 17 años',
    temperamento: 'Tranquilo, dulce y casero',
    cuidados: 'Cepillado diario y limpieza de ojos',
  },
  Siamés: {
    alimentacion: 'Croquetas altas en proteína, 2 a 3 comidas al día',
    habitat: 'Interior con juego y compañía',
    tamano: 'Mediano · 3 a 5 kg',
    esperanzaVida: '15 a 20 años',
    temperamento: 'Vocal, activo y apegado',
    cuidados: 'Juego diario y revisiones dentales',
  },
};

const GENERICAS: Record<Especie, FichaRaza> = {
  Perro: {
    alimentacion: 'Croquetas según su peso, 2 a 3 comidas al día',
    habitat: 'Interior con paseos diarios',
    tamano: 'Variable según la raza',
    esperanzaVida: '10 a 14 años',
    temperamento: 'Sociable y leal',
    cuidados: 'Ejercicio diario y vacunas al día',
  },
  Gato: {
    alimentacion: 'Croquetas altas en proteína, 2 a 4 comidas al día',
    habitat: 'Interior con rascador y escondites',
    tamano: 'Mediano · 3.5 a 5.5 kg',
    esperanzaVida: '12 a 18 años',
    temperamento: 'Independiente y curioso',
    cuidados: 'Agua fresca y arenero limpio',
  },
};

export function fichaDeRaza(especie: Especie, raza?: string | null): FichaRaza {
  return (raza && FICHAS[raza]) || GENERICAS[especie];
}
