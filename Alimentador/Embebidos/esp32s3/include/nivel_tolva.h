#pragma once

// Nivel de las tolvas con un VL53L0X en la tapa de cada una (ver tof.h).
// Cada NIVEL_PERIODO_MS toma NIVEL_MUESTRAS lecturas por tolva, una por vuelta del loop para no
// bloquear, y usa la mediana. Publica HOPPER_LOW al bajar de TOLVA_BAJA_PCT.

namespace nivel {

void iniciar();
void atender();

// % de llenado; NAN si el sensor no responde.
float porcentaje(int tolva);
// Última distancia medida en cm (para calibrar); NAN si no hay.
float distancia(int tolva);

// Guarda la distancia actual como tolva vacía o llena.
bool calibrarVacia(int tolva);
bool calibrarLlena(int tolva);

}  // namespace nivel
