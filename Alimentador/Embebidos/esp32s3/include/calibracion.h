#pragma once

// Valores de calibración por plato/tolva (índice 0 = perro/tolva 1, 1 = gato/tolva 2).
// Se ajustan desde la consola serie y se guardan en LittleFS.

#include <stdint.h>

namespace calibracion {

struct Valores {
  float escala[2];          // cuentas del HX711 por gramo
  int32_t tara[2];          // lectura cruda con el plato vacío
  float flujo[2];           // g/s del dispensador
  float distanciaVacia[2];  // cm del ultrasónico con la tolva vacía
  float distanciaLlena[2];  // cm con la tolva llena
};

void cargar();
bool guardar();
Valores& actual();

}  // namespace calibracion
