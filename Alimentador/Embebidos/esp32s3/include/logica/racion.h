#pragma once

// Cálculo de raciones, calibración y control del dispensado con la báscula del plato.

#include <stdint.h>

namespace logica {

// Gramos a dispensar para dejar `objetivoG` en el plato.
// Con `rellenar` se descuenta lo que ya hay; si el resultado es menor que `minimoG` no se
// dispensa (0). Nunca supera `maximoG`. Un plato con lectura inválida (NAN) cuenta como vacío.
double calcularRacion(double objetivoG, double platoActualG, bool rellenar, double minimoG,
                      double maximoG);

// Flujo en g/s medido al girar `segundos`; 0 si los datos no sirven.
double calibrarFlujo(double gramosMedidos, double segundos);

// Factor de la báscula (cuentas por gramo) a partir de una pesa patrón; 0 si no sirve.
double calibrarEscala(double lecturaPromedio, double tara, double gramosPatron);

// Tiempo estimado en ms para dispensar `gramos` con un flujo dado.
uint32_t msParaGramos(double gramos, double gramosPorSegundo);

struct ParametrosDispensado {
  double gramosPorSegundo = 8.0;
  double anticipacionG = 2.0;       // se apaga antes porque sigue cayendo comida
  uint32_t asentarMs = 1500;        // espera para que el peso se estabilice al final
  uint32_t ventanaAtascoMs = 4000;  // si el peso no sube `subidaMinimaG` en esta ventana: atasco
  double subidaMinimaG = 1.0;
  double factorTiempoMax = 2.5;     // tiempo máximo = estimado * factor + 5 s
};

// Máquina de estados de un dispensado. No toca hardware: el llamador enciende o apaga el
// motor según motorEncendido() y le pasa el peso del plato en cada paso.
class ControlDispensado {
 public:
  enum class Estado { Inactivo, Girando, Asentando, Terminado, Atasco, TiempoAgotado };

  void iniciar(double objetivoG, double pesoInicialG, uint32_t ahoraMs,
               const ParametrosDispensado& parametros);
  Estado paso(uint32_t ahoraMs, double pesoG);
  // Tras un desatasco se vuelve a girar sin perder lo ya dispensado.
  void reanudar(uint32_t ahoraMs, double pesoG);
  void cancelar();

  Estado estado() const { return estado_; }
  bool activo() const { return estado_ == Estado::Girando || estado_ == Estado::Asentando; }
  bool motorEncendido() const { return estado_ == Estado::Girando; }
  double dispensadoG() const;
  double objetivoG() const { return objetivoG_; }
  // Terminado o tiempo agotado con al menos el 80 % del objetivo.
  bool exitoso() const;

 private:
  Estado estado_ = Estado::Inactivo;
  ParametrosDispensado p_;
  double objetivoG_ = 0;
  double pesoInicialG_ = 0;
  double ultimoPesoG_ = 0;
  double pesoReferenciaG_ = 0;
  uint32_t inicioMs_ = 0;
  uint32_t referenciaMs_ = 0;
  uint32_t asentarDesdeMs_ = 0;
  uint32_t tiempoMaxMs_ = 0;
};

}  // namespace logica
