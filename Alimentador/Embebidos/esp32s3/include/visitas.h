#pragma once

// Ciclo de una visita al plato:
//   1. Presencia (PIR, RFID nuevo o cambio de peso en un plato) inicia la visita y guarda el peso
//      de los platos de antes.
//   2. Se toman FOTOS_POR_VISITA fotos y se clasifican; si la confianza es baja se sube la foto a
//      la Pi. Con la clase (y el RFID si hay) se identifica a la mascota.
//   3. Si a esa mascota le toca comer (horario + intervalo mínimo) se dispensa su ración en su
//      plato, descontando lo que ya hay.
//   4. Cuando deja de haber presencia se pesa otra vez y se publica feeder/{id}/visit.

namespace visitas {

void iniciar();
void atender();
bool enCurso();

}  // namespace visitas
