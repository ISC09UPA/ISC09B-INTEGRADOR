import { useSyncExternalStore } from 'react';

// Un solo reloj compartido para que las fechas relativas ("hace 5 min") se mantengan al día.
let ahora = Date.now();
const oyentes = new Set<() => void>();
let intervalo: number | undefined;

function suscribir(avisar: () => void) {
  oyentes.add(avisar);
  if (intervalo === undefined) {
    intervalo = window.setInterval(() => {
      ahora = Date.now();
      oyentes.forEach((o) => o());
    }, 30_000);
  }
  return () => {
    oyentes.delete(avisar);
    if (oyentes.size === 0 && intervalo !== undefined) {
      window.clearInterval(intervalo);
      intervalo = undefined;
    }
  };
}

export function useAhora(): number {
  return useSyncExternalStore(suscribir, () => ahora, () => ahora);
}
