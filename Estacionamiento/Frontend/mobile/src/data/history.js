// Datos de ejemplo. Después se reemplazan por la API.
export const HISTORY_STATS = {
  visits: 12,
  month: 'oct',
  avgTime: '1:35',
  favoriteSlot: 'C2',
};

// group: 'semana' | 'mes' | 'antes'   (end: null = en curso)
export const HISTORY = [
  { id: 1, day: '23', dow: 'VIE', start: '09:42', end: null, slot: 3, plate: 'ABC-123-A', duration: null, group: 'semana' },
  { id: 2, day: '22', dow: 'JUE', start: '08:15', end: '10:02', slot: 2, plate: 'ABC-123-A', duration: '1 h 47 min', group: 'semana' },
  { id: 3, day: '21', dow: 'MIÉ', start: '12:30', end: '13:40', slot: 2, plate: 'ABC-123-A', duration: '1 h 10 min', group: 'semana' },
  { id: 4, day: '20', dow: 'MAR', start: '07:58', end: '09:51', slot: 4, plate: 'ABC-123-A', duration: '1 h 53 min', group: 'semana' },
  { id: 5, day: '19', dow: 'LUN', start: '10:05', end: '11:20', slot: 1, plate: 'ABC-123-A', duration: '1 h 15 min', group: 'semana' },
  { id: 6, day: '16', dow: 'VIE', start: '09:10', end: '10:55', slot: 2, plate: 'ABC-123-A', duration: '1 h 45 min', group: 'mes' },
  { id: 7, day: '15', dow: 'JUE', start: '14:00', end: '15:20', slot: 3, plate: 'ABC-123-A', duration: '1 h 20 min', group: 'mes' },
  { id: 8, day: '14', dow: 'MIÉ', start: '08:40', end: '10:30', slot: 2, plate: 'ABC-123-A', duration: '1 h 50 min', group: 'mes' },
  { id: 9, day: '29', dow: 'MAR', start: '11:15', end: '12:35', slot: 4, plate: 'ABC-123-A', duration: '1 h 20 min', group: 'antes' },
  { id: 10, day: '28', dow: 'LUN', start: '07:50', end: '09:40', slot: 2, plate: 'ABC-123-A', duration: '1 h 50 min', group: 'antes' },
];
