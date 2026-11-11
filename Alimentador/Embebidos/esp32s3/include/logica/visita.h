#pragma once

// Reglas de una visita al plato: cuándo termina, a qué plato corresponde y si se publica.

#include <stdint.h>

#include <string>

#include "logica/protocolo.h"

namespace logica {

// UUID versión 4 a partir de 16 bytes aleatorios (esp_random en el ESP32).
std::string uuidV4(const uint8_t aleatorios[16]);

// Plato de la visita: el de la especie reconocida; para Nada, el que más cambió.
int platoDeVisita(Clase clase, double cambioPerroG, double cambioGatoG);

// La visita termina tras `ausenciaMs` sin presencia o al llegar a la duración máxima.
bool visitaTermino(uint32_t ahoraMs, uint32_t inicioMs, uint32_t ultimaPresenciaMs,
                   uint32_t ausenciaMs, uint32_t maximoMs);

// Las visitas "Nada" sin dispensado ni cambio en el plato son falsas alarmas del sensor de
// presencia y no se publican.
bool debePublicarVisita(Clase clase, double dispensadoG, double cambioPlatoG, double minimoG);

}  // namespace logica
