#pragma once

// Archivos en LittleFS. Las escrituras son atómicas: se escribe un .tmp y se renombra, así un
// corte de luz deja el archivo anterior o el nuevo, nunca uno a medias.

#include <stddef.h>

#include <string>

namespace almacenamiento {

constexpr const char* RUTA_CONFIG = "/config.json";        // último feeder/{id}/config válido
constexpr const char* RUTA_COMIDAS = "/comidas.json";      // última comida de cada mascota
constexpr const char* RUTA_CALIBRACION = "/calibracion.json";
constexpr const char* RUTA_COLA = "/cola.txt";             // mensajes sin PUBACK
constexpr const char* RUTA_OTA_PENDIENTE = "/ota_pendiente.json";

// Monta LittleFS; si no se puede (primera vez o corrupto) lo formatea.
bool iniciar();

bool leer(const char* ruta, std::string& contenido);
bool escribirAtomico(const char* ruta, const std::string& contenido);
bool existe(const char* ruta);
bool borrar(const char* ruta);
bool renombrar(const char* origen, const char* destino);
size_t bytesLibres();

}  // namespace almacenamiento
