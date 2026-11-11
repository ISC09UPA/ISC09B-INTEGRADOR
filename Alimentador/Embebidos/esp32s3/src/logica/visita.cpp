#include "logica/visita.h"

#include <math.h>

namespace logica {

std::string uuidV4(const uint8_t aleatorios[16]) {
  uint8_t b[16];
  for (int i = 0; i < 16; i++) b[i] = aleatorios[i];
  b[6] = static_cast<uint8_t>((b[6] & 0x0F) | 0x40);  // versión 4
  b[8] = static_cast<uint8_t>((b[8] & 0x3F) | 0x80);  // variante RFC 4122
  std::string hex = bytesAHex(b, 16);
  return hex.substr(0, 8) + "-" + hex.substr(8, 4) + "-" + hex.substr(12, 4) + "-" +
         hex.substr(16, 4) + "-" + hex.substr(20, 12);
}

int platoDeVisita(Clase clase, double cambioPerroG, double cambioGatoG) {
  int tolva = tolvaDeClase(clase);
  if (tolva != 0) return tolva;
  double perro = isnan(cambioPerroG) ? 0 : fabs(cambioPerroG);
  double gato = isnan(cambioGatoG) ? 0 : fabs(cambioGatoG);
  return gato > perro ? TOLVA_GATO : TOLVA_PERRO;
}

bool visitaTermino(uint32_t ahoraMs, uint32_t inicioMs, uint32_t ultimaPresenciaMs,
                   uint32_t ausenciaMs, uint32_t maximoMs) {
  if (ahoraMs - inicioMs >= maximoMs) return true;
  return ahoraMs - ultimaPresenciaMs >= ausenciaMs;
}

bool debePublicarVisita(Clase clase, double dispensadoG, double cambioPlatoG, double minimoG) {
  if (clase != Clase::Nada) return true;
  if (dispensadoG > 0) return true;
  return !isnan(cambioPlatoG) && fabs(cambioPlatoG) >= minimoG;
}

}  // namespace logica
