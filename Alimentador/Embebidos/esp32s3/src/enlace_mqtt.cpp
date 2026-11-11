#include "enlace_mqtt.h"

#include <Arduino.h>
#include <espMqttClient.h>

#include <deque>
#include <utility>

#include "almacenamiento.h"
#include "config.h"
#include "credenciales.h"
#include "logica/cola_salida.h"
#include "logica/protocolo.h"
#include "red_wifi.h"

namespace mqtt {

namespace {

constexpr size_t MAX_MENSAJE_ENTRANTE = 16 * 1024;
constexpr uint32_t GUARDAR_COLA_CADA_MS = 2000;
constexpr uint32_t PUBACK_TIMEOUT_MS = 120000;

// El cliente guarda punteros a estas cadenas: deben vivir todo el programa.
const std::string kTemaEstado = logica::tema(FEEDER_ID, "status");
const std::string kTemaConfig = logica::tema(FEEDER_ID, "config");
const std::string kTemaCmd = logica::tema(FEEDER_ID, "cmd");
const std::string kLwt = logica::jsonEstadoDesconectado();
const std::string kClientId = std::string("feeder-") + FEEDER_ID;

espMqttClient cliente(espMqttClientTypes::UseInternalTask::NO);
logica::ColaSalida cola(COLA_SALIDA_CAPACIDAD);

AlRecibir manejador;
AlConectar alConectarCb;

bool recienConectado = false;
bool estabaConectado = false;
uint32_t ultimoIntentoMs = 0;
uint32_t esperaMs = MQTT_REINTENTO_MIN_MS;
bool colaSucia = false;
uint32_t ultimoGuardadoMs = 0;
uint32_t ultimoPubackMs = 0;

std::string temaEnArmado;
std::string payloadEnArmado;
std::deque<std::pair<std::string, std::string>> recibidos;

void guardarCola() {
  almacenamiento::escribirAtomico(almacenamiento::RUTA_COLA, cola.serializar());
  colaSucia = false;
  ultimoGuardadoMs = millis();
}

void alRecibirFragmento(const espMqttClientTypes::MessageProperties&, const char* tema,
                        const uint8_t* payload, size_t largo, size_t indice, size_t total) {
  if (total > MAX_MENSAJE_ENTRANTE) {
    if (indice == 0) log_w("Mensaje de %u bytes en %s descartado", (unsigned)total, tema);
    return;
  }
  // Los mensajes grandes llegan en fragmentos; se arman antes de procesarlos.
  if (indice == 0) {
    temaEnArmado = tema;
    payloadEnArmado.clear();
    payloadEnArmado.reserve(total);
  }
  payloadEnArmado.append(reinterpret_cast<const char*>(payload), largo);
  if (indice + largo >= total) {
    recibidos.emplace_back(temaEnArmado, payloadEnArmado);
    payloadEnArmado.clear();
  }
}

void alConfirmar(uint16_t packetId) {
  if (cola.confirmar(packetId)) {
    colaSucia = true;
    ultimoPubackMs = millis();
  }
}

void conectar() {
  log_i("Conectando a MQTT %s:%d", GATEWAY_HOST, GATEWAY_MQTT_PORT);
  ultimoIntentoMs = millis();
  cliente.connect();
}

void vaciarCola() {
  while (cola.enVuelo() < COLA_MAX_EN_VUELO) {
    const logica::MensajeSalida* m = cola.siguientePendiente();
    if (!m) break;
    uint16_t id = cliente.publish(m->tema.c_str(), 1, false, m->payload.c_str());
    if (id == 0) break;  // sin memoria o desconectado: se reintenta en la siguiente vuelta
    if (cola.enVuelo() == 0) ultimoPubackMs = millis();
    cola.marcarEnVuelo(m->seq, id);
  }
}

}  // namespace

void iniciar(AlRecibir alRecibir, AlConectar alConectar) {
  manejador = std::move(alRecibir);
  alConectarCb = std::move(alConectar);

  std::string guardada;
  if (almacenamiento::leer(almacenamiento::RUTA_COLA, guardada)) {
    size_t n = cola.deserializar(guardada);
    if (n > 0) log_i("%u mensajes pendientes recuperados de LittleFS", (unsigned)n);
  }

  cliente.setServer(GATEWAY_HOST, GATEWAY_MQTT_PORT)
      .setCredentials(MQTT_USER, MQTT_PASS)
      .setClientId(kClientId.c_str())
      .setKeepAlive(MQTT_KEEPALIVE_S)
      .setCleanSession(true)
      .setWill(kTemaEstado.c_str(), 1, true, kLwt.c_str())
      .onConnect([](bool) { recienConectado = true; })
      .onDisconnect([](espMqttClientTypes::DisconnectReason razon) {
        log_w("MQTT desconectado: %s", espMqttClientTypes::disconnectReasonToString(razon));
      })
      .onMessage(alRecibirFragmento)
      .onPublish(alConfirmar);
}

void atender() {
  if (!red::conectada()) {
    if (estabaConectado) cliente.disconnect(true);
    estabaConectado = false;
    cliente.loop();
    return;
  }

  if (cliente.disconnected() && millis() - ultimoIntentoMs >= esperaMs) {
    conectar();
    esperaMs = esperaMs * 2 > MQTT_REINTENTO_MAX_MS ? MQTT_REINTENTO_MAX_MS : esperaMs * 2;
  }
  cliente.loop();

  if (recienConectado) {
    recienConectado = false;
    estabaConectado = true;
    esperaMs = MQTT_REINTENTO_MIN_MS;
    log_i("MQTT conectado");
    cliente.subscribe(kTemaConfig.c_str(), 1);
    cliente.subscribe(kTemaCmd.c_str(), 1);
    cliente.subscribe(logica::TEMA_HORA_GATEWAY, 1);
    if (alConectarCb) alConectarCb();
  }
  if (!cliente.connected()) estabaConectado = false;

  while (!recibidos.empty()) {
    auto mensaje = std::move(recibidos.front());
    recibidos.pop_front();
    if (manejador) manejador(mensaje.first, mensaje.second);
  }

  if (cliente.connected()) {
    // Si un PUBACK nunca llega se vuelve a intentar (la Pi descarta duplicados).
    if (cola.enVuelo() > 0 && millis() - ultimoPubackMs > PUBACK_TIMEOUT_MS) {
      log_w("Sin PUBACK en %lu s, se reenvia la cola", PUBACK_TIMEOUT_MS / 1000);
      cola.reiniciarEnVuelo();
      ultimoPubackMs = millis();
    }
    vaciarCola();
  }

  if (colaSucia && (cola.vacia() || millis() - ultimoGuardadoMs >= GUARDAR_COLA_CADA_MS)) {
    guardarCola();
  }
}

bool conectado() { return cliente.connected(); }

bool encolar(const char* sufijo, const std::string& payload) {
  if (cola.agregar(logica::tema(FEEDER_ID, sufijo), payload) == 0) {
    log_e("No se pudo encolar %s", sufijo);
    return false;
  }
  if (cola.descartados() > 0) log_w("Cola llena: %u mensajes viejos descartados", cola.descartados());
  guardarCola();  // lo nuevo se guarda de inmediato por si se va la luz
  if (cliente.connected()) vaciarCola();
  return true;
}

bool publicarEstado(const std::string& json) {
  if (!cliente.connected()) return false;
  return cliente.publish(kTemaEstado.c_str(), 1, true, json.c_str()) != 0;
}

size_t pendientes() { return cola.tamano(); }

}  // namespace mqtt
