#include "publicador.h"

#include <Arduino.h>
#include <esp_random.h>

#include "enlace_mqtt.h"
#include "logica/visita.h"
#include "reloj.h"

namespace publicador {

std::string nuevoEventId() {
  uint8_t bytes[16];
  esp_fill_random(bytes, sizeof(bytes));
  return logica::uuidV4(bytes);
}

void visita(const logica::Visita& v) {
  log_i("Visita %s: %s (%.2f) mascota %d, antes %.1f g, dispensado %.1f g, despues %.1f g",
        v.eventId.c_str(), logica::nombreClase(v.clase), v.confianza, v.petId, v.plateBeforeG,
        v.dispensedG, v.plateAfterG);
  mqtt::encolar("visit", logica::jsonVisita(v));
}

void evento(logica::TipoEvento tipo, int tolva, const std::string& detalle) {
  logica::Evento e;
  e.eventId = nuevoEventId();
  e.tipo = tipo;
  e.occurredAt = reloj::ahora();
  e.detalle = detalle;
  e.tolva = tolva;
  log_w("Evento %s tolva %d: %s", tipo == logica::TipoEvento::Atasco ? "JAM" : "HOPPER_LOW", tolva,
        detalle.c_str());
  mqtt::encolar("event", logica::jsonEvento(e));
}

void resultado(long id, bool ok, double dispensedG, const std::string& error) {
  log_i("Resultado del comando %ld: %s %s", id, ok ? "ok" : "error", error.c_str());
  mqtt::encolar("cmd/result", logica::jsonResultado(id, ok, dispensedG, error));
}

}  // namespace publicador
