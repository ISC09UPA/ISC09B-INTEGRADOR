#include "comandos.h"

#include <Arduino.h>
#include <math.h>

#include <deque>

#include "configuracion.h"
#include "dispensador.h"
#include "logica/protocolo.h"
#include "ota.h"
#include "publicador.h"
#include "reloj.h"

namespace comandos {

namespace {

constexpr size_t MAX_EN_ESPERA = 6;
constexpr size_t IDS_RECORDADOS = 16;
constexpr uint32_t VENCIMIENTO_DISPENSADO_MS = 120000;  // el backend los vence a los 2 min

struct EnEspera {
  logica::Comando cmd;
  int tolva = 0;
  double gramos = 0;
  uint32_t recibidoMs = 0;
};

std::deque<EnEspera> espera;
long ids[IDS_RECORDADOS] = {};
size_t siguienteId = 0;
bool ejecutando = false;

// QoS 1 puede entregar el mismo comando dos veces.
bool yaVisto(long id) {
  for (long visto : ids) {
    if (visto == id) return true;
  }
  ids[siguienteId] = id;
  siguienteId = (siguienteId + 1) % IDS_RECORDADOS;
  return false;
}

void ejecutarDispensado(const EnEspera& e) {
  long id = e.cmd.id;
  int petId = e.cmd.petId;
  ejecutando = true;
  dispensador::dispensar(e.tolva, e.gramos, [id, petId](const dispensador::Resultado& r) {
    ejecutando = false;
    // Un dispensado manual cuenta como comida para el intervalo mínimo.
    if (petId != logica::SIN_MASCOTA && r.dispensadoG > 0) {
      configuracion::registrarComida(petId, reloj::ahora());
    }
    publicador::resultado(id, r.ok, r.dispensadoG, r.error);
  });
}

void ejecutarOta(const logica::Comando& cmd) {
  std::string error;
  bool ok = cmd.objetivo == logica::ObjetivoOta::Firmware ? ota::actualizarFirmware(cmd, error)
                                                          : ota::actualizarModelo(cmd, error);
  // El firmware exitoso reinicia y contesta después de validarse (ver ota.cpp).
  publicador::resultado(cmd.id, ok, NAN, error);
}

}  // namespace

void recibir(const std::string& payload) {
  logica::Comando cmd;
  long id = 0;
  logica::ErrorComando err = logica::parsearComando(payload.data(), payload.size(), cmd, id);
  if (id > 0 && yaVisto(id)) {
    log_i("Comando %ld repetido, se ignora", id);
    return;
  }
  if (err != logica::ErrorComando::Ok) {
    log_w("Comando invalido: %s", logica::textoErrorComando(err));
    if (id > 0) publicador::resultado(id, false, NAN, logica::textoErrorComando(err));
    return;
  }

  EnEspera e;
  e.cmd = cmd;
  e.recibidoMs = millis();
  if (cmd.tipo == logica::TipoComando::Dispensar) {
    err = logica::resolverDispensado(cmd, configuracion::actual(), e.tolva, e.gramos);
    if (err != logica::ErrorComando::Ok) {
      publicador::resultado(cmd.id, false, NAN, logica::textoErrorComando(err));
      return;
    }
  }
  if (espera.size() >= MAX_EN_ESPERA) {
    publicador::resultado(cmd.id, false, NAN, "alimentador ocupado");
    return;
  }
  log_i("Comando %ld en espera (%s)", cmd.id,
        cmd.tipo == logica::TipoComando::Dispensar ? "dispense" : "ota");
  espera.push_back(e);
}

void atender() {
  if (espera.empty() || ejecutando || dispensador::ocupado()) return;

  EnEspera e = espera.front();
  espera.pop_front();
  if (e.cmd.tipo == logica::TipoComando::Dispensar) {
    if (millis() - e.recibidoMs > VENCIMIENTO_DISPENSADO_MS) {
      publicador::resultado(e.cmd.id, false, NAN, "vencido");
      return;
    }
    ejecutarDispensado(e);
  } else {
    ejecutarOta(e.cmd);
  }
}

}  // namespace comandos
