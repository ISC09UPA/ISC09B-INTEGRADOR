#include "nivel_tolva.h"

#include <Arduino.h>
#include <math.h>

#include "calibracion.h"
#include "config.h"
#include "logica/sensores.h"
#include "publicador.h"
#include "tof.h"

namespace nivel {

namespace {

constexpr uint32_t ENTRE_MUESTRAS_MS = 60;  // el VL53L0X entrega una medición cada 50 ms

struct Tolva {
  tof::Sensor sensor;
  double muestras[NIVEL_MUESTRAS];
  float distanciaCm = NAN;
  float porcentaje = NAN;
  logica::AlarmaNivel alarma{TOLVA_BAJA_PCT, TOLVA_REARME_PCT};
};

Tolva tolvas[2];
uint32_t inicioRondaMs = 0;
uint32_t ultimoDisparoMs = 0;
uint8_t muestraActual = 0;
bool midiendo = false;

double medirCm(tof::Sensor sensor) {
  uint16_t mm = tof::distanciaMm(sensor);
  return mm == 0 ? NAN : mm / 10.0;
}

void terminarRonda() {
  const calibracion::Valores& cal = calibracion::actual();
  for (int i = 0; i < 2; i++) {
    Tolva& t = tolvas[i];
    t.distanciaCm = static_cast<float>(logica::mediana(t.muestras, NIVEL_MUESTRAS));
    t.porcentaje = static_cast<float>(
        logica::porcentajeTolva(t.distanciaCm, cal.distanciaVacia[i], cal.distanciaLlena[i]));
    if (t.alarma.actualizar(t.porcentaje)) {
      char detalle[48];
      snprintf(detalle, sizeof(detalle), "nivel %.0f%%", t.porcentaje);
      publicador::evento(logica::TipoEvento::TolvaBaja, i + 1, detalle);
    }
  }
}

}  // namespace

void iniciar() {
  tolvas[0].sensor = tof::Nivel1;
  tolvas[1].sensor = tof::Nivel2;
  inicioRondaMs = millis() - NIVEL_PERIODO_MS;  // primera ronda de inmediato
}

void atender() {
  uint32_t ahora = millis();
  if (!midiendo) {
    if (ahora - inicioRondaMs < NIVEL_PERIODO_MS) return;
    midiendo = true;
    muestraActual = 0;
    inicioRondaMs = ahora;
  }
  if (ahora - ultimoDisparoMs < ENTRE_MUESTRAS_MS) return;
  ultimoDisparoMs = ahora;

  // Alterna tolvas: muestra 0 perro, 1 gato, 2 perro...
  int tolva = muestraActual % 2;
  tolvas[tolva].muestras[muestraActual / 2] = medirCm(tolvas[tolva].sensor);
  muestraActual++;
  if (muestraActual >= NIVEL_MUESTRAS * 2) {
    midiendo = false;
    terminarRonda();
  }
}

float porcentaje(int tolva) {
  return (tolva == 1 || tolva == 2) ? tolvas[tolva - 1].porcentaje : NAN;
}

float distancia(int tolva) {
  return (tolva == 1 || tolva == 2) ? tolvas[tolva - 1].distanciaCm : NAN;
}

bool calibrarVacia(int tolva) {
  float d = distancia(tolva);
  if (isnan(d)) return false;
  calibracion::actual().distanciaVacia[tolva - 1] = d;
  return calibracion::guardar();
}

bool calibrarLlena(int tolva) {
  float d = distancia(tolva);
  if (isnan(d)) return false;
  calibracion::actual().distanciaLlena[tolva - 1] = d;
  return calibracion::guardar();
}

}  // namespace nivel
