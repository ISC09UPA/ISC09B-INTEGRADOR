// Alimentador Inteligente: control de porciones por Serial.
// Comando: DISPENSAR <gramos>, por ejemplo DISPENSAR 50
//
// Por ahora el LED integrado simula la compuerta. Para usar el motor o servo,
// cambia solo abrirCompuerta() y cerrarCompuerta().

#include "comando.h"

const int PIN_ACTUADOR = 2;  // LED integrado del ESP32 DevKit v1
const float GRAMOS_POR_SEGUNDO = 10.0;  // Valor de prueba: calibrar con el dispensador real
const size_t TAM_LINEA = 32;

char linea[TAM_LINEA];
size_t largoLinea = 0;
bool lineaDemasiadoLarga = false;

bool dispensando = false;
unsigned long inicioDispensado = 0;
unsigned long duracionDispensado = 0;

void abrirCompuerta() {
  digitalWrite(PIN_ACTUADOR, HIGH);
}

void cerrarCompuerta() {
  digitalWrite(PIN_ACTUADOR, LOW);
}

void dispensar(int gramos) {
  duracionDispensado = (unsigned long)(gramos / GRAMOS_POR_SEGUNDO * 1000.0);
  inicioDispensado = millis();
  dispensando = true;

  Serial.printf("Dispensando %d g...\n", gramos);
  abrirCompuerta();
}

void actualizarDispensado() {
  if (!dispensando) return;

  // La resta con unsigned sigue funcionando cuando millis() se desborda.
  if (millis() - inicioDispensado >= duracionDispensado) {
    cerrarCompuerta();
    dispensando = false;
    Serial.println("Listo");
  }
}

void procesarLinea(const char* texto) {
  if (dispensando) {
    Serial.println("ERROR: ya se esta dispensando");
    return;
  }

  int gramos = 0;
  switch (interpretarComando(texto, gramos)) {
    case COMANDO_OK:
      dispensar(gramos);
      break;
    case COMANDO_DESCONOCIDO:
      Serial.println("ERROR: comando desconocido. Usa DISPENSAR <gramos>");
      break;
    case CANTIDAD_INVALIDA:
      Serial.println("ERROR: la cantidad debe ser un numero entero");
      break;
    case CANTIDAD_FUERA_DE_RANGO:
      Serial.printf("ERROR: la cantidad debe estar entre 1 y %ld g\n", MAX_GRAMOS_POR_PORCION);
      break;
  }
}

void leerSerial() {
  while (Serial.available() > 0) {
    char caracter = (char)Serial.read();

    if (caracter == '\r') continue;

    if (caracter == '\n') {
      linea[largoLinea] = '\0';

      if (lineaDemasiadoLarga) {
        Serial.println("ERROR: comando demasiado largo");
      } else if (largoLinea > 0) {
        procesarLinea(linea);
      }

      largoLinea = 0;
      lineaDemasiadoLarga = false;
    } else if (largoLinea < TAM_LINEA - 1) {
      linea[largoLinea++] = caracter;
    } else {
      lineaDemasiadoLarga = true;
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_ACTUADOR, OUTPUT);
  cerrarCompuerta();
  Serial.println("Alimentador listo. Usa DISPENSAR <gramos>");
}

void loop() {
  leerSerial();
  actualizarDispensado();
}
