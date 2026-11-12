#pragma once

// Cámara OV2640 + modelo TFLite Micro cargado desde LittleFS (/model.tflite).
// Salidas del modelo en este orden: Perro, Gato, Nada.

#include <stdint.h>

#include <string>
#include <vector>

#include "logica/clasificador.h"

namespace vision {

struct Captura {
  logica::ResultadoClase resultado;
  std::vector<uint8_t> jpeg;  // foto con la confianza más alta, para subirla si es dudosa
  int64_t tomadaEn = 0;
};

bool iniciarCamara();

bool cargarModelo();
void liberarModelo();
bool modeloCargado();
std::string versionModelo();  // contenido de /model.ver; vacío si no hay modelo

// Toma `fotos` imágenes, las clasifica y promedia. false si falla la cámara o no hay modelo
// (en ese caso igual intenta dejar una foto en `salida.jpeg`).
bool reconocer(uint8_t fotos, Captura& salida);

// Para depurar: toma una sola foto, la clasifica y deja en `rgb` el recorte que recibe el
// modelo (RGB888, `ancho` x `alto`, ya en el orden de color que usa el modelo) y en
// `probabilidades` las NUM_CLASES salidas. El búfer es interno: úsalo antes de otra foto.
bool depurarEntrada(float* probabilidades, const uint8_t*& rgb, int& ancho, int& alto);

// POST /photos de la Pi con la foto dudosa.
bool subirFoto(const Captura& captura, const std::string& eventId);

}  // namespace vision
