#include "logica/racion.h"

#include <math.h>

namespace logica {

double calcularRacion(double objetivoG, double platoActualG, bool rellenar, double minimoG,
                      double maximoG) {
  if (!(objetivoG > 0)) return 0;
  double gramos = objetivoG;
  if (rellenar && !isnan(platoActualG) && platoActualG > 0) gramos -= platoActualG;
  if (gramos > maximoG) gramos = maximoG;
  if (gramos < minimoG) return 0;
  return gramos;
}

double calibrarFlujo(double gramosMedidos, double segundos) {
  if (!(segundos > 0) || !(gramosMedidos > 0)) return 0;
  return gramosMedidos / segundos;
}

double calibrarEscala(double lecturaPromedio, double tara, double gramosPatron) {
  if (!(gramosPatron > 0)) return 0;
  double factor = (lecturaPromedio - tara) / gramosPatron;
  // Un factor casi cero significa que la celda no respondió a la pesa.
  if (fabs(factor) < 1e-3 || isnan(factor)) return 0;
  return factor;
}

uint32_t msParaGramos(double gramos, double gramosPorSegundo) {
  if (!(gramos > 0) || !(gramosPorSegundo > 0)) return 0;
  return static_cast<uint32_t>(gramos / gramosPorSegundo * 1000.0 + 0.5);
}

void ControlDispensado::iniciar(double objetivoG, double pesoInicialG, uint32_t ahoraMs,
                                const ParametrosDispensado& parametros) {
  p_ = parametros;
  objetivoG_ = objetivoG;
  pesoInicialG_ = isnan(pesoInicialG) ? 0 : pesoInicialG;
  ultimoPesoG_ = pesoInicialG_;
  pesoReferenciaG_ = pesoInicialG_;
  inicioMs_ = ahoraMs;
  referenciaMs_ = ahoraMs;
  tiempoMaxMs_ =
      static_cast<uint32_t>(msParaGramos(objetivoG, p_.gramosPorSegundo) * p_.factorTiempoMax) +
      5000;
  estado_ = objetivoG > 0 ? Estado::Girando : Estado::Terminado;
}

ControlDispensado::Estado ControlDispensado::paso(uint32_t ahoraMs, double pesoG) {
  if (!isnan(pesoG)) ultimoPesoG_ = pesoG;

  switch (estado_) {
    case Estado::Girando: {
      if (ultimoPesoG_ - pesoInicialG_ >= objetivoG_ - p_.anticipacionG) {
        estado_ = Estado::Asentando;
        asentarDesdeMs_ = ahoraMs;
        break;
      }
      if (ahoraMs - inicioMs_ >= tiempoMaxMs_) {
        estado_ = Estado::TiempoAgotado;
        break;
      }
      if (ahoraMs - referenciaMs_ >= p_.ventanaAtascoMs) {
        if (ultimoPesoG_ - pesoReferenciaG_ < p_.subidaMinimaG) {
          estado_ = Estado::Atasco;
        } else {
          pesoReferenciaG_ = ultimoPesoG_;
          referenciaMs_ = ahoraMs;
        }
      }
      break;
    }
    case Estado::Asentando:
      if (ahoraMs - asentarDesdeMs_ >= p_.asentarMs) estado_ = Estado::Terminado;
      break;
    default:
      break;
  }
  return estado_;
}

void ControlDispensado::reanudar(uint32_t ahoraMs, double pesoG) {
  if (estado_ != Estado::Atasco) return;
  if (!isnan(pesoG)) ultimoPesoG_ = pesoG;
  pesoReferenciaG_ = ultimoPesoG_;
  referenciaMs_ = ahoraMs;
  estado_ = Estado::Girando;
}

void ControlDispensado::cancelar() {
  if (activo()) estado_ = Estado::TiempoAgotado;
}

double ControlDispensado::dispensadoG() const {
  double d = ultimoPesoG_ - pesoInicialG_;
  return d > 0 ? d : 0;
}

bool ControlDispensado::exitoso() const {
  if (estado_ == Estado::Terminado) return true;
  if (estado_ == Estado::TiempoAgotado) return dispensadoG() >= objetivoG_ * 0.8;
  return false;
}

}  // namespace logica
