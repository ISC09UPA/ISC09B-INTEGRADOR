#include "logica/planificador.h"

#include <ctype.h>
#include <stdlib.h>
#include <string.h>

namespace logica {

namespace {

constexpr int64_t SEGUNDOS_DIA = 86400;

std::string sinCerosIzquierda(const std::string& texto) {
  size_t i = texto.find_first_not_of('0');
  return i == std::string::npos ? "0" : texto.substr(i);
}

std::string limpiar(const std::string& texto) {
  std::string salida;
  for (char c : texto) {
    if (!isspace(static_cast<unsigned char>(c))) {
      salida += static_cast<char>(toupper(static_cast<unsigned char>(c)));
    }
  }
  return salida;
}

bool soloDigitos(const std::string& texto) {
  if (texto.empty()) return false;
  for (char c : texto) {
    if (!isdigit(static_cast<unsigned char>(c))) return false;
  }
  return true;
}

struct ZonaConocida {
  const char* iana;
  const char* posix;
};

// México dejó el horario de verano en 2022 salvo la franja fronteriza.
const ZonaConocida ZONAS[] = {
    {"America/Mexico_City", "CST6"},
    {"America/Monterrey", "CST6"},
    {"America/Merida", "CST6"},
    {"America/Bahia_Banderas", "CST6"},
    {"America/Chihuahua", "CST6"},
    {"America/Cancun", "EST5"},
    {"America/Mazatlan", "MST7"},
    {"America/Hermosillo", "MST7"},
    {"America/Tijuana", "PST8PDT,M3.2.0,M11.1.0"},
    {"America/Ciudad_Juarez", "MST7MDT,M3.2.0,M11.1.0"},
    {"America/Ojinaga", "CST6CDT,M3.2.0,M11.1.0"},
    {"America/Matamoros", "CST6CDT,M3.2.0,M11.1.0"},
    {"America/Los_Angeles", "PST8PDT,M3.2.0,M11.1.0"},
    {"America/Denver", "MST7MDT,M3.2.0,M11.1.0"},
    {"America/Chicago", "CST6CDT,M3.2.0,M11.1.0"},
    {"America/New_York", "EST5EDT,M3.2.0,M11.1.0"},
    {"America/Bogota", "<-05>5"},
    {"America/Lima", "<-05>5"},
    {"Europe/Madrid", "CET-1CEST,M3.5.0,M10.5.0/3"},
    {"UTC", "UTC0"},
    {"Etc/UTC", "UTC0"},
};

}  // namespace

int64_t medianocheDesde(int64_t ahora, int hora, int minuto, int segundo) {
  return ahora - (static_cast<int64_t>(hora) * 3600 + minuto * 60 + segundo);
}

ComidaDisponible comidaDisponible(const ConfigAlimentador& config, int petId, int64_t ahora,
                                  int64_t medianocheLocal, int64_t ultimaComida, int ventanaMin) {
  ComidaDisponible resultado;
  if (!config.buscarMascota(petId)) return resultado;

  // El horario más reciente que ya empezó (hoy o ayer, por si cruza la medianoche).
  int64_t inicio = -1;
  for (const Horario& h : config.horarios) {
    if (h.petId != SIN_MASCOTA && h.petId != petId) continue;
    for (int64_t dia : {medianocheLocal, medianocheLocal - SEGUNDOS_DIA}) {
      int64_t momento = dia + static_cast<int64_t>(h.minutoDelDia) * 60;
      if (momento <= ahora && momento > inicio) inicio = momento;
    }
  }
  if (inicio < 0) return resultado;
  if (ahora - inicio > static_cast<int64_t>(ventanaMin) * 60) return resultado;
  if (ultimaComida >= inicio) return resultado;  // ya se sirvió esta comida
  if (ultimaComida > 0 && config.minIntervalHours > 0 &&
      ahora - ultimaComida < static_cast<int64_t>(config.minIntervalHours) * 3600) {
    return resultado;
  }

  resultado.disponible = true;
  resultado.inicio = inicio;
  return resultado;
}

Identificacion identificarMascota(const ConfigAlimentador& config, Clase clase,
                                  const std::string& rfidLeido,
                                  const std::function<bool(int)>& tieneComida) {
  Identificacion id;
  if (clase != Clase::Perro && clase != Clase::Gato) return id;

  int unica = SIN_MASCOTA;
  int conComida = SIN_MASCOTA;
  int cuantosConComida = 0;
  for (const Mascota& m : config.mascotas) {
    if (m.especie != clase) continue;
    id.candidatos++;
    unica = m.id;
    if (!rfidLeido.empty() && !m.rfid.empty() && rfidCoincide(m.rfid, rfidLeido)) {
      id.petId = m.id;
      id.porRfid = true;
      return id;
    }
    if (tieneComida && tieneComida(m.id)) {
      conComida = m.id;
      cuantosConComida++;
    }
  }

  if (id.candidatos == 1) {
    id.petId = unica;
  } else if (cuantosConComida == 1) {
    id.petId = conComida;
  }
  return id;
}

bool rfidCoincide(const std::string& configurado, const std::string& leidoHex) {
  std::string conf = limpiar(configurado);
  std::string leido = limpiar(leidoHex);
  if (conf.empty() || leido.empty()) return false;
  if (conf == leido) return true;

  // Número decimal impreso en el llavero = últimos 4 bytes de la etiqueta.
  if (soloDigitos(conf) && leido.size() >= 8) {
    unsigned long numero = strtoul(leido.substr(leido.size() - 8).c_str(), nullptr, 16);
    return sinCerosIzquierda(conf) == std::to_string(numero);
  }
  return false;
}

const char* zonaPosix(const char* iana) {
  if (!iana) return nullptr;
  for (const ZonaConocida& z : ZONAS) {
    if (strcmp(z.iana, iana) == 0) return z.posix;
  }
  return nullptr;
}

}  // namespace logica
