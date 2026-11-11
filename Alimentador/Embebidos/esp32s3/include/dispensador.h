#pragma once

// Dispensadores: un servo de rotación continua por tolva que gira un tornillo sinfín.
// El dispensado se controla con la báscula del plato de esa tolva: se detiene al llegar a la
// ración y, si el peso no sube, intenta desatascar girando en reversa y avisa JAM.

#include <functional>
#include <string>

namespace dispensador {

struct Resultado {
  int tolva = 0;
  double objetivoG = 0;
  double dispensadoG = 0;
  bool ok = false;
  bool atasco = false;
  std::string error;
};

using AlTerminar = std::function<void(const Resultado&)>;

void iniciar();
void atender();
bool ocupado();

// Arranca un dispensado sin bloquear; `alTerminar` se llama desde atender().
bool dispensar(int tolva, double gramos, AlTerminar alTerminar);
void detenerTodo();

// Gira la tolva `segundos` y mide cuánto cayó al plato para calcular g/s (bloquea).
bool calibrarFlujo(int tolva, double segundos, double& gramosPorSegundo);

}  // namespace dispensador
