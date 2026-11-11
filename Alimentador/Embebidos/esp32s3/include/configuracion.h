#pragma once

// Configuración recibida de la Pi (mascotas, horarios, zona horaria) y hora de la última
// comida de cada mascota. Ambas sobreviven reinicios en LittleFS.

#include <stdint.h>

#include <string>

#include "logica/protocolo.h"

namespace configuracion {

void cargar();
// Valida y aplica el JSON de feeder/{id}/config. Ignora la misma versión repetida (el mensaje
// es retenido y llega en cada reconexión).
bool aplicar(const std::string& json);
const logica::ConfigAlimentador& actual();

int64_t ultimaComida(int petId);
void registrarComida(int petId, int64_t momento);

// ¿Le toca comer ahora a la mascota según horarios e intervalo mínimo?
bool tieneComidaDisponible(int petId);

}  // namespace configuracion
