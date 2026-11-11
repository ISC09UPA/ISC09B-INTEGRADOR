#include "logica/protocolo.h"

#include <ArduinoJson.h>
#include <ctype.h>
#include <math.h>
#include <string.h>

namespace logica {

namespace {

const char* const NOMBRES_CLASE[NUM_CLASES] = {"Perro", "Gato", "Paloma", "Nada"};

void fijarDetalle(std::string* detalle, const std::string& texto) {
  if (detalle) *detalle = texto;
}

// Número con decimales o null si es NAN.
void numeroONulo(JsonObject obj, const char* clave, double valor, int decimales) {
  if (isnan(valor)) {
    obj[clave] = nullptr;
  } else {
    obj[clave] = redondear(valor, decimales);
  }
}

void textoONulo(JsonObject obj, const char* clave, const std::string& valor) {
  if (valor.empty()) {
    obj[clave] = nullptr;
  } else {
    obj[clave] = valor;
  }
}

std::string serializar(const JsonDocument& doc) {
  std::string salida;
  serializeJson(doc, salida);
  return salida;
}

bool empiezaCon(const std::string& texto, const char* prefijo) {
  return texto.compare(0, strlen(prefijo), prefijo) == 0;
}

}  // namespace

const char* nombreClase(Clase clase) {
  size_t i = static_cast<size_t>(clase);
  return i < NUM_CLASES ? NOMBRES_CLASE[i] : "Nada";
}

bool claseDesdeTexto(const char* texto, Clase& clase) {
  if (!texto) return false;
  for (size_t i = 0; i < NUM_CLASES; i++) {
    if (strcmp(texto, NOMBRES_CLASE[i]) == 0) {
      clase = static_cast<Clase>(i);
      return true;
    }
  }
  return false;
}

int tolvaDeClase(Clase clase) {
  switch (clase) {
    case Clase::Perro:
      return TOLVA_PERRO;
    case Clase::Gato:
      return TOLVA_GATO;
    default:
      return 0;
  }
}

const Mascota* ConfigAlimentador::buscarMascota(int id) const {
  for (const Mascota& m : mascotas) {
    if (m.id == id) return &m;
  }
  return nullptr;
}

bool parsearHora(const char* texto, int& minutos) {
  if (!texto || strlen(texto) != 5 || texto[2] != ':') return false;
  for (int i : {0, 1, 3, 4}) {
    if (!isdigit(static_cast<unsigned char>(texto[i]))) return false;
  }
  int h = (texto[0] - '0') * 10 + (texto[1] - '0');
  int m = (texto[3] - '0') * 10 + (texto[4] - '0');
  if (h > 23 || m > 59) return false;
  minutos = h * 60 + m;
  return true;
}

ErrorConfig parsearConfig(const char* json, size_t largo, const char* feederEsperado,
                          ConfigAlimentador& salida, std::string* detalle) {
  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, json, largo);
  if (err || !doc.is<JsonObjectConst>()) {
    fijarDetalle(detalle, err ? err.c_str() : "no es un objeto");
    return ErrorConfig::JsonInvalido;
  }
  JsonObjectConst raiz = doc.as<JsonObjectConst>();

  const char* feederId = raiz["feederId"];
  if (!feederId) {
    fijarDetalle(detalle, "feederId");
    return ErrorConfig::CampoFaltante;
  }
  if (feederEsperado && strcmp(feederId, feederEsperado) != 0) {
    fijarDetalle(detalle, feederId);
    return ErrorConfig::FeederIncorrecto;
  }
  if (!raiz["version"].is<int>()) {
    fijarDetalle(detalle, "version");
    return ErrorConfig::CampoFaltante;
  }

  ConfigAlimentador nueva;
  nueva.feederId = feederId;
  nueva.version = raiz["version"].as<int>();
  if (nueva.version < 0) {
    fijarDetalle(detalle, "version");
    return ErrorConfig::ValorInvalido;
  }

  JsonVariantConst intervalo = raiz["minIntervalHours"];
  if (!intervalo.isNull()) {
    if (!intervalo.is<int>() || intervalo.as<int>() < 0 ||
        intervalo.as<int>() > MAX_INTERVALO_HORAS) {
      fijarDetalle(detalle, "minIntervalHours");
      return ErrorConfig::ValorInvalido;
    }
    nueva.minIntervalHours = intervalo.as<int>();
  }

  const char* zona = raiz["timeZone"];
  if (zona && *zona) nueva.zonaHoraria = zona;

  JsonVariantConst pets = raiz["pets"];
  if (!pets.isNull() && !pets.is<JsonArrayConst>()) {
    fijarDetalle(detalle, "pets");
    return ErrorConfig::ValorInvalido;
  }
  for (JsonVariantConst p : pets.as<JsonArrayConst>()) {
    if (nueva.mascotas.size() >= MAX_MASCOTAS) {
      fijarDetalle(detalle, "demasiadas mascotas");
      return ErrorConfig::ValorInvalido;
    }
    Mascota m;
    if (!p["id"].is<int>() || p["id"].as<int>() <= 0) {
      fijarDetalle(detalle, "pets[].id");
      return ErrorConfig::ValorInvalido;
    }
    m.id = p["id"].as<int>();
    if (nueva.buscarMascota(m.id)) {
      fijarDetalle(detalle, "pets[].id repetido");
      return ErrorConfig::ValorInvalido;
    }
    const char* nombre = p["name"];
    m.nombre = nombre ? nombre : "";

    Clase especie;
    if (!claseDesdeTexto(p["species"].as<const char*>(), especie) ||
        (especie != Clase::Perro && especie != Clase::Gato)) {
      fijarDetalle(detalle, "pets[].species");
      return ErrorConfig::ValorInvalido;
    }
    m.especie = especie;

    if (!p["hopper"].is<int>() || p["hopper"].as<int>() != tolvaDeClase(especie)) {
      fijarDetalle(detalle, "pets[].hopper");
      return ErrorConfig::ValorInvalido;
    }
    m.tolva = p["hopper"].as<int>();

    JsonVariantConst rfid = p["rfid"];
    if (!rfid.isNull()) {
      if (!rfid.is<const char*>()) {
        fijarDetalle(detalle, "pets[].rfid");
        return ErrorConfig::ValorInvalido;
      }
      m.rfid = rfid.as<const char*>();
    }

    JsonVariantConst gramos = p["gramsPerMeal"];
    if (!gramos.is<double>() || gramos.as<double>() <= 0 ||
        gramos.as<double>() > MAX_GRAMOS_RACION) {
      fijarDetalle(detalle, "pets[].gramsPerMeal");
      return ErrorConfig::ValorInvalido;
    }
    m.gramosPorComida = gramos.as<double>();
    nueva.mascotas.push_back(m);
  }

  JsonVariantConst schedules = raiz["schedules"];
  if (!schedules.isNull() && !schedules.is<JsonArrayConst>()) {
    fijarDetalle(detalle, "schedules");
    return ErrorConfig::ValorInvalido;
  }
  for (JsonVariantConst s : schedules.as<JsonArrayConst>()) {
    if (nueva.horarios.size() >= MAX_HORARIOS) {
      fijarDetalle(detalle, "demasiados horarios");
      return ErrorConfig::ValorInvalido;
    }
    Horario h;
    JsonVariantConst petId = s["petId"];
    if (!petId.isNull()) {
      if (!petId.is<int>() || !nueva.buscarMascota(petId.as<int>())) {
        fijarDetalle(detalle, "schedules[].petId");
        return ErrorConfig::ValorInvalido;
      }
      h.petId = petId.as<int>();
    }
    if (!parsearHora(s["time"].as<const char*>(), h.minutoDelDia)) {
      fijarDetalle(detalle, "schedules[].time");
      return ErrorConfig::ValorInvalido;
    }
    nueva.horarios.push_back(h);
  }

  salida = nueva;
  return ErrorConfig::Ok;
}

const char* textoErrorConfig(ErrorConfig error) {
  switch (error) {
    case ErrorConfig::Ok:
      return "ok";
    case ErrorConfig::JsonInvalido:
      return "JSON invalido";
    case ErrorConfig::FeederIncorrecto:
      return "feederId de otro alimentador";
    case ErrorConfig::CampoFaltante:
      return "falta un campo";
    case ErrorConfig::ValorInvalido:
      return "valor invalido";
  }
  return "?";
}

bool normalizarSha256(const char* texto, std::string& salida) {
  if (!texto || strlen(texto) != 64) return false;
  std::string resultado(64, '0');
  for (size_t i = 0; i < 64; i++) {
    unsigned char c = static_cast<unsigned char>(texto[i]);
    if (!isxdigit(c)) return false;
    resultado[i] = static_cast<char>(tolower(c));
  }
  salida = resultado;
  return true;
}

std::string bytesAHex(const uint8_t* bytes, size_t largo) {
  static const char DIGITOS[] = "0123456789abcdef";
  std::string salida;
  salida.reserve(largo * 2);
  for (size_t i = 0; i < largo; i++) {
    salida += DIGITOS[bytes[i] >> 4];
    salida += DIGITOS[bytes[i] & 0x0F];
  }
  return salida;
}

double redondear(double valor, int decimales) {
  double factor = pow(10.0, decimales);
  return round(valor * factor) / factor;
}

ErrorComando parsearComando(const char* json, size_t largo, Comando& salida, long& idLeido) {
  idLeido = 0;
  JsonDocument doc;
  if (deserializeJson(doc, json, largo) || !doc.is<JsonObjectConst>()) {
    return ErrorComando::JsonInvalido;
  }
  JsonObjectConst raiz = doc.as<JsonObjectConst>();

  if (!raiz["id"].is<long>() || raiz["id"].as<long>() <= 0) return ErrorComando::SinId;
  Comando cmd;
  cmd.id = raiz["id"].as<long>();
  idLeido = cmd.id;

  const char* tipo = raiz["type"];
  if (tipo && strcmp(tipo, "dispense") == 0) {
    cmd.tipo = TipoComando::Dispensar;

    JsonVariantConst gramos = raiz["grams"];
    if (!gramos.isNull()) {
      if (!gramos.is<double>()) return ErrorComando::GramosInvalidos;
      cmd.gramos = gramos.as<double>();
      if (!(cmd.gramos > 0) || cmd.gramos > MAX_GRAMOS_COMANDO) {
        return ErrorComando::GramosInvalidos;
      }
      cmd.tieneGramos = true;
    }

    JsonVariantConst petId = raiz["petId"];
    if (!petId.isNull()) {
      if (!petId.is<int>() || petId.as<int>() <= 0) return ErrorComando::MascotaDesconocida;
      cmd.petId = petId.as<int>();
    }

    JsonVariantConst tolva = raiz["hopper"];
    if (!tolva.isNull()) {
      if (!tolva.is<int>()) return ErrorComando::TolvaInvalida;
      cmd.tolva = tolva.as<int>();
      if (cmd.tolva != TOLVA_PERRO && cmd.tolva != TOLVA_GATO) return ErrorComando::TolvaInvalida;
    }

    if (cmd.petId == SIN_MASCOTA && cmd.tolva == 0) return ErrorComando::FaltaDestino;
  } else if (tipo && strcmp(tipo, "ota") == 0) {
    cmd.tipo = TipoComando::Ota;

    const char* objetivo = raiz["target"];
    if (objetivo && strcmp(objetivo, "firmware") == 0) {
      cmd.objetivo = ObjetivoOta::Firmware;
    } else if (objetivo && strcmp(objetivo, "model") == 0) {
      cmd.objetivo = ObjetivoOta::Modelo;
    } else {
      return ErrorComando::ObjetivoInvalido;
    }

    const char* url = raiz["url"];
    if (!url) return ErrorComando::UrlInvalida;
    cmd.url = url;
    bool esHttp = empiezaCon(cmd.url, "http://") && cmd.url.size() > strlen("http://");
    bool esHttps = empiezaCon(cmd.url, "https://") && cmd.url.size() > strlen("https://");
    if ((!esHttp && !esHttps) || cmd.url.find_first_of(" \t\r\n") != std::string::npos) {
      return ErrorComando::UrlInvalida;
    }

    if (!normalizarSha256(raiz["sha256"].as<const char*>(), cmd.sha256)) {
      return ErrorComando::Sha256Invalido;
    }

    const char* version = raiz["version"];
    cmd.version = version ? version : "";
  } else {
    return ErrorComando::TipoDesconocido;
  }

  salida = cmd;
  return ErrorComando::Ok;
}

const char* textoErrorComando(ErrorComando error) {
  switch (error) {
    case ErrorComando::Ok:
      return "ok";
    case ErrorComando::JsonInvalido:
      return "JSON invalido";
    case ErrorComando::SinId:
      return "falta id";
    case ErrorComando::TipoDesconocido:
      return "tipo de comando desconocido";
    case ErrorComando::GramosInvalidos:
      return "gramos invalidos";
    case ErrorComando::TolvaInvalida:
      return "tolva invalida";
    case ErrorComando::MascotaDesconocida:
      return "mascota desconocida";
    case ErrorComando::FaltaDestino:
      return "falta petId o hopper";
    case ErrorComando::ObjetivoInvalido:
      return "target invalido";
    case ErrorComando::UrlInvalida:
      return "url invalida";
    case ErrorComando::Sha256Invalido:
      return "sha256 invalido";
  }
  return "?";
}

ErrorComando resolverDispensado(const Comando& cmd, const ConfigAlimentador& config, int& tolva,
                                double& gramos) {
  const Mascota* mascota = nullptr;
  if (cmd.petId != SIN_MASCOTA) {
    mascota = config.buscarMascota(cmd.petId);
    if (!mascota && (cmd.tolva == 0 || !cmd.tieneGramos)) return ErrorComando::MascotaDesconocida;
  }

  if (cmd.tolva != 0) {
    if (mascota && mascota->tolva != cmd.tolva) return ErrorComando::TolvaInvalida;
    tolva = cmd.tolva;
  } else if (mascota) {
    tolva = mascota->tolva;
  } else {
    return ErrorComando::FaltaDestino;
  }

  if (cmd.tieneGramos) {
    gramos = cmd.gramos;
  } else if (mascota) {
    gramos = mascota->gramosPorComida;
  } else {
    return ErrorComando::GramosInvalidos;
  }
  return ErrorComando::Ok;
}

bool parsearHoraGateway(const char* json, size_t largo, int64_t& ahora) {
  JsonDocument doc;
  if (deserializeJson(doc, json, largo)) return false;
  JsonVariantConst now = doc["now"];
  if (!now.is<int64_t>() || now.as<int64_t>() <= 0) return false;
  ahora = now.as<int64_t>();
  return true;
}

std::string jsonEstado(const Estado& estado) {
  JsonDocument doc;
  JsonObject obj = doc.to<JsonObject>();
  obj["online"] = true;
  numeroONulo(obj, "hopperDogPct", estado.hopperDogPct, 1);
  numeroONulo(obj, "hopperCatPct", estado.hopperCatPct, 1);
  numeroONulo(obj, "plateDogG", estado.plateDogG, 1);
  numeroONulo(obj, "plateCatG", estado.plateCatG, 1);
  obj["firmware"] = estado.firmware;
  textoONulo(obj, "model", estado.modelo);
  obj["reportedAt"] = estado.reportedAt;
  return serializar(doc);
}

std::string jsonEstadoDesconectado() { return "{\"online\":false}"; }

std::string jsonVisita(const Visita& v) {
  JsonDocument doc;
  JsonObject obj = doc.to<JsonObject>();
  obj["eventId"] = v.eventId;
  if (v.petId == SIN_MASCOTA) {
    obj["petId"] = nullptr;
  } else {
    obj["petId"] = v.petId;
  }
  obj["class"] = nombreClase(v.clase);
  obj["confidence"] = redondear(v.confianza, 3);
  obj["startedAt"] = v.startedAt;
  obj["endedAt"] = v.endedAt;
  obj["plateBeforeG"] = redondear(v.plateBeforeG, 1);
  obj["dispensedG"] = redondear(v.dispensedG, 1);
  obj["plateAfterG"] = redondear(v.plateAfterG, 1);
  return serializar(doc);
}

std::string jsonEvento(const Evento& e) {
  JsonDocument doc;
  JsonObject obj = doc.to<JsonObject>();
  obj["eventId"] = e.eventId;
  obj["type"] = e.tipo == TipoEvento::Atasco ? "JAM" : "HOPPER_LOW";
  obj["occurredAt"] = e.occurredAt;
  textoONulo(obj, "detail", e.detalle);
  obj["hopper"] = e.tolva;
  return serializar(doc);
}

std::string jsonResultado(long id, bool ok, double dispensedG, const std::string& error) {
  JsonDocument doc;
  JsonObject obj = doc.to<JsonObject>();
  obj["id"] = id;
  obj["ok"] = ok;
  numeroONulo(obj, "dispensedG", dispensedG, 1);
  textoONulo(obj, "error", error);
  return serializar(doc);
}

bool feederIdValido(const char* id) {
  if (!id) return false;
  size_t largo = strlen(id);
  if (largo == 0 || largo > 64) return false;
  for (size_t i = 0; i < largo; i++) {
    unsigned char c = static_cast<unsigned char>(id[i]);
    if (!isalnum(c) && c != '-' && c != '_') return false;
  }
  return true;
}

std::string tema(const std::string& feederId, const char* sufijo) {
  return "feeder/" + feederId + "/" + sufijo;
}

}  // namespace logica
