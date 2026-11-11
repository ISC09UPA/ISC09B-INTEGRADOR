#pragma once

// Hora del sistema: NTP (primero la Pi, luego pool.ntp.org) y, si NTP no responde,
// la hora que publica la Pi en gateway/time.

#include <stdint.h>

namespace reloj {

void iniciar();
// Zona IANA de la config (America/Mexico_City). Si no se conoce se queda la anterior.
void fijarZona(const char* iana);
void ajustarDesdeGateway(int64_t ahoraGateway);

bool valido();
// Hora Unix en segundos; 0 si todavía no hay hora válida.
int64_t ahora();
// Hora Unix y medianoche local de hoy; false si no hay hora válida.
bool horaLocal(int64_t& ahora, int64_t& medianocheLocal);

}  // namespace reloj
