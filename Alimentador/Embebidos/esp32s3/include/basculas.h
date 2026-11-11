#pragma once

// Básculas HX711 de los platos (1 = perro, 2 = gato). Las lecturas se toman sin bloquear
// cuando el HX711 tiene dato listo (10 Hz) y se suavizan con un promedio móvil.

#include <stdint.h>

namespace basculas {

void iniciar();
void atender();

// Gramos en el plato; NAN si no hay lectura reciente.
float gramos(int plato);
// Lectura cruda promediada (bloquea ~n/10 s). NAN si el HX711 no responde.
double lecturaCruda(int plato, uint8_t muestras);

// Toma la lectura actual como cero y la guarda en la calibración.
bool tarar(int plato);
// Con una pesa patrón sobre el plato ya tarado, calcula y guarda el factor de escala.
bool calibrar(int plato, float gramosPatron, float& factor);

}  // namespace basculas
