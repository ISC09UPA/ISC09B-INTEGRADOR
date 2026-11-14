#include "tof.h"

#include <Arduino.h>
#include <VL53L0X.h>
#include <Wire.h>

#include "config.h"
#include "expansor.h"

namespace tof {

namespace {

constexpr uint16_t FUERA_DE_RANGO_MM = 8190;  // el VL53L0X reporta 8190/8191 sin objeto
constexpr uint32_t PERIODO_MEDICION_MS = 50;
constexpr uint16_t TIEMPO_ESPERA_MS = 30;

struct Estado {
  VL53L0X sensor;
  bool listo = false;
  uint16_t mm = 0;
  uint32_t ultimaLecturaMs = 0;
};

Estado sensores[3];

bool responde(uint8_t direccion) {
  Wire.beginTransmission(direccion);
  return Wire.endTransmission() == 0;
}

// Inicia el sensor que esté en `actual` y lo mueve a `nueva`.
bool configurar(Estado& e, uint8_t actual, uint8_t nueva) {
  e.sensor.setBus(&Wire);
  e.sensor.setTimeout(TIEMPO_ESPERA_MS);
  e.sensor.setAddress(actual);
  if (!responde(actual) || !e.sensor.init()) return false;
  if (actual != nueva) e.sensor.setAddress(nueva);
  e.sensor.startContinuous(PERIODO_MEDICION_MS);
  return true;
}

void iniciarPresencia() {
  Estado& e = sensores[Presencia];
  // Tras un reinicio por software el sensor sigue encendido con la dirección que se le dio.
  if (responde(TOF_DIRECCION_PRESENCIA)) {
    e.listo = configurar(e, TOF_DIRECCION_PRESENCIA, TOF_DIRECCION_PRESENCIA);
  } else {
    e.listo = configurar(e, TOF_DIRECCION_FABRICA, TOF_DIRECCION_PRESENCIA);
  }
  if (!e.listo) log_w("VL53L0X de presencia sin respuesta");
}

void iniciarNivel(Sensor s, uint8_t bitXshut, uint8_t direccion) {
  Estado& e = sensores[s];
  if (!expansor::disponible()) {
    log_w("Sin MCP23017 no se puede encender el VL53L0X de nivel %d", s);
    return;
  }
  expansor::escribir(bitXshut, true);
  delay(10);  // arranque del sensor tras soltar XSHUT
  e.listo = configurar(e, TOF_DIRECCION_FABRICA, direccion);
  if (!e.listo) log_w("VL53L0X de nivel %d sin respuesta", s);
}

}  // namespace

void iniciar() {
  // expansor::iniciar() dejó los XSHUT en bajo: solo el de presencia está encendido.
  iniciarPresencia();
  iniciarNivel(Nivel1, MCP_XSHUT1, TOF_DIRECCION_NIVEL1);
  iniciarNivel(Nivel2, MCP_XSHUT2, TOF_DIRECCION_NIVEL2);
}

void atender() {
  uint32_t ahora = millis();
  for (Estado& e : sensores) {
    if (!e.listo) continue;
    // Solo lee si ya hay medición, para no quedarse esperando dentro del loop.
    if ((e.sensor.readReg(VL53L0X::RESULT_INTERRUPT_STATUS) & 0x07) == 0) continue;
    uint16_t mm = e.sensor.readRangeContinuousMillimeters();
    if (e.sensor.timeoutOccurred()) continue;
    e.mm = mm >= FUERA_DE_RANGO_MM ? 0 : mm;
    e.ultimaLecturaMs = ahora;
  }
}

bool disponible(Sensor s) { return s <= Nivel2 && sensores[s].listo; }

uint16_t distanciaMm(Sensor s) {
  if (!disponible(s) || edadMs(s) > 1000) return 0;
  return sensores[s].mm;
}

uint32_t edadMs(Sensor s) {
  if (!disponible(s) || sensores[s].ultimaLecturaMs == 0) return UINT32_MAX;
  return millis() - sensores[s].ultimaLecturaMs;
}

}  // namespace tof
