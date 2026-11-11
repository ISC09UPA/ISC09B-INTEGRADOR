#pragma once

// Procesamiento de lecturas: nivel de tolva, filtros, alarma de tolva baja y lector RFID.

#include <stddef.h>
#include <stdint.h>

namespace logica {

// Distancia del sensor ultrasónico a la comida -> % de llenado (0..100).
// NAN si la distancia no es válida o la calibración está al revés.
double porcentajeTolva(double distanciaCm, double distanciaVaciaCm, double distanciaLlenaCm);

// Mediana de las lecturas válidas (ignora NAN); NAN si no hay ninguna. Reordena `valores`.
double mediana(double* valores, size_t n);

// Tiempo de vuelo del eco (µs) a cm; NAN si no hubo eco (0) o está fuera del rango del sensor.
double distanciaDesdeEcoUs(uint32_t ecoUs);

// HOPPER_LOW con histéresis: avisa una vez al bajar del umbral y se rearma al rellenar.
class AlarmaNivel {
 public:
  AlarmaNivel(double umbralBajo, double umbralRearme)
      : umbralBajo_(umbralBajo), umbralRearme_(umbralRearme) {}
  // true solo en la lectura que cruza hacia abajo. NAN no cambia nada.
  bool actualizar(double porcentaje);
  bool baja() const { return baja_; }

 private:
  double umbralBajo_;
  double umbralRearme_;
  bool baja_ = false;
};

// Diferencia que amerita publicar status antes de los 60 s.
bool cambioRelevante(double anterior, double actual, double umbral);

// Lector RFID RDM6300 (125 kHz, UART 9600). Trama: 0x02, 10 caracteres hex de datos,
// 2 de checksum (XOR de los 5 bytes) y 0x03.
class LectorRdm6300 {
 public:
  // Devuelve true cuando completa una trama válida; la etiqueta queda en etiqueta().
  bool alimentar(uint8_t byte);
  const char* etiqueta() const { return etiqueta_; }

 private:
  char buffer_[12] = {};
  size_t largo_ = 0;
  bool dentro_ = false;
  char etiqueta_[11] = {};
};

}  // namespace logica
