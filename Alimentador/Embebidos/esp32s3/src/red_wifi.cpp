#include "red_wifi.h"

#include <Arduino.h>
#include <WiFi.h>

#include "config.h"
#include "credenciales.h"

namespace red {

namespace {

uint32_t ultimoIntentoMs = 0;
uint32_t esperaMs = WIFI_REINTENTO_MIN_MS;
bool estabaConectada = false;

void intentar() {
  log_i("Conectando a WiFi %s", WIFI_SSID);
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  ultimoIntentoMs = millis();
}

}  // namespace

void iniciar() {
  WiFi.mode(WIFI_STA);
  WiFi.setHostname(FEEDER_ID);
  WiFi.setSleep(false);  // la cámara y MQTT responden mejor sin ahorro de energía
  WiFi.setAutoReconnect(false);  // la reconexión la controla atender()
  intentar();
}

void atender() {
  bool ahora = WiFi.status() == WL_CONNECTED;
  if (ahora) {
    if (!estabaConectada) {
      log_i("WiFi conectado, IP %s, RSSI %d", WiFi.localIP().toString().c_str(), WiFi.RSSI());
      esperaMs = WIFI_REINTENTO_MIN_MS;
    }
    estabaConectada = true;
    return;
  }

  if (estabaConectada) {
    log_w("WiFi perdido");
    estabaConectada = false;
    ultimoIntentoMs = millis();
  }
  if (millis() - ultimoIntentoMs >= esperaMs) {
    intentar();
    esperaMs = esperaMs * 2 > WIFI_REINTENTO_MAX_MS ? WIFI_REINTENTO_MAX_MS : esperaMs * 2;
  }
}

bool conectada() { return WiFi.status() == WL_CONNECTED; }

}  // namespace red
