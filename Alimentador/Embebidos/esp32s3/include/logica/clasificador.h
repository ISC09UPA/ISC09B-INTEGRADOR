#pragma once

// Pasos del reconocimiento que no dependen de la cámara ni de TFLite:
// preprocesar la imagen, interpretar las salidas del modelo y combinar varias fotos.

#include <stddef.h>
#include <stdint.h>

#include "logica/protocolo.h"

namespace logica {

struct ResultadoClase {
  Clase clase = Clase::Nada;
  float confianza = 0;
};

// Convierte las salidas del modelo (ya descuantizadas) en probabilidades.
// Si ya suman ~1 y están en [0, 1] se dejan igual; si no, se aplica softmax.
void normalizarProbabilidades(float* valores, size_t n);

// Clase con mayor probabilidad. El orden de las salidas es Perro, Gato, Nada.
ResultadoClase elegirClase(const float* probabilidades, size_t n);

bool esDudosa(const ResultadoClase& resultado, float umbral);

// Promedia las probabilidades de varias fotos de la misma visita.
class CombinadorFotos {
 public:
  void agregar(const float* probabilidades, size_t n);
  size_t fotos() const { return fotos_; }
  ResultadoClase resultado() const;
  void reiniciar();

 private:
  float suma_[NUM_CLASES] = {};
  size_t fotos_ = 0;
};

// Recorta al centro el cuadrado más grande y lo escala (vecino más cercano) a dw x dh.
// Imágenes RGB888 de 3 bytes por pixel.
void recortarYEscalarRgb(const uint8_t* origen, int ancho, int alto, uint8_t* destino, int dw,
                         int dh);

// Cuantiza un valor real con la escala y el punto cero del tensor de entrada.
int32_t cuantizar(float valor, float escala, int32_t puntoCero, int32_t minimo, int32_t maximo);

}  // namespace logica
