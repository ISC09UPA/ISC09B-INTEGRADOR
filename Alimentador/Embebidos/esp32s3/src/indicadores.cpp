#include "indicadores.h"

#include <Arduino.h>

#include "config.h"
#include "expansor.h"

namespace indicadores {

namespace {

constexpr uint8_t BRILLO = 24;  // el WS2812 a pleno brillo deslumbra y consume ~60 mA
constexpr uint32_t BOTON_REBOTE_MS = 40;
constexpr uint32_t BOTON_LECTURA_MS = 20;

Color actual = Color::Apagado;
uint8_t bipsPendientes = 0;
uint16_t bipDuracionMs = 0;
bool buzzerEncendido = false;
uint32_t buzzerDesdeMs = 0;

bool botonAnterior = false;
uint32_t botonCambioMs = 0;
uint32_t botonLecturaMs = 0;
bool pulsacion = false;

void escribirLed(Color c) {
  uint8_t r = 0, g = 0, b = 0;
  switch (c) {
    case Color::Verde: g = BRILLO; break;
    case Color::Azul: b = BRILLO; break;
    case Color::Amarillo: r = BRILLO; g = BRILLO / 2; break;
    case Color::Rojo: r = BRILLO; break;
    default: break;
  }
  neopixelWrite(PIN_LED_RGB, r, g, b);
}

void atenderBuzzer(uint32_t ahora) {
  if (buzzerEncendido) {
    if (ahora - buzzerDesdeMs < bipDuracionMs) return;
    expansor::escribir(MCP_BUZZER, false);
    buzzerEncendido = false;
    buzzerDesdeMs = ahora;
  } else if (bipsPendientes > 0 && ahora - buzzerDesdeMs >= bipDuracionMs) {
    expansor::escribir(MCP_BUZZER, true);
    buzzerEncendido = true;
    buzzerDesdeMs = ahora;
    bipsPendientes--;
  }
}

void atenderBoton(uint32_t ahora) {
  if (ahora - botonLecturaMs < BOTON_LECTURA_MS) return;
  botonLecturaMs = ahora;
  bool nivel = true;
  if (!expansor::leer(MCP_BOTON, nivel)) return;
  bool presionado = !nivel;  // a GND al presionar
  if (presionado == botonAnterior) return;
  if (ahora - botonCambioMs < BOTON_REBOTE_MS) return;
  botonCambioMs = ahora;
  botonAnterior = presionado;
  if (presionado) {
    pulsacion = true;
    pitar();
  }
}

}  // namespace

void iniciar() {
  escribirLed(Color::Azul);
  actual = Color::Azul;
}

void atender() {
  uint32_t ahora = millis();
  atenderBuzzer(ahora);
  atenderBoton(ahora);
}

void color(Color c) {
  if (c == actual) return;
  actual = c;
  escribirLed(c);
}

void pitar(uint8_t veces, uint16_t duracionMs) {
  bipsPendientes = veces;
  bipDuracionMs = duracionMs;
}

bool botonPresionado() {
  bool p = pulsacion;
  pulsacion = false;
  return p;
}

}  // namespace indicadores
