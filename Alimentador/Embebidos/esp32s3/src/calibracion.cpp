#include "calibracion.h"

#include <Arduino.h>
#include <ArduinoJson.h>

#include "almacenamiento.h"
#include "config.h"

namespace calibracion {

namespace {

Valores valores = {
    {ESCALA_PLATO_POR_DEFECTO, ESCALA_PLATO_POR_DEFECTO},
    {0, 0},
    {FLUJO_POR_DEFECTO_G_S, FLUJO_POR_DEFECTO_G_S},
    {TOLVA_DISTANCIA_VACIA_CM, TOLVA_DISTANCIA_VACIA_CM},
    {TOLVA_DISTANCIA_LLENA_CM, TOLVA_DISTANCIA_LLENA_CM},
};

template <typename T>
void leerPar(JsonVariantConst arreglo, T destino[2]) {
  for (int i = 0; i < 2; i++) {
    if (arreglo[i].is<T>()) destino[i] = arreglo[i].as<T>();
  }
}

}  // namespace

void cargar() {
  std::string texto;
  if (!almacenamiento::leer(almacenamiento::RUTA_CALIBRACION, texto)) {
    log_i("Sin calibracion guardada, se usan los valores de config.h");
    return;
  }
  JsonDocument doc;
  if (deserializeJson(doc, texto)) {
    log_w("calibracion.json invalido, se ignora");
    return;
  }
  leerPar(doc["escala"], valores.escala);
  leerPar(doc["tara"], valores.tara);
  leerPar(doc["flujo"], valores.flujo);
  leerPar(doc["distanciaVacia"], valores.distanciaVacia);
  leerPar(doc["distanciaLlena"], valores.distanciaLlena);
}

bool guardar() {
  JsonDocument doc;
  for (int i = 0; i < 2; i++) {
    doc["escala"][i] = valores.escala[i];
    doc["tara"][i] = valores.tara[i];
    doc["flujo"][i] = valores.flujo[i];
    doc["distanciaVacia"][i] = valores.distanciaVacia[i];
    doc["distanciaLlena"][i] = valores.distanciaLlena[i];
  }
  std::string texto;
  serializeJson(doc, texto);
  return almacenamiento::escribirAtomico(almacenamiento::RUTA_CALIBRACION, texto);
}

Valores& actual() { return valores; }

}  // namespace calibracion
