#pragma once

// Comandos por el monitor serie para probar y calibrar sin la Raspberry Pi.
// Basado en el comando DISPENSAR del primer prototipo, ahora con tolva:
//
//   AYUDA | ESTADO | FOTO | REINICIAR
//   DISPENSAR <tolva 1|2> <gramos>
//   TARA <plato 1|2>
//   CALIBRAR_BASCULA <plato 1|2> <gramos de la pesa patrón>
//   CALIBRAR_FLUJO <tolva 1|2> <segundos>
//   NIVEL_VACIO <tolva 1|2> | NIVEL_LLENO <tolva 1|2>

namespace logica {

enum class OrdenConsola {
  Ayuda,
  Estado,
  Foto,
  Reiniciar,
  Dispensar,
  Tara,
  CalibrarBascula,
  CalibrarFlujo,
  NivelVacio,
  NivelLleno,
};

struct LineaConsola {
  OrdenConsola orden = OrdenConsola::Ayuda;
  int numero = 0;    // tolva o plato
  double valor = 0;  // gramos o segundos
};

enum class ErrorConsola { Ok, Vacia, Desconocida, FaltaArgumento, ArgumentoInvalido, FueraDeRango, Sobrante };

constexpr double CONSOLA_MAX_GRAMOS = 400;
constexpr double CONSOLA_MAX_PATRON_G = 5000;
constexpr double CONSOLA_MAX_SEGUNDOS = 30;

ErrorConsola interpretarLinea(const char* linea, LineaConsola& salida);
const char* textoErrorConsola(ErrorConsola error);

}  // namespace logica
