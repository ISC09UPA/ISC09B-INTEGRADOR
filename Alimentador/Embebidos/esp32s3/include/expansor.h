#pragma once

// Expansor de pines MCP23017 por I2C (J2 en la PCB). Solo se usa el puerto A:
//   GPA0 EN1   GPA1 DIR1   GPA2 EN2   GPA3 DIR2
//   GPA4 XSHUT1   GPA5 XSHUT2   GPA6 BUZZER   GPA7 BOTON (entrada con pull-up interno)
// El orden sigue el de los pines 5-12 de J2; si el módulo comprado los saca en otro orden,
// se cambian las constantes MCP_* de config.h.

#include <stdint.h>

namespace expansor {

// Arranca el bus I2C y deja las salidas en estado seguro: motores deshabilitados,
// sensores ToF de nivel apagados y buzzer en silencio. false si el MCP23017 no responde.
bool iniciar();
bool disponible();

void escribir(uint8_t bit, bool nivel);
// Lee una entrada del puerto A; false si el expansor no responde.
bool leer(uint8_t bit, bool& nivel);

}  // namespace expansor
