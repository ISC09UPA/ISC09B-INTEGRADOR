#include "expansor.h"

#include <Arduino.h>
#include <Wire.h>

#include "config.h"

namespace expansor {

namespace {

constexpr uint8_t REG_IODIRA = 0x00;
constexpr uint8_t REG_GPPUA = 0x0C;
constexpr uint8_t REG_GPIOA = 0x12;
constexpr uint8_t REG_OLATA = 0x14;

bool listo = false;
uint8_t salidas = 0;  // copia de OLATA

bool escribirRegistro(uint8_t reg, uint8_t valor) {
  Wire.beginTransmission(MCP23017_DIRECCION);
  Wire.write(reg);
  Wire.write(valor);
  return Wire.endTransmission() == 0;
}

bool leerRegistro(uint8_t reg, uint8_t& valor) {
  Wire.beginTransmission(MCP23017_DIRECCION);
  Wire.write(reg);
  if (Wire.endTransmission(false) != 0) return false;
  if (Wire.requestFrom(static_cast<uint8_t>(MCP23017_DIRECCION), static_cast<uint8_t>(1)) != 1) {
    return false;
  }
  valor = static_cast<uint8_t>(Wire.read());
  return true;
}

}  // namespace

bool iniciar() {
  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL, I2C_FRECUENCIA_HZ);

  // Estado seguro antes de volver salidas los pines: EN en alto (TMC2209 deshabilitado),
  // XSHUT en bajo (ToF de nivel apagados para asignarles dirección uno por uno).
  salidas = static_cast<uint8_t>((1u << MCP_EN1) | (1u << MCP_EN2));
  uint8_t direccion = static_cast<uint8_t>(1u << MCP_BOTON);  // 1 = entrada
  listo = escribirRegistro(REG_OLATA, salidas) && escribirRegistro(REG_IODIRA, direccion) &&
          escribirRegistro(REG_GPPUA, direccion);
  if (!listo) log_e("El MCP23017 no responde en 0x%02X", MCP23017_DIRECCION);
  return listo;
}

bool disponible() { return listo; }

void escribir(uint8_t bit, bool nivel) {
  if (bit > 7) return;
  uint8_t nuevo = nivel ? static_cast<uint8_t>(salidas | (1u << bit))
                        : static_cast<uint8_t>(salidas & ~(1u << bit));
  if (nuevo == salidas && listo) return;
  salidas = nuevo;
  if (!escribirRegistro(REG_OLATA, salidas)) {
    listo = false;
    log_w("No se pudo escribir en el MCP23017");
  } else {
    listo = true;
  }
}

bool leer(uint8_t bit, bool& nivel) {
  uint8_t valor = 0;
  if (bit > 7 || !leerRegistro(REG_GPIOA, valor)) return false;
  nivel = (valor >> bit) & 1u;
  return true;
}

}  // namespace expansor
