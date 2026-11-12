#include "consola_serie.h"

#include <Arduino.h>

#include "basculas.h"
#include "calibracion.h"
#include "config.h"
#include "configuracion.h"
#include "credenciales.h"
#include "dispensador.h"
#include "enlace_mqtt.h"
#include "logica/consola.h"
#include "nivel_tolva.h"
#include "ota.h"
#include "red_wifi.h"
#include "reloj.h"
#include "rfid.h"
#include "vision.h"

namespace consola {

namespace {

constexpr size_t TAM_LINEA = 64;
char linea[TAM_LINEA];
size_t largo = 0;
bool demasiadoLarga = false;

// Imprime `datos` en base64, en renglones de 76 caracteres.
void imprimirBase64(const uint8_t* datos, size_t largo) {
  static const char tabla[] =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  char renglon[80];
  size_t n = 0;
  for (size_t i = 0; i < largo; i += 3) {
    uint32_t v = static_cast<uint32_t>(datos[i]) << 16;
    if (i + 1 < largo) v |= static_cast<uint32_t>(datos[i + 1]) << 8;
    if (i + 2 < largo) v |= datos[i + 2];
    renglon[n++] = tabla[(v >> 18) & 63];
    renglon[n++] = tabla[(v >> 12) & 63];
    renglon[n++] = i + 1 < largo ? tabla[(v >> 6) & 63] : '=';
    renglon[n++] = i + 2 < largo ? tabla[v & 63] : '=';
    if (n >= 76) {
      renglon[n] = '\0';
      Serial.println(renglon);
      n = 0;
    }
  }
  if (n > 0) {
    renglon[n] = '\0';
    Serial.println(renglon);
  }
}

void ayuda() {
  Serial.println(
      "Comandos:\n"
      "  ESTADO                         sensores, red y versiones\n"
      "  DISPENSAR <tolva> <gramos>     tolva 1 = perro, 2 = gato\n"
      "  TARA <plato>                   con el plato vacio\n"
      "  CALIBRAR_BASCULA <plato> <g>   con una pesa conocida sobre el plato ya tarado\n"
      "  CALIBRAR_FLUJO <tolva> <s>     gira la tolva s segundos y mide g/s\n"
      "  NIVEL_VACIO <tolva>            guarda la distancia actual como tolva vacia\n"
      "  NIVEL_LLENO <tolva>            guarda la distancia actual como tolva llena\n"
      "  FOTO                           toma fotos y muestra la clase\n"
      "  VER_ENTRADA                    manda la imagen que ve el modelo (scripts/ver_entrada.py)\n"
      "  REINICIAR");
}

void estado() {
  const calibracion::Valores& cal = calibracion::actual();
  const logica::ConfigAlimentador& cfg = configuracion::actual();
  Serial.printf("Alimentador %s, firmware %s%s, modelo %s\n", FEEDER_ID, FIRMWARE_VERSION,
                ota::enPrueba() ? " (en prueba)" : "",
                vision::modeloCargado() ? vision::versionModelo().c_str() : "(sin modelo)");
  Serial.printf("WiFi %s, MQTT %s, %u mensajes en cola, hora %s\n",
                red::conectada() ? "ok" : "no", mqtt::conectado() ? "ok" : "no",
                (unsigned)mqtt::pendientes(), reloj::valido() ? "ok" : "sin sincronizar");
  Serial.printf("Config v%d: %u mascotas, %u horarios\n", cfg.version,
                (unsigned)cfg.mascotas.size(), (unsigned)cfg.horarios.size());
  for (int i = 1; i <= 2; i++) {
    Serial.printf("Tolva %d: %.1f%% (%.1f cm, vacia %.1f, llena %.1f), flujo %.2f g/s\n", i,
                  nivel::porcentaje(i), nivel::distancia(i), cal.distanciaVacia[i - 1],
                  cal.distanciaLlena[i - 1], cal.flujo[i - 1]);
    Serial.printf("Plato %d: %.1f g (escala %.2f, tara %ld)\n", i, basculas::gramos(i),
                  cal.escala[i - 1], (long)cal.tara[i - 1]);
  }
  for (const logica::Mascota& m : cfg.mascotas) {
    Serial.printf("Mascota %d %s: tolva %d, %.0f g, le toca: %s\n", m.id, m.nombre.c_str(),
                  m.tolva, m.gramosPorComida,
                  configuracion::tieneComidaDisponible(m.id) ? "si" : "no");
  }
  std::string etiqueta = rfid::ultima(60000);
  if (!etiqueta.empty()) Serial.printf("Ultimo RFID: %s\n", etiqueta.c_str());
}

void ejecutar(const char* texto) {
  logica::LineaConsola l;
  logica::ErrorConsola err = logica::interpretarLinea(texto, l);
  if (err != logica::ErrorConsola::Ok) {
    Serial.printf("ERROR: %s\n", logica::textoErrorConsola(err));
    return;
  }

  switch (l.orden) {
    case logica::OrdenConsola::Ayuda:
      ayuda();
      break;
    case logica::OrdenConsola::Estado:
      estado();
      break;
    case logica::OrdenConsola::Reiniciar:
      Serial.println("Reiniciando...");
      delay(100);
      ESP.restart();
      break;
    case logica::OrdenConsola::Foto: {
      vision::Captura c;
      if (vision::reconocer(FOTOS_POR_VISITA, c)) {
        Serial.printf("%s con confianza %.2f (foto de %u bytes)\n",
                      logica::nombreClase(c.resultado.clase), c.resultado.confianza,
                      (unsigned)c.jpeg.size());
      } else {
        Serial.printf("Sin clasificacion (foto de %u bytes)\n", (unsigned)c.jpeg.size());
      }
      break;
    }
    case logica::OrdenConsola::VerEntrada: {
      float probabilidades[logica::NUM_CLASES];
      const uint8_t* rgb = nullptr;
      int ancho = 0, alto = 0;
      if (!vision::depurarEntrada(probabilidades, rgb, ancho, alto)) {
        Serial.println("ERROR: sin camara o sin modelo");
        break;
      }
      Serial.print("Probabilidades:");
      for (size_t i = 0; i < logica::NUM_CLASES; i++) {
        Serial.printf(" %s %.3f", logica::nombreClase(static_cast<logica::Clase>(i)),
                      probabilidades[i]);
      }
      Serial.println();
      Serial.printf("IMG_INICIO %d %d\n", ancho, alto);
      imprimirBase64(rgb, static_cast<size_t>(ancho) * alto * 3);
      Serial.println("IMG_FIN");
      break;
    }
    case logica::OrdenConsola::Dispensar: {
      bool aceptado = dispensador::dispensar(l.numero, l.valor, [](const dispensador::Resultado& r) {
        Serial.printf("Dispensado tolva %d: %.1f de %.1f g %s %s\n", r.tolva, r.dispensadoG,
                      r.objetivoG, r.ok ? "OK" : "ERROR", r.error.c_str());
      });
      if (!aceptado) Serial.println("ERROR: el dispensador esta ocupado");
      break;
    }
    case logica::OrdenConsola::Tara:
      Serial.println(basculas::tarar(l.numero) ? "Tara guardada" : "ERROR: el HX711 no responde");
      break;
    case logica::OrdenConsola::CalibrarBascula: {
      float factor = 0;
      if (basculas::calibrar(l.numero, static_cast<float>(l.valor), factor)) {
        Serial.printf("Escala del plato %d: %.3f cuentas/g\n", l.numero, factor);
      } else {
        Serial.println("ERROR: la lectura no cambio; revisa la pesa y la tara");
      }
      break;
    }
    case logica::OrdenConsola::CalibrarFlujo: {
      double flujo = 0;
      Serial.printf("Girando la tolva %d por %.1f s...\n", l.numero, l.valor);
      if (dispensador::calibrarFlujo(l.numero, l.valor, flujo)) {
        Serial.printf("Flujo de la tolva %d: %.2f g/s\n", l.numero, flujo);
      } else {
        Serial.println("ERROR: no cayo comida al plato o la bascula no responde");
      }
      break;
    }
    case logica::OrdenConsola::NivelVacio:
      Serial.println(nivel::calibrarVacia(l.numero) ? "Distancia de tolva vacia guardada"
                                                    : "ERROR: el sensor no responde");
      break;
    case logica::OrdenConsola::NivelLleno:
      Serial.println(nivel::calibrarLlena(l.numero) ? "Distancia de tolva llena guardada"
                                                    : "ERROR: el sensor no responde");
      break;
  }
}

}  // namespace

void atender() {
  while (Serial.available() > 0) {
    char c = static_cast<char>(Serial.read());
    if (c == '\r') continue;
    if (c == '\n') {
      linea[largo] = '\0';
      if (demasiadoLarga) {
        Serial.println("ERROR: comando demasiado largo");
      } else if (largo > 0) {
        ejecutar(linea);
      }
      largo = 0;
      demasiadoLarga = false;
    } else if (largo < TAM_LINEA - 1) {
      linea[largo++] = c;
    } else {
      demasiadoLarga = true;
    }
  }
}

}  // namespace consola
