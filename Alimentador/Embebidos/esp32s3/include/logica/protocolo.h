#pragma once

// Mensajes del protocolo ESP32 <-> Raspberry Pi (ver ../../PROTOCOLO.md).
// Sin dependencias de hardware: se prueba en la computadora con el entorno native.

#include <stddef.h>
#include <stdint.h>

#include <string>
#include <vector>

namespace logica {

constexpr int TOLVA_PERRO = 1;
constexpr int TOLVA_GATO = 2;
constexpr int SIN_MASCOTA = -1;
constexpr double MAX_GRAMOS_RACION = 400.0;   // tope por comida en la config
constexpr double MAX_GRAMOS_COMANDO = 400.0;  // tope de un dispensado manual
constexpr int MAX_INTERVALO_HORAS = 48;
constexpr size_t MAX_MASCOTAS = 8;
constexpr size_t MAX_HORARIOS = 48;

enum class Clase : uint8_t { Perro = 0, Gato = 1, Nada = 2 };
constexpr size_t NUM_CLASES = 3;

const char* nombreClase(Clase clase);
bool claseDesdeTexto(const char* texto, Clase& clase);

// Tolva que corresponde a una especie (1 perro, 2 gato); 0 si no aplica.
int tolvaDeClase(Clase clase);

// ---------------------------------------------------------------------------
// Configuración (feeder/{id}/config = ConfigAlimentadorDto del backend)
// ---------------------------------------------------------------------------
struct Mascota {
  int id = 0;
  std::string nombre;
  Clase especie = Clase::Perro;
  int tolva = TOLVA_PERRO;
  std::string rfid;  // vacío si no tiene
  double gramosPorComida = 0;
};

struct Horario {
  int petId = SIN_MASCOTA;  // SIN_MASCOTA = aplica a todas las mascotas
  int minutoDelDia = 0;     // 0..1439, hora local
};

struct ConfigAlimentador {
  std::string feederId;
  int version = -1;  // -1 = sin configuración
  int minIntervalHours = 0;
  std::string zonaHoraria = "America/Mexico_City";
  std::vector<Mascota> mascotas;
  std::vector<Horario> horarios;

  bool valida() const { return version >= 0; }
  const Mascota* buscarMascota(int id) const;
};

enum class ErrorConfig { Ok, JsonInvalido, FeederIncorrecto, CampoFaltante, ValorInvalido };

// Valida todo antes de tocar `salida`: si hay error, `salida` queda como estaba.
ErrorConfig parsearConfig(const char* json, size_t largo, const char* feederEsperado,
                          ConfigAlimentador& salida, std::string* detalle = nullptr);
const char* textoErrorConfig(ErrorConfig error);

// "HH:mm" (00:00 a 23:59) a minutos desde la medianoche.
bool parsearHora(const char* texto, int& minutos);

// ---------------------------------------------------------------------------
// Comandos (feeder/{id}/cmd)
// ---------------------------------------------------------------------------
enum class TipoComando { Dispensar, Ota };
enum class ObjetivoOta { Firmware, Modelo };

struct Comando {
  long id = 0;
  TipoComando tipo = TipoComando::Dispensar;
  // dispense
  bool tieneGramos = false;
  double gramos = 0;
  int petId = SIN_MASCOTA;
  int tolva = 0;  // 0 = no vino
  // ota
  ObjetivoOta objetivo = ObjetivoOta::Firmware;
  std::string url;
  std::string sha256;  // 64 caracteres hex en minúsculas
  std::string version;
};

enum class ErrorComando {
  Ok,
  JsonInvalido,
  SinId,
  TipoDesconocido,
  GramosInvalidos,
  TolvaInvalida,
  MascotaDesconocida,
  FaltaDestino,
  ObjetivoInvalido,
  UrlInvalida,
  Sha256Invalido,
};

// Si el JSON trae un id válido lo deja en `idLeido` aunque el resto falle,
// para poder contestar el error en cmd/result.
ErrorComando parsearComando(const char* json, size_t largo, Comando& salida, long& idLeido);
const char* textoErrorComando(ErrorComando error);

// Completa tolva y gramos de un dispense con la mascota de la config cuando no vienen.
ErrorComando resolverDispensado(const Comando& cmd, const ConfigAlimentador& config, int& tolva,
                                double& gramos);

// gateway/time: { "now": s }
bool parsearHoraGateway(const char* json, size_t largo, int64_t& ahora);

// ---------------------------------------------------------------------------
// Mensajes que publica el ESP32
// ---------------------------------------------------------------------------
// NAN en cualquier medida = sensor sin lectura válida; se publica null.
struct Estado {
  double hopperDogPct;
  double hopperCatPct;
  double plateDogG;
  double plateCatG;
  std::string firmware;
  std::string modelo;  // vacío = sin modelo cargado (null)
  int64_t reportedAt;
};

struct Visita {
  std::string eventId;
  int petId = SIN_MASCOTA;
  Clase clase = Clase::Nada;
  double confianza = 0;
  int64_t startedAt = 0;
  int64_t endedAt = 0;
  double plateBeforeG = 0;
  double dispensedG = 0;
  double plateAfterG = 0;
};

enum class TipoEvento { Atasco, TolvaBaja };

struct Evento {
  std::string eventId;
  TipoEvento tipo = TipoEvento::Atasco;
  int64_t occurredAt = 0;
  std::string detalle;  // vacío = null
  int tolva = TOLVA_PERRO;
};

std::string jsonEstado(const Estado& estado);
std::string jsonEstadoDesconectado();  // LWT
std::string jsonVisita(const Visita& visita);
std::string jsonEvento(const Evento& evento);
// dispensedG NAN = null (comandos OTA); error vacío = null.
std::string jsonResultado(long id, bool ok, double dispensedG, const std::string& error);

// ---------------------------------------------------------------------------
// Temas
// ---------------------------------------------------------------------------
// Letras, números, '-' y '_', de 1 a 64 caracteres.
bool feederIdValido(const char* id);
// feeder/{id}/{sufijo}
std::string tema(const std::string& feederId, const char* sufijo);
constexpr const char* TEMA_HORA_GATEWAY = "gateway/time";

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
// 64 caracteres hex (mayúsculas o minúsculas). Devuelve la versión en minúsculas.
bool normalizarSha256(const char* texto, std::string& salida);
std::string bytesAHex(const uint8_t* bytes, size_t largo);
double redondear(double valor, int decimales);

}  // namespace logica
