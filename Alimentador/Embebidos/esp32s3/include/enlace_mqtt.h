#pragma once

// Conexión MQTT con la Pi (Mosquitto). Se suscribe a config, cmd y gateway/time; publica
// status retenido (con LWT { "online": false }) y manda visitas, eventos y resultados por una
// cola persistente que solo suelta cada mensaje al recibir su PUBACK.

#include <stddef.h>

#include <functional>
#include <string>

namespace mqtt {

using AlRecibir = std::function<void(const std::string& tema, const std::string& payload)>;
using AlConectar = std::function<void()>;

void iniciar(AlRecibir alRecibir, AlConectar alConectar);
void atender();
bool conectado();

// feeder/{id}/{sufijo} con QoS 1, pasando por la cola offline (visit, event, cmd/result).
bool encolar(const char* sufijo, const std::string& payload);
// feeder/{id}/status retenido con QoS 1. No se encola: solo importa el último.
bool publicarEstado(const std::string& json);

size_t pendientes();

}  // namespace mqtt
