#pragma once

// Arma los mensajes del protocolo y los manda por la cola MQTT.

#include <string>

#include "logica/protocolo.h"

namespace publicador {

std::string nuevoEventId();

void visita(const logica::Visita& visita);
void evento(logica::TipoEvento tipo, int tolva, const std::string& detalle);
// dispensedG = NAN para comandos que no dispensan.
void resultado(long id, bool ok, double dispensedG, const std::string& error);

}  // namespace publicador
