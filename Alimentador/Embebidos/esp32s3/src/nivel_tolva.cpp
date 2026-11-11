#include "nivel_tolva.h"

#include <Arduino.h>
#include <math.h>

#include "calibracion.h"
#include "config.h"
#include "logica/sensores.h"
#include "publicador.h"

namespace nivel {

namespace {

constexpr uint32_t ECO_TIMEOUT_US = 25000;    // ~4 m
constexpr uint32_t ENTRE_DISPAROS_MS = 60;    // deja apagar el eco anterior

struct Tolva {
  int pinEco;
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

double medirCm(int pinEco) {
  digitalWrite(PIN_ULTRASONICO_TRIG, LOW);
  delayMicroseconds(4);
  digitalWrite(PIN_ULTRASONICO_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_ULTRASONICO_TRIG, LOW);
  return logica::distanciaDesdeEcoUs(pulseIn(pinEco, HIGH, ECO_TIMEOUT_US));
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
  pinMode(PIN_ULTRASONICO_TRIG, OUTPUT);
  digitalWrite(PIN_ULTRASONICO_TRIG, LOW);
  tolvas[0].pinEco = PIN_ULTRASONICO_ECHO_PERRO;
  tolvas[1].pinEco = PIN_ULTRASONICO_ECHO_GATO;
  for (Tolva& t : tolvas) pinMode(t.pinEco, INPUT);
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
  if (ahora - ultimoDisparoMs < ENTRE_DISPAROS_MS) return;
  ultimoDisparoMs = ahora;

  // Alterna tolvas: muestra 0 perro, 1 gato, 2 perro...
  int tolva = muestraActual % 2;
  tolvas[tolva].muestras[muestraActual / 2] = medirCm(tolvas[tolva].pinEco);
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
