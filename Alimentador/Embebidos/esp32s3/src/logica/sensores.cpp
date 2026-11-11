#include "logica/sensores.h"

#include <ctype.h>
#include <math.h>
#include <string.h>

#include <algorithm>

namespace logica {

namespace {

int valorHex(char c) {
  if (c >= '0' && c <= '9') return c - '0';
  if (c >= 'A' && c <= 'F') return c - 'A' + 10;
  if (c >= 'a' && c <= 'f') return c - 'a' + 10;
  return -1;
}

}  // namespace

double porcentajeTolva(double distanciaCm, double distanciaVaciaCm, double distanciaLlenaCm) {
  if (isnan(distanciaCm) || distanciaCm < 0) return NAN;
  double rango = distanciaVaciaCm - distanciaLlenaCm;
  if (!(rango > 0)) return NAN;
  double pct = (distanciaVaciaCm - distanciaCm) / rango * 100.0;
  if (pct < 0) pct = 0;
  if (pct > 100) pct = 100;
  return pct;
}

double mediana(double* valores, size_t n) {
  size_t validos = 0;
  for (size_t i = 0; i < n; i++) {
    if (!isnan(valores[i])) valores[validos++] = valores[i];
  }
  if (validos == 0) return NAN;
  std::sort(valores, valores + validos);
  if (validos % 2 == 1) return valores[validos / 2];
  return (valores[validos / 2 - 1] + valores[validos / 2]) / 2.0;
}

double distanciaDesdeEcoUs(uint32_t ecoUs) {
  if (ecoUs == 0) return NAN;
  double cm = ecoUs / 58.0;  // ida y vuelta a ~343 m/s
  if (cm < 2.0 || cm > 400.0) return NAN;
  return cm;
}

bool AlarmaNivel::actualizar(double porcentaje) {
  if (isnan(porcentaje)) return false;
  if (!baja_ && porcentaje < umbralBajo_) {
    baja_ = true;
    return true;
  }
  if (baja_ && porcentaje > umbralRearme_) baja_ = false;
  return false;
}

bool cambioRelevante(double anterior, double actual, double umbral) {
  if (isnan(anterior) != isnan(actual)) return true;
  if (isnan(actual)) return false;
  return fabs(actual - anterior) >= umbral;
}

bool LectorRdm6300::alimentar(uint8_t byte) {
  if (byte == 0x02) {
    dentro_ = true;
    largo_ = 0;
    return false;
  }
  if (!dentro_) return false;

  if (byte == 0x03) {
    dentro_ = false;
    if (largo_ != 12) return false;
    uint8_t xorDatos = 0;
    for (size_t i = 0; i < 12; i += 2) {
      int alto = valorHex(buffer_[i]);
      int bajo = valorHex(buffer_[i + 1]);
      if (alto < 0 || bajo < 0) return false;
      uint8_t b = static_cast<uint8_t>(alto << 4 | bajo);
      if (i < 10) {
        xorDatos ^= b;
      } else if (b != xorDatos) {
        return false;
      }
    }
    for (size_t i = 0; i < 10; i++) {
      etiqueta_[i] = static_cast<char>(toupper(static_cast<unsigned char>(buffer_[i])));
    }
    etiqueta_[10] = '\0';
    return true;
  }

  if (largo_ >= sizeof(buffer_)) {
    dentro_ = false;  // trama demasiado larga: se descarta
    return false;
  }
  buffer_[largo_++] = static_cast<char>(byte);
  return false;
}

}  // namespace logica
