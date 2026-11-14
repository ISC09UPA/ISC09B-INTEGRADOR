#include "reloj.h"

#include <Arduino.h>
#include <Wire.h>
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
volatile bool guardarEnRtc = false;  // el aviso de SNTP llega desde otra tarea
bool hayRtc = false;

void alSincronizarNtp(struct timeval*) {
  ultimaSincronizacionNtpMs = millis();
  huboNtp = true;
  guardarEnRtc = true;
}

// --- DS3231 (J18). Guarda la hora en UTC para no depender de la zona horaria. ---

uint8_t aBcd(int v) { return static_cast<uint8_t>(((v / 10) << 4) | (v % 10)); }
int deBcd(uint8_t v) { return (v >> 4) * 10 + (v & 0x0F); }

bool leerRtc(time_t& t) {
  Wire.beginTransmission(DS3231_DIRECCION);
  Wire.write(0x00);
  if (Wire.endTransmission(false) != 0) return false;
  if (Wire.requestFrom(static_cast<uint8_t>(DS3231_DIRECCION), static_cast<uint8_t>(7)) != 7) {
    return false;
  }
  uint8_t r[7];
  for (uint8_t& b : r) b = static_cast<uint8_t>(Wire.read());
  struct tm utc = {};
  utc.tm_sec = deBcd(r[0] & 0x7F);
  utc.tm_min = deBcd(r[1] & 0x7F);
  utc.tm_hour = deBcd(r[2] & 0x3F);  // se escribe siempre en formato de 24 h
  utc.tm_mday = deBcd(r[4] & 0x3F);
  utc.tm_mon = deBcd(r[5] & 0x1F) - 1;
  utc.tm_year = deBcd(r[6]) + 100 + ((r[5] & 0x80) ? 100 : 0);
  // Días desde 1970 sin depender de TZ (timegm no existe en newlib).
  int y = utc.tm_year + 1900, m = utc.tm_mon + 1;
  if (m <= 2) { y--; m += 12; }
  int64_t dias = 365LL * y + y / 4 - y / 100 + y / 400 + (153 * (m - 3) + 2) / 5 + utc.tm_mday - 719469;
  t = static_cast<time_t>(dias * 86400 + utc.tm_hour * 3600 + utc.tm_min * 60 + utc.tm_sec);
  return true;
}

bool escribirRtc(time_t t) {
  struct tm utc;
  gmtime_r(&t, &utc);
  Wire.beginTransmission(DS3231_DIRECCION);
  Wire.write(0x00);
  Wire.write(aBcd(utc.tm_sec));
  Wire.write(aBcd(utc.tm_min));
  Wire.write(aBcd(utc.tm_hour));
  Wire.write(aBcd(utc.tm_wday + 1));
  Wire.write(aBcd(utc.tm_mday));
  Wire.write(static_cast<uint8_t>(aBcd(utc.tm_mon + 1) | (utc.tm_year >= 200 ? 0x80 : 0)));
  Wire.write(aBcd(utc.tm_year % 100));
  if (Wire.endTransmission() != 0) return false;
  // Borra la bandera OSF (oscilador detenido) del registro de estado.
  Wire.beginTransmission(DS3231_DIRECCION);
  Wire.write(0x0F);
  Wire.write(0x00);
  return Wire.endTransmission() == 0;
}

bool rtcPerdioHora() {
  Wire.beginTransmission(DS3231_DIRECCION);
  Wire.write(0x0F);
  if (Wire.endTransmission(false) != 0) return true;
  if (Wire.requestFrom(static_cast<uint8_t>(DS3231_DIRECCION), static_cast<uint8_t>(1)) != 1) {
    return true;
  }
  return (Wire.read() & 0x80) != 0;
}

bool ntpVigente() { return huboNtp && millis() - ultimaSincronizacionNtpMs < NTP_VIGENTE_MS; }

}  // namespace

void iniciar() {
  // El bus I2C ya lo abrió expansor::iniciar(). Con la hora del DS3231 los horarios funcionan
  // aunque no haya red al arrancar.
  time_t rtc = 0;
  hayRtc = leerRtc(rtc);
  if (!hayRtc) {
    log_w("DS3231 sin respuesta");
  } else if (!rtcPerdioHora() && rtc >= HORA_MINIMA_VALIDA) {
    struct timeval tv = {rtc, 0};
    settimeofday(&tv, nullptr);
    log_i("Hora tomada del DS3231");
  }
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
  guardarEnRtc = true;
  log_i("Hora ajustada con gateway/time (diferencia %lld s)", static_cast<long long>(diferencia));
}

void atender() {
  if (!guardarEnRtc || !hayRtc || !valido()) return;
  guardarEnRtc = false;
  if (!escribirRtc(time(nullptr))) log_w("No se pudo guardar la hora en el DS3231");
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
