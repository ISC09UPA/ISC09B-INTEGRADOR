#include "logica/clasificador.h"

#include <math.h>

namespace logica {

void normalizarProbabilidades(float* valores, size_t n) {
  if (n == 0) return;
  float suma = 0;
  bool enRango = true;
  for (size_t i = 0; i < n; i++) {
    if (isnan(valores[i]) || valores[i] < 0 || valores[i] > 1) enRango = false;
    suma += valores[i];
  }
  if (enRango && fabsf(suma - 1.0f) < 0.05f) return;

  float maximo = valores[0];
  for (size_t i = 1; i < n; i++) {
    if (valores[i] > maximo) maximo = valores[i];
  }
  suma = 0;
  for (size_t i = 0; i < n; i++) {
    valores[i] = expf(valores[i] - maximo);
    suma += valores[i];
  }
  for (size_t i = 0; i < n; i++) valores[i] /= suma;
}

ResultadoClase elegirClase(const float* probabilidades, size_t n) {
  ResultadoClase r;
  if (n > NUM_CLASES) n = NUM_CLASES;
  float mejor = -1;
  for (size_t i = 0; i < n; i++) {
    if (probabilidades[i] > mejor) {
      mejor = probabilidades[i];
      r.clase = static_cast<Clase>(i);
    }
  }
  r.confianza = mejor < 0 ? 0 : mejor;
  return r;
}

bool esDudosa(const ResultadoClase& resultado, float umbral) {
  return resultado.confianza < umbral;
}

void CombinadorFotos::agregar(const float* probabilidades, size_t n) {
  if (n > NUM_CLASES) n = NUM_CLASES;
  for (size_t i = 0; i < n; i++) suma_[i] += probabilidades[i];
  fotos_++;
}

ResultadoClase CombinadorFotos::resultado() const {
  if (fotos_ == 0) return ResultadoClase{};
  float promedio[NUM_CLASES];
  for (size_t i = 0; i < NUM_CLASES; i++) promedio[i] = suma_[i] / fotos_;
  return elegirClase(promedio, NUM_CLASES);
}

void CombinadorFotos::reiniciar() {
  for (float& s : suma_) s = 0;
  fotos_ = 0;
}

void recortarYEscalarRgb(const uint8_t* origen, int ancho, int alto, uint8_t* destino, int dw,
                         int dh) {
  int lado = ancho < alto ? ancho : alto;
  int x0 = (ancho - lado) / 2;
  int y0 = (alto - lado) / 2;
  for (int y = 0; y < dh; y++) {
    int sy = y0 + y * lado / dh;
    for (int x = 0; x < dw; x++) {
      int sx = x0 + x * lado / dw;
      const uint8_t* p = origen + (static_cast<size_t>(sy) * ancho + sx) * 3;
      uint8_t* q = destino + (static_cast<size_t>(y) * dw + x) * 3;
      q[0] = p[0];
      q[1] = p[1];
      q[2] = p[2];
    }
  }
}

int32_t cuantizar(float valor, float escala, int32_t puntoCero, int32_t minimo, int32_t maximo) {
  if (!(escala > 0)) return puntoCero;
  int32_t q = static_cast<int32_t>(lroundf(valor / escala)) + puntoCero;
  if (q < minimo) q = minimo;
  if (q > maximo) q = maximo;
  return q;
}

}  // namespace logica
