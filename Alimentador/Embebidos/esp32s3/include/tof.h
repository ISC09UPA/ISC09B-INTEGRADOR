#pragma once

// Tres sensores de distancia VL53L0X en el bus I2C:
//   Presencia (J19): frente a los platos, detecta a la mascota. No tiene XSHUT en la PCB.
//   Nivel 1 y 2 (J20/J21): en la tapa de cada tolva, miden la distancia al alimento.
// Todos arrancan en la dirección 0x29, así que al iniciar se encienden uno por uno con los XSHUT
// del MCP23017 y se les asigna una dirección propia.

#include <stdint.h>

namespace tof {

enum Sensor : uint8_t { Presencia = 0, Nivel1 = 1, Nivel2 = 2 };

// Requiere expansor::iniciar() antes (para los XSHUT).
void iniciar();
// Lee sin bloquear los sensores que tengan medición lista.
void atender();

bool disponible(Sensor s);
// Última distancia en mm; 0 si el sensor no responde o está fuera de rango.
uint16_t distanciaMm(Sensor s);
// Milisegundos desde la última lectura válida del sensor.
uint32_t edadMs(Sensor s);

}  // namespace tof
