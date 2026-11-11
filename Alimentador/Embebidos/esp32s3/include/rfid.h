#pragma once

// Lector RFID opcional RDM6300 (125 kHz) en Serial1, solo RX. Sirve para distinguir dos
// mascotas de la misma especie con su llavero en el collar.

#include <stdint.h>

#include <string>

namespace rfid {

void iniciar();
void atender();
// Última etiqueta leída hace menos de `vigenciaMs`; vacío si no hay.
std::string ultima(uint32_t vigenciaMs);
// true una vez por cada etiqueta nueva (sirve para iniciar una visita).
bool hayLecturaNueva();

}  // namespace rfid
