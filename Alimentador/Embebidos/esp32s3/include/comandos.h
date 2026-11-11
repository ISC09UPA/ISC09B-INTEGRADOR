#pragma once

// Comandos de feeder/{id}/cmd: dispense y ota. Cada uno se contesta en cmd/result.
// Se ejecutan en orden, uno a la vez, cuando el dispensador está libre.

#include <string>

namespace comandos {

void recibir(const std::string& payload);
void atender();

}  // namespace comandos
