#include "basculas.h"

#include <Arduino.h>
#include <HX711.h>
#include <math.h>

#include "calibracion.h"
#include "config.h"
#include "logica/racion.h"

namespace basculas {

namespace {

struct Bascula {
  HX711 hx;
  int dout;
  int sck;
  float muestras[BASCULA_PROMEDIO];
  uint8_t siguiente = 0;
  uint8_t llenas = 0;
  uint32_t ultimaLecturaMs = 0;
};

Bascula platos[2];

bool indiceValido(int plato) { return plato == 1 || plato == 2; }

void reiniciarPromedio(Bascula& b) {
  b.siguiente = 0;
  b.llenas = 0;
}

}  // namespace

void iniciar() {
  platos[0].dout = PIN_HX711_PERRO_DOUT;
  platos[0].sck = PIN_HX711_PERRO_SCK;
  platos[1].dout = PIN_HX711_GATO_DOUT;
  platos[1].sck = PIN_HX711_GATO_SCK;
  for (Bascula& b : platos) {
    b.hx.begin(b.dout, b.sck);  // ganancia 128, canal A
  }
}

void atender() {
  const calibracion::Valores& cal = calibracion::actual();
  for (int i = 0; i < 2; i++) {
    Bascula& b = platos[i];
    if (!b.hx.is_ready()) continue;
    long crudo = b.hx.read();  // ya hay dato: no bloquea
    float escala = cal.escala[i] != 0 ? cal.escala[i] : ESCALA_PLATO_POR_DEFECTO;
    b.muestras[b.siguiente] = static_cast<float>(crudo - cal.tara[i]) / escala;
    b.siguiente = (b.siguiente + 1) % BASCULA_PROMEDIO;
    if (b.llenas < BASCULA_PROMEDIO) b.llenas++;
    b.ultimaLecturaMs = millis();
  }
}

float gramos(int plato) {
  if (!indiceValido(plato)) return NAN;
  const Bascula& b = platos[plato - 1];
  if (b.llenas == 0 || millis() - b.ultimaLecturaMs > BASCULA_MAX_SIN_LECTURA_MS) return NAN;
  float suma = 0;
  for (uint8_t i = 0; i < b.llenas; i++) suma += b.muestras[i];
  return suma / b.llenas;
}

double lecturaCruda(int plato, uint8_t muestras) {
  if (!indiceValido(plato) || muestras == 0) return NAN;
  HX711& hx = platos[plato - 1].hx;
  double suma = 0;
  for (uint8_t i = 0; i < muestras; i++) {
    if (!hx.wait_ready_timeout(500)) return NAN;
    suma += hx.read();
  }
  return suma / muestras;
}

bool tarar(int plato) {
  double crudo = lecturaCruda(plato, 15);
  if (isnan(crudo)) return false;
  calibracion::actual().tara[plato - 1] = static_cast<int32_t>(lround(crudo));
  reiniciarPromedio(platos[plato - 1]);
  return calibracion::guardar();
}

bool calibrar(int plato, float gramosPatron, float& factor) {
  double crudo = lecturaCruda(plato, 15);
  if (isnan(crudo)) return false;
  calibracion::Valores& cal = calibracion::actual();
  double f = logica::calibrarEscala(crudo, cal.tara[plato - 1], gramosPatron);
  if (f == 0) return false;
  factor = static_cast<float>(f);
  cal.escala[plato - 1] = factor;
  reiniciarPromedio(platos[plato - 1]);
  return calibracion::guardar();
}

}  // namespace basculas
