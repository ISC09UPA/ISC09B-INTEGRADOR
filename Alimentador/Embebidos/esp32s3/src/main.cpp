// Alimentador Inteligente: firmware del ESP32-S3.
// Ver README.md para el hardware y ../PROTOCOLO.md para el contrato con la Raspberry Pi.

#include <Arduino.h>
#include <math.h>

#include "almacenamiento.h"
#include "basculas.h"
#include "calibracion.h"
#include "comandos.h"
#include "config.h"
#include "configuracion.h"
#include "consola_serie.h"
#include "credenciales.h"
#include "dispensador.h"
#include "enlace_mqtt.h"
#include "expansor.h"
#include "indicadores.h"
#include "logica/protocolo.h"
#include "logica/sensores.h"
#include "nivel_tolva.h"
#include "ota.h"
#include "red_wifi.h"
#include "reloj.h"
#include "rfid.h"
#include "tof.h"
#include "vision.h"
#include "visitas.h"

namespace {

const std::string kTemaConfig = logica::tema(FEEDER_ID, "config");
const std::string kTemaCmd = logica::tema(FEEDER_ID, "cmd");

uint32_t ultimoEstadoMs = 0;
bool estadoPendiente = true;
logica::Estado ultimoEstado = {NAN, NAN, NAN, NAN, "", "", 0};

logica::Estado leerEstado() {
  logica::Estado e;
  e.hopperDogPct = nivel::porcentaje(1);
  e.hopperCatPct = nivel::porcentaje(2);
  e.plateDogG = basculas::gramos(1);
  e.plateCatG = basculas::gramos(2);
  e.firmware = FIRMWARE_VERSION;
  e.modelo = vision::modeloCargado() ? vision::versionModelo() : "";
  e.reportedAt = reloj::ahora();
  return e;
}

void atenderEstado() {
  logica::Estado e = leerEstado();
  bool cambio =
      logica::cambioRelevante(ultimoEstado.hopperDogPct, e.hopperDogPct, CAMBIO_ESTADO_TOLVA_PCT) ||
      logica::cambioRelevante(ultimoEstado.hopperCatPct, e.hopperCatPct, CAMBIO_ESTADO_TOLVA_PCT) ||
      logica::cambioRelevante(ultimoEstado.plateDogG, e.plateDogG, CAMBIO_ESTADO_PLATO_G) ||
      logica::cambioRelevante(ultimoEstado.plateCatG, e.plateCatG, CAMBIO_ESTADO_PLATO_G) ||
      e.modelo != ultimoEstado.modelo;
  if (!estadoPendiente && !cambio && millis() - ultimoEstadoMs < ESTADO_PERIODO_MS) return;
  if (!mqtt::conectado() || e.reportedAt == 0) return;

  if (mqtt::publicarEstado(logica::jsonEstado(e))) {
    ultimoEstado = e;
    ultimoEstadoMs = millis();
    estadoPendiente = false;
  }
}

void alRecibir(const std::string& tema, const std::string& payload) {
  if (tema == kTemaCmd) {
    comandos::recibir(payload);
  } else if (tema == kTemaConfig) {
    configuracion::aplicar(payload);
  } else if (tema == logica::TEMA_HORA_GATEWAY) {
    int64_t ahora;
    if (logica::parsearHoraGateway(payload.data(), payload.size(), ahora)) {
      reloj::ajustarDesdeGateway(ahora);
    }
  }
}

void alConectar() {
  ota::alConectarMqtt();
  estadoPendiente = true;
}

bool tolvaBaja() {
  for (int tolva = 1; tolva <= 2; tolva++) {
    float pct = nivel::porcentaje(tolva);
    if (!isnan(pct) && pct < TOLVA_BAJA_PCT) return true;
  }
  return false;
}

void actualizarLed() {
  using indicadores::Color;
  if (!expansor::disponible()) {
    indicadores::color(Color::Rojo);
  } else if (!mqtt::conectado()) {
    indicadores::color((millis() / 500) % 2 == 0 ? Color::Azul : Color::Apagado);
  } else if (tolvaBaja()) {
    indicadores::color(Color::Amarillo);
  } else {
    indicadores::color(Color::Verde);
  }
}

}  // namespace

void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.printf("\nAlimentador Inteligente %s, firmware %s\n", FEEDER_ID, FIRMWARE_VERSION);
  if (!logica::feederIdValido(FEEDER_ID)) {
    Serial.println("FEEDER_ID invalido en secrets.h (solo letras, numeros, '-' y '_')");
  }
  indicadores::iniciar();
  // El I2C va primero: el expansor deja motores deshabilitados y los ToF de nivel apagados.
  if (!expansor::iniciar()) Serial.println("ERROR: MCP23017 sin respuesta; motores deshabilitados");

  if (!almacenamiento::iniciar()) Serial.println("ERROR: LittleFS no disponible");
  ota::alArrancar();
  calibracion::cargar();
  reloj::iniciar();  // toma la hora del DS3231 si la tiene
  configuracion::cargar();

  tof::iniciar();
  dispensador::iniciar();
  basculas::iniciar();
  nivel::iniciar();
  rfid::iniciar();
  visitas::iniciar();
  if (vision::iniciarCamara()) {
    vision::cargarModelo();
  } else {
    Serial.println("ERROR: camara no disponible; solo funcionan RFID, basculas y comandos");
  }

  red::iniciar();
  mqtt::iniciar(alRecibir, alConectar);
  Serial.println("Listo. Escribe AYUDA para ver los comandos.");
}

void loop() {
  red::atender();
  mqtt::atender();
  ota::atender();

  reloj::atender();
  tof::atender();
  basculas::atender();
  nivel::atender();
  rfid::atender();
  dispensador::atender();
  comandos::atender();
  visitas::atender();

  atenderEstado();
  consola::atender();
  indicadores::atender();
  if (indicadores::botonPresionado()) estadoPendiente = true;
  actualizarLed();
  delay(5);
}
