#include "configuracion.h"

#include <Arduino.h>
#include <ArduinoJson.h>

#include <map>

#include "almacenamiento.h"
#include "config.h"
#include "credenciales.h"
#include "logica/planificador.h"
#include "reloj.h"

namespace configuracion {

namespace {

logica::ConfigAlimentador config;
std::map<int, int64_t> comidas;

void cargarComidas() {
  std::string texto;
  if (!almacenamiento::leer(almacenamiento::RUTA_COMIDAS, texto)) return;
  JsonDocument doc;
  if (deserializeJson(doc, texto)) return;
  for (JsonPairConst par : doc.as<JsonObjectConst>()) {
    comidas[atoi(par.key().c_str())] = par.value().as<int64_t>();
  }
}

void guardarComidas() {
  JsonDocument doc;
  for (const auto& par : comidas) doc[std::to_string(par.first)] = par.second;
  std::string texto;
  serializeJson(doc, texto);
  almacenamiento::escribirAtomico(almacenamiento::RUTA_COMIDAS, texto);
}

}  // namespace

void cargar() {
  std::string texto;
  if (almacenamiento::leer(almacenamiento::RUTA_CONFIG, texto)) {
    std::string detalle;
    logica::ErrorConfig err =
        logica::parsearConfig(texto.data(), texto.size(), FEEDER_ID, config, &detalle);
    if (err == logica::ErrorConfig::Ok) {
      log_i("Config guardada v%d: %u mascotas, %u horarios", config.version,
            (unsigned)config.mascotas.size(), (unsigned)config.horarios.size());
      reloj::fijarZona(config.zonaHoraria.c_str());
    } else {
      log_w("config.json guardado no sirve: %s (%s)", logica::textoErrorConfig(err),
            detalle.c_str());
    }
  }
  cargarComidas();
}

bool aplicar(const std::string& json) {
  logica::ConfigAlimentador nueva;
  std::string detalle;
  logica::ErrorConfig err =
      logica::parsearConfig(json.data(), json.size(), FEEDER_ID, nueva, &detalle);
  if (err != logica::ErrorConfig::Ok) {
    log_w("Config rechazada: %s (%s)", logica::textoErrorConfig(err), detalle.c_str());
    return false;
  }
  if (config.valida() && nueva.version == config.version) return true;

  config = nueva;
  almacenamiento::escribirAtomico(almacenamiento::RUTA_CONFIG, json);
  reloj::fijarZona(config.zonaHoraria.c_str());

  // Se olvidan las mascotas que ya no existen.
  bool cambio = false;
  for (auto it = comidas.begin(); it != comidas.end();) {
    if (!config.buscarMascota(it->first)) {
      it = comidas.erase(it);
      cambio = true;
    } else {
      ++it;
    }
  }
  if (cambio) guardarComidas();

  log_i("Config v%d aplicada: %u mascotas, %u horarios, intervalo %d h, zona %s", config.version,
        (unsigned)config.mascotas.size(), (unsigned)config.horarios.size(),
        config.minIntervalHours, config.zonaHoraria.c_str());
  return true;
}

const logica::ConfigAlimentador& actual() { return config; }

int64_t ultimaComida(int petId) {
  auto it = comidas.find(petId);
  return it == comidas.end() ? 0 : it->second;
}

void registrarComida(int petId, int64_t momento) {
  if (petId == logica::SIN_MASCOTA || momento <= 0) return;
  comidas[petId] = momento;
  guardarComidas();
}

bool tieneComidaDisponible(int petId) {
  int64_t ahora;
  int64_t medianoche;
  if (!reloj::horaLocal(ahora, medianoche)) return false;  // sin hora no hay horarios
  return logica::comidaDisponible(config, petId, ahora, medianoche, ultimaComida(petId),
                                  VENTANA_COMIDA_MIN)
      .disponible;
}

}  // namespace configuracion
