#include "rfid.h"

#include <Arduino.h>

#include "config.h"
#include "logica/sensores.h"

namespace rfid {

namespace {

logica::LectorRdm6300 lector;
std::string etiqueta;
uint32_t lecturaMs = 0;
bool nueva = false;

}  // namespace

void iniciar() {
  if (!USAR_RFID) return;
  Serial1.begin(9600, SERIAL_8N1, PIN_RFID_RX, -1);
}

void atender() {
  if (!USAR_RFID) return;
  while (Serial1.available() > 0) {
    if (lector.alimentar(static_cast<uint8_t>(Serial1.read()))) {
      // El RDM6300 repite la trama mientras la etiqueta está cerca: solo cuenta como
      // nueva si cambió o pasó la vigencia.
      bool distinta = etiqueta != lector.etiqueta();
      if (distinta || millis() - lecturaMs > RFID_VIGENCIA_MS) {
        nueva = true;
        log_i("RFID %s", lector.etiqueta());
      }
      etiqueta = lector.etiqueta();
      lecturaMs = millis();
    }
  }
}

std::string ultima(uint32_t vigenciaMs) {
  if (etiqueta.empty() || millis() - lecturaMs > vigenciaMs) return "";
  return etiqueta;
}

bool hayLecturaNueva() {
  bool r = nueva;
  nueva = false;
  return r;
}

}  // namespace rfid
