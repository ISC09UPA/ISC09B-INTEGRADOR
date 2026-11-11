#pragma once

// Decide cuándo le toca comer a cada mascota y quién es la mascota que llegó al plato.
//
// Un horario "abre" una comida para la mascota (o para todas si petId es null). La comida se
// sirve cuando la mascota llega y la cámara (y el RFID si hay) la reconocen. Sigue disponible
// `ventanaMin` minutos o hasta que se sirva; nunca se sirve antes de `minIntervalHours` desde la
// comida anterior de esa mascota (incluye dispensados manuales).

#include <stdint.h>

#include <functional>
#include <string>

#include "logica/protocolo.h"

namespace logica {

struct ComidaDisponible {
  bool disponible = false;
  int64_t inicio = 0;  // hora Unix en que abrió el horario que la habilita
};

// `medianocheLocal` = hora Unix de las 00:00 locales de hoy (la calcula el llamador con
// localtime_r). `ultimaComida` = hora Unix de la última comida servida (0 = nunca).
ComidaDisponible comidaDisponible(const ConfigAlimentador& config, int petId, int64_t ahora,
                                  int64_t medianocheLocal, int64_t ultimaComida, int ventanaMin);

// Hora Unix de la medianoche local a partir de la hora local desglosada.
int64_t medianocheDesde(int64_t ahora, int hora, int minuto, int segundo);

struct Identificacion {
  int petId = SIN_MASCOTA;
  bool porRfid = false;
  int candidatos = 0;  // mascotas de esa especie
};

// Perro/Gato con RFID: la mascota con esa etiqueta (si es de la especie vista).
// Sin RFID: la única mascota de esa especie; si hay varias, la única que tiene comida
// disponible. Nada: ninguna.
Identificacion identificarMascota(const ConfigAlimentador& config, Clase clase,
                                  const std::string& rfidLeido,
                                  const std::function<bool(int)>& tieneComida);

// Compara la etiqueta guardada en el backend con la leída (10 hex del RDM6300). Acepta el
// mismo hex sin importar mayúsculas, o el número decimal impreso en el llavero (últimos
// 8 hex), con o sin ceros a la izquierda.
bool rfidCoincide(const std::string& configurado, const std::string& leidoHex);

// IANA (America/Mexico_City) a la cadena TZ de POSIX que usa newlib; nullptr si no se conoce.
const char* zonaPosix(const char* iana);

}  // namespace logica
