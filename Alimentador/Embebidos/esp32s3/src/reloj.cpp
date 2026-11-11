#include "reloj.h"

#include <Arduino.h>
#include <esp_sntp.h>
#include <sys/time.h>
#include <time.h>

#include "config.h"
#include "credenciales.h"
#include "logica/planificador.h"

namespace reloj {

namespace {

constexpr int64_t HORA_MINIMA_VALIDA = 1704067200;  // 2024-01-01: antes de esto no hay hora
constexpr uint32_t NTP_VIGENTE_MS = 3600UL * 1000UL;

volatile uint32_t ultimaSincronizacionNtpMs = 0;
volatile bool huboNtp = false;

void alSincronizarNtp(struct timeval*) {
  ultimaSincronizacionNtpMs = millis();
  huboNtp = true;
}

bool ntpVigente() { return huboNtp && millis() - ultimaSincronizacionNtpMs < NTP_VIGENTE_MS; }

}  // namespace

void iniciar() {
  sntp_set_time_sync_notification_cb(alSincronizarNtp);
  // configTzTime deja la zona y arranca SNTP en segundo plano.
  configTzTime(logica::zonaPosix("America/Mexico_City"), GATEWAY_HOST, NTP_SERVIDOR_RESPALDO);
}

void fijarZona(const char* iana) {
  const char* posix = logica::zonaPosix(iana);
  if (!posix) {
    log_w("Zona horaria %s desconocida, se conserva la anterior", iana ? iana : "(null)");
    return;
  }
  setenv("TZ", posix, 1);
  tzset();
}

void ajustarDesdeGateway(int64_t ahoraGateway) {
  if (ahoraGateway < HORA_MINIMA_VALIDA) return;
  int64_t local = static_cast<int64_t>(time(nullptr));
  int64_t diferencia = ahoraGateway - local;
  if (diferencia < 0) diferencia = -diferencia;
  if (valido() && (ntpVigente() || diferencia <= 2)) return;

  struct timeval tv = {static_cast<time_t>(ahoraGateway), 0};
  settimeofday(&tv, nullptr);
  log_i("Hora ajustada con gateway/time (diferencia %lld s)", static_cast<long long>(diferencia));
}

bool valido() { return static_cast<int64_t>(time(nullptr)) >= HORA_MINIMA_VALIDA; }

int64_t ahora() { return valido() ? static_cast<int64_t>(time(nullptr)) : 0; }

bool horaLocal(int64_t& ahoraUnix, int64_t& medianocheLocal) {
  if (!valido()) return false;
  time_t t = time(nullptr);
  struct tm local;
  localtime_r(&t, &local);
  ahoraUnix = static_cast<int64_t>(t);
  medianocheLocal = logica::medianocheDesde(ahoraUnix, local.tm_hour, local.tm_min, local.tm_sec);
  return true;
}

}  // namespace reloj
