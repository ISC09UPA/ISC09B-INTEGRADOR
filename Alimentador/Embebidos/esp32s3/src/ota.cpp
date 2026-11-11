#include "ota.h"

#include <Arduino.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <LittleFS.h>
#include <Update.h>
#include <esp_ota_ops.h>
#include <mbedtls/sha256.h>
#include <mbedtls/version.h>
#include <math.h>

#include <memory>

#include "almacenamiento.h"
#include "config.h"
#include "dispensador.h"
#include "publicador.h"
#include "vision.h"

// El núcleo de Arduino marca la aplicación como válida al arrancar a menos que esta función
// devuelva true. Aquí se marca hasta conectar a MQTT (ver ota::alConectarMqtt).
// El núcleo la declara en C, por eso extern "C".
extern "C" bool verifyRollbackLater() { return true; }

namespace ota {

namespace {

constexpr size_t TAM_BLOQUE = 4096;
constexpr uint32_t SIN_DATOS_TIMEOUT_MS = 15000;

bool prueba = false;
long idPendiente = 0;
std::string particionPrevia;
bool reportarRollback = false;

// SHA-256 con la API de mbedTLS 2 (Arduino 2.x) o 3 (Arduino 3.x).
class Sha256 {
 public:
  Sha256() {
    mbedtls_sha256_init(&ctx_);
#if MBEDTLS_VERSION_MAJOR >= 3
    mbedtls_sha256_starts(&ctx_, 0);
#else
    mbedtls_sha256_starts_ret(&ctx_, 0);
#endif
  }
  ~Sha256() { mbedtls_sha256_free(&ctx_); }
  void agregar(const uint8_t* datos, size_t largo) {
#if MBEDTLS_VERSION_MAJOR >= 3
    mbedtls_sha256_update(&ctx_, datos, largo);
#else
    mbedtls_sha256_update_ret(&ctx_, datos, largo);
#endif
  }
  std::string hex() {
    uint8_t digest[32];
#if MBEDTLS_VERSION_MAJOR >= 3
    mbedtls_sha256_finish(&ctx_, digest);
#else
    mbedtls_sha256_finish_ret(&ctx_, digest);
#endif
    return logica::bytesAHex(digest, sizeof(digest));
  }

 private:
  mbedtls_sha256_context ctx_;
};

// Descarga `url` y entrega cada bloque a `destino`; calcula el SHA-256 al vuelo.
template <typename Destino>
bool descargar(const std::string& url, Destino& destino, int& tamano, std::string& sha,
               std::string& error) {
  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);
  if (!http.begin(url.c_str())) {
    error = "url invalida";
    return false;
  }
  int codigo = http.GET();
  if (codigo != HTTP_CODE_OK) {
    error = "descarga HTTP " + std::to_string(codigo);
    http.end();
    return false;
  }
  tamano = http.getSize();  // -1 si no viene Content-Length
  if (!destino.empezar(tamano, error)) {
    http.end();
    return false;
  }

  WiFiClient* flujo = http.getStreamPtr();
  std::unique_ptr<uint8_t[]> bloque(new uint8_t[TAM_BLOQUE]);
  Sha256 hash;
  int restantes = tamano;
  uint32_t ultimoDatoMs = millis();
  while (http.connected() && (tamano < 0 || restantes > 0)) {
    size_t disponibles = flujo->available();
    if (disponibles == 0) {
      if (millis() - ultimoDatoMs > SIN_DATOS_TIMEOUT_MS) {
        error = "descarga sin datos";
        break;
      }
      delay(2);
      continue;
    }
    size_t n = flujo->readBytes(bloque.get(), disponibles < TAM_BLOQUE ? disponibles : TAM_BLOQUE);
    if (n == 0) continue;
    ultimoDatoMs = millis();
    hash.agregar(bloque.get(), n);
    if (!destino.escribir(bloque.get(), n, error)) break;
    if (tamano > 0) restantes -= n;
  }
  http.end();

  if (error.empty() && tamano > 0 && restantes > 0) error = "descarga incompleta";
  if (!error.empty()) {
    destino.cancelar();
    return false;
  }
  sha = hash.hex();
  return true;
}

struct DestinoParticion {
  bool empezar(int tamano, std::string& error) {
    if (!Update.begin(tamano > 0 ? static_cast<size_t>(tamano) : UPDATE_SIZE_UNKNOWN, U_FLASH)) {
      error = std::string("no cabe en la particion: ") + Update.errorString();
      return false;
    }
    return true;
  }
  bool escribir(uint8_t* datos, size_t largo, std::string& error) {
    if (Update.write(datos, largo) != largo) {
      error = std::string("error al escribir: ") + Update.errorString();
      return false;
    }
    return true;
  }
  void cancelar() { Update.abort(); }
};

struct DestinoArchivo {
  const char* ruta;
  File archivo;
  bool empezar(int tamano, std::string& error) {
    // Hacen falta el modelo actual y el nuevo al mismo tiempo; si no cabe se libera el respaldo.
    almacenamiento::borrar(RUTA_MODELO_RESPALDO);
    if (tamano > 0 && static_cast<size_t>(tamano) + 8192 > almacenamiento::bytesLibres()) {
      error = "sin espacio en LittleFS";
      return false;
    }
    archivo = LittleFS.open(ruta, "w");
    if (!archivo) {
      error = "no se pudo crear el temporal";
      return false;
    }
    return true;
  }
  bool escribir(uint8_t* datos, size_t largo, std::string& error) {
    if (archivo.write(datos, largo) != largo) {
      error = "LittleFS lleno";
      return false;
    }
    return true;
  }
  void cancelar() {
    if (archivo) archivo.close();
    LittleFS.remove(ruta);
  }
};

void guardarPendiente(long id, const char* previa) {
  JsonDocument doc;
  doc["id"] = id;
  doc["previa"] = previa;
  doc["arranques"] = 0;
  std::string texto;
  serializeJson(doc, texto);
  almacenamiento::escribirAtomico(almacenamiento::RUTA_OTA_PENDIENTE, texto);
}

void revertir(const char* motivo) {
  log_e("Firmware nuevo rechazado (%s), regresando al anterior", motivo);
  const esp_partition_t* actual = esp_ota_get_running_partition();
  esp_ota_img_states_t estado;
  if (esp_ota_get_state_partition(actual, &estado) == ESP_OK &&
      estado == ESP_OTA_IMG_PENDING_VERIFY) {
    esp_ota_mark_app_invalid_rollback_and_reboot();
  }
  // Respaldo si el gestor de arranque no tiene el rollback activo.
  const esp_partition_t* previa = esp_partition_find_first(
      ESP_PARTITION_TYPE_APP, ESP_PARTITION_SUBTYPE_ANY, particionPrevia.c_str());
  if (previa && esp_ota_set_boot_partition(previa) == ESP_OK) esp_restart();
  log_e("No se encontro la particion %s", particionPrevia.c_str());
  prueba = false;
}

}  // namespace

void alArrancar() {
  const esp_partition_t* actual = esp_ota_get_running_partition();
  log_i("Firmware %s en la particion %s", FIRMWARE_VERSION, actual->label);

  std::string texto;
  if (!almacenamiento::leer(almacenamiento::RUTA_OTA_PENDIENTE, texto)) return;
  JsonDocument doc;
  if (deserializeJson(doc, texto)) {
    almacenamiento::borrar(almacenamiento::RUTA_OTA_PENDIENTE);
    return;
  }
  idPendiente = doc["id"] | 0L;
  particionPrevia = doc["previa"] | "";
  int arranques = (doc["arranques"] | 0) + 1;

  if (particionPrevia == actual->label) {
    // Arrancó el firmware de antes: el nuevo no sirvió y hubo rollback.
    reportarRollback = true;
    return;
  }

  prueba = true;
  doc["arranques"] = arranques;
  texto.clear();
  serializeJson(doc, texto);
  almacenamiento::escribirAtomico(almacenamiento::RUTA_OTA_PENDIENTE, texto);
  log_i("Firmware en prueba (arranque %d de %d)", arranques, OTA_ARRANQUES_MAX);
  if (arranques > OTA_ARRANQUES_MAX) revertir("demasiados reinicios");
}

void alConectarMqtt() {
  // Conectar a MQTT es la prueba de que el firmware sirve.
  esp_ota_mark_app_valid_cancel_rollback();

  if (prueba) {
    prueba = false;
    log_i("Firmware %s validado", FIRMWARE_VERSION);
    if (idPendiente > 0) publicador::resultado(idPendiente, true, NAN, "");
    almacenamiento::borrar(almacenamiento::RUTA_OTA_PENDIENTE);
  } else if (reportarRollback) {
    reportarRollback = false;
    if (idPendiente > 0) {
      publicador::resultado(idPendiente, false, NAN,
                            "rollback: el firmware nuevo no se conecto a MQTT");
    }
    almacenamiento::borrar(almacenamiento::RUTA_OTA_PENDIENTE);
  }
}

void atender() {
  if (prueba && millis() > OTA_VALIDACION_MS) revertir("sin MQTT en el tiempo de prueba");
}

bool enPrueba() { return prueba; }

bool actualizarFirmware(const logica::Comando& cmd, std::string& error) {
  if (prueba) {
    error = "hay otra actualizacion en prueba";
    return false;
  }
  dispensador::detenerTodo();
  log_i("OTA de firmware %s desde %s", cmd.version.c_str(), cmd.url.c_str());

  DestinoParticion destino;
  int tamano = 0;
  std::string sha;
  if (!descargar(cmd.url, destino, tamano, sha, error)) return false;
  if (sha != cmd.sha256) {
    Update.abort();
    error = "sha256 no coincide";
    return false;
  }
  if (!Update.end(true)) {
    error = std::string("imagen invalida: ") + Update.errorString();
    return false;
  }

  guardarPendiente(cmd.id, esp_ota_get_running_partition()->label);
  log_i("Firmware verificado (%d bytes), reiniciando", tamano);
  delay(500);
  esp_restart();
  return true;
}

bool actualizarModelo(const logica::Comando& cmd, std::string& error) {
  log_i("OTA de modelo %s desde %s", cmd.version.c_str(), cmd.url.c_str());
  DestinoArchivo destino{RUTA_MODELO_TMP, File()};
  int tamano = 0;
  std::string sha;
  if (!descargar(cmd.url, destino, tamano, sha, error)) return false;
  destino.archivo.close();
  if (sha != cmd.sha256) {
    almacenamiento::borrar(RUTA_MODELO_TMP);
    error = "sha256 no coincide";
    return false;
  }

  std::string versionAnterior;
  almacenamiento::leer(RUTA_MODELO_VERSION, versionAnterior);
  bool habiaModelo = almacenamiento::existe(RUTA_MODELO);

  vision::liberarModelo();
  if (habiaModelo) almacenamiento::renombrar(RUTA_MODELO, RUTA_MODELO_RESPALDO);
  almacenamiento::renombrar(RUTA_MODELO_TMP, RUTA_MODELO);
  almacenamiento::escribirAtomico(RUTA_MODELO_VERSION, cmd.version);

  if (vision::cargarModelo()) {
    almacenamiento::borrar(RUTA_MODELO_RESPALDO);
    log_i("Modelo %s instalado", cmd.version.c_str());
    return true;
  }

  error = "el modelo nuevo no carga";
  almacenamiento::borrar(RUTA_MODELO);
  if (habiaModelo) {
    almacenamiento::renombrar(RUTA_MODELO_RESPALDO, RUTA_MODELO);
    almacenamiento::escribirAtomico(RUTA_MODELO_VERSION, versionAnterior);
    vision::cargarModelo();
  } else {
    almacenamiento::borrar(RUTA_MODELO_VERSION);
  }
  return false;
}

}  // namespace ota
