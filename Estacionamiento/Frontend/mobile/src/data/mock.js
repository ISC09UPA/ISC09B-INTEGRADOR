// Datos de ejemplo. Después se reemplazan por la API / SignalR.
export const SLOTS = [
  { id: 1, status: 'ocupado' },
  { id: 2, status: 'libre' },
  { id: 3, status: 'mio' }, // tu auto
  { id: 4, status: 'libre' },
];

export const MY_PARKING = {
  slot: 3,
  plate: 'ABC-123-A',
  vehicle: 'Carro',
  day: 'Viernes 23 oct',
  entryTime: '09:42',
  exitTime: null, // null = pendiente
  elapsed: '1 h 18 min',
};

export const GATE_CLOSED = true;
