#include "logica/consola.h"

#include <ctype.h>
#include <errno.h>
#include <math.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>

namespace logica {

namespace {

struct DefinicionOrden {
  const char* palabra;
  OrdenConsola orden;
  int argumentos;  // 0, 1 (número) o 2 (número y valor)
  double maximo;   // del valor
};

const DefinicionOrden ORDENES[] = {
    {"AYUDA", OrdenConsola::Ayuda, 0, 0},
    {"ESTADO", OrdenConsola::Estado, 0, 0},
    {"FOTO", OrdenConsola::Foto, 0, 0},
    {"REINICIAR", OrdenConsola::Reiniciar, 0, 0},
    {"DISPENSAR", OrdenConsola::Dispensar, 2, CONSOLA_MAX_GRAMOS},
    {"TARA", OrdenConsola::Tara, 1, 0},
    {"CALIBRAR_BASCULA", OrdenConsola::CalibrarBascula, 2, CONSOLA_MAX_PATRON_G},
    {"CALIBRAR_FLUJO", OrdenConsola::CalibrarFlujo, 2, CONSOLA_MAX_SEGUNDOS},
    {"NIVEL_VACIO", OrdenConsola::NivelVacio, 1, 0},
    {"NIVEL_LLENO", OrdenConsola::NivelLleno, 1, 0},
};

const char* saltarEspacios(const char* p) {
  while (isspace(static_cast<unsigned char>(*p))) p++;
  return p;
}

// Lee la siguiente palabra en `destino`; devuelve el puntero después de ella.
const char* leerPalabra(const char* p, char* destino, size_t capacidad, bool& cabe) {
  p = saltarEspacios(p);
  size_t n = 0;
  cabe = true;
  while (*p && !isspace(static_cast<unsigned char>(*p))) {
    if (n + 1 < capacidad) {
      destino[n++] = *p;
    } else {
      cabe = false;
    }
    p++;
  }
  destino[n] = '\0';
  return p;
}

}  // namespace

ErrorConsola interpretarLinea(const char* linea, LineaConsola& salida) {
  if (!linea) return ErrorConsola::Vacia;
  char palabra[24];
  bool cabe;
  const char* p = leerPalabra(linea, palabra, sizeof(palabra), cabe);
  if (palabra[0] == '\0') return ErrorConsola::Vacia;
  if (!cabe) return ErrorConsola::Desconocida;

  const DefinicionOrden* def = nullptr;
  for (const DefinicionOrden& d : ORDENES) {
    if (strcasecmp(palabra, d.palabra) == 0) {
      def = &d;
      break;
    }
  }
  if (!def) return ErrorConsola::Desconocida;

  LineaConsola resultado;
  resultado.orden = def->orden;

  if (def->argumentos >= 1) {
    p = saltarEspacios(p);
    if (*p == '\0') return ErrorConsola::FaltaArgumento;
    char* fin;
    errno = 0;
    long numero = strtol(p, &fin, 10);
    if (fin == p || (*fin && !isspace(static_cast<unsigned char>(*fin)))) {
      return ErrorConsola::ArgumentoInvalido;
    }
    if (errno == ERANGE || (numero != 1 && numero != 2)) return ErrorConsola::FueraDeRango;
    resultado.numero = static_cast<int>(numero);
    p = fin;
  }

  if (def->argumentos >= 2) {
    p = saltarEspacios(p);
    if (*p == '\0') return ErrorConsola::FaltaArgumento;
    char* fin;
    errno = 0;
    double valor = strtod(p, &fin);
    if (fin == p || (*fin && !isspace(static_cast<unsigned char>(*fin)))) {
      return ErrorConsola::ArgumentoInvalido;
    }
    if (errno == ERANGE || isnan(valor) || !(valor > 0) || valor > def->maximo) {
      return ErrorConsola::FueraDeRango;
    }
    resultado.valor = valor;
    p = fin;
  }

  if (*saltarEspacios(p) != '\0') return ErrorConsola::Sobrante;
  salida = resultado;
  return ErrorConsola::Ok;
}

const char* textoErrorConsola(ErrorConsola error) {
  switch (error) {
    case ErrorConsola::Ok:
      return "ok";
    case ErrorConsola::Vacia:
      return "linea vacia";
    case ErrorConsola::Desconocida:
      return "comando desconocido, escribe AYUDA";
    case ErrorConsola::FaltaArgumento:
      return "falta un argumento";
    case ErrorConsola::ArgumentoInvalido:
      return "argumento invalido";
    case ErrorConsola::FueraDeRango:
      return "argumento fuera de rango";
    case ErrorConsola::Sobrante:
      return "sobra texto al final";
  }
  return "?";
}

}  // namespace logica
