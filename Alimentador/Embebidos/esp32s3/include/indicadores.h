#pragma once

// LED RGB WS2812 (J4, GPIO48), buzzer (J6, por Q1 desde el MCP23017) y botón (J5, MCP23017).
//   Azul parpadeando: sin conexión a MQTT      Verde fijo tenue: conectado
//   Amarillo: tolva baja                         Rojo: atasco o error de hardware
// Una pulsación corta del botón suena un bip y pide publicar el estado de inmediato.

#include <stdint.h>

namespace indicadores {

enum class Color : uint8_t { Apagado, Verde, Azul, Amarillo, Rojo };

void iniciar();
void atender();

void color(Color c);
// Bips no bloqueantes de `duracionMs` cada uno.
void pitar(uint8_t veces = 1, uint16_t duracionMs = 80);
// true una sola vez por cada pulsación del botón.
bool botonPresionado();

}  // namespace indicadores
