// Datos de ejemplo del rol administrador. Después se reemplazan por la API / Azure Monitor.
export const ADMIN_STATS = {
  occupied: 2,
  total: 4,
  entriesToday: 14,
  avgStay: '1 h 22 m',
  topSlot: 'C2',
};

// Ocupación por hora (cajones ocupados de 4)
export const HOURLY = [
  { hour: 8, value: 1 },
  { hour: 9, value: 3 },
  { hour: 10, value: 4 },
  { hour: 11, value: 3 },
  { hour: 12, value: 2 },
  { hour: 13, value: 4 },
  { hour: 14, value: 3 },
  { hour: 15, value: 2 },
];

export const SLOT_USAGE = [
  { slot: 'C1', uses: 9 },
  { slot: 'C2', uses: 14 },
  { slot: 'C3', uses: 11 },
  { slot: 'C4', uses: 6 },
];

export const DENIED_ALERT = { time: '11:05', reason: 'Estacionamiento lleno' };

export const VEHICLE_TYPES = ['Carro', 'Camioneta', 'Moto', 'Camión'];

// status: 'dentro' | 'fuera' | 'baja'   plate: null = placa no legible
export const VEHICLES = [
  { id: 1, plate: 'ABC-123-A', type: 'Carro', status: 'dentro', slot: 3, entryTime: '09:42' },
  { id: 2, plate: null, type: 'Camioneta', status: 'dentro', slot: 1 },
  { id: 3, plate: 'XYZ-987-B', type: 'Moto', status: 'fuera', exitTime: '10:02' },
  { id: 4, plate: 'JKL-456-C', type: 'Camión', status: 'fuera', exitTime: '09:15' },
  { id: 5, plate: 'MNO-321-D', type: 'Carro', status: 'baja' },
];

// Lecturas simuladas de Computer Vision / Custom Vision para el escáner.
// Después se reemplazan por la foto real de la cámara y la respuesta de Azure.
export const SCAN_SAMPLES = [
  { plate: 'ABC-123-A', type: 'Carro', confidence: 96 },
  { plate: 'XYZ-987-B', type: 'Moto', confidence: 91 },
  { plate: 'PQR-555-E', type: 'Camioneta', confidence: 88 },
];
