#pragma once

#include <ctype.h>
#include <errno.h>
#include <limits.h>
#include <stdlib.h>
#include <strings.h>

// Maximo de gramos permitidos por porcion.
const long MAX_GRAMOS_POR_PORCION = 200;

enum ResultadoComando {
  COMANDO_OK,
  COMANDO_DESCONOCIDO,
  CANTIDAD_INVALIDA,
  CANTIDAD_FUERA_DE_RANGO
};

// Interpreta una linea como "DISPENSAR 50". Solo escribe en gramos si es valida.
inline ResultadoComando interpretarComando(const char* linea, int& gramos) {
  while (isspace((unsigned char)*linea)) linea++;

  const char PALABRA[] = "DISPENSAR";
  const size_t LARGO = sizeof(PALABRA) - 1;

  if (strncasecmp(linea, PALABRA, LARGO) != 0) return COMANDO_DESCONOCIDO;
  linea += LARGO;

  // Rechaza comandos pegados, por ejemplo "DISPENSAR50" o "DISPENSARTODO".
  if (*linea != '\0' && !isspace((unsigned char)*linea)) return COMANDO_DESCONOCIDO;

  while (isspace((unsigned char)*linea)) linea++;
  if (*linea == '\0') return CANTIDAD_INVALIDA;

  char* fin;
  errno = 0;
  long valor = strtol(linea, &fin, 10);
  if (fin == linea) return CANTIDAD_INVALIDA;

  // Rechaza texto despues del numero, por ejemplo "50abc" o "50 60".
  while (isspace((unsigned char)*fin)) fin++;
  if (*fin != '\0') return CANTIDAD_INVALIDA;

  if (errno == ERANGE || valor <= 0 || valor > MAX_GRAMOS_POR_PORCION) {
    return CANTIDAD_FUERA_DE_RANGO;
  }

  gramos = (int)valor;
  return COMANDO_OK;
}
