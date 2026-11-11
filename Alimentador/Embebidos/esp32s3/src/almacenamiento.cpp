#include "almacenamiento.h"

#include <Arduino.h>
#include <LittleFS.h>

namespace almacenamiento {

bool iniciar() {
  if (LittleFS.begin(false)) return true;
  log_w("LittleFS no monta, se formatea");
  return LittleFS.begin(true);
}

bool leer(const char* ruta, std::string& contenido) {
  File f = LittleFS.open(ruta, "r");
  if (!f) return false;
  contenido.clear();
  contenido.reserve(f.size());
  char buffer[256];
  while (f.available()) {
    size_t n = f.read(reinterpret_cast<uint8_t*>(buffer), sizeof(buffer));
    if (n == 0) break;
    contenido.append(buffer, n);
  }
  f.close();
  return true;
}

bool escribirAtomico(const char* ruta, const std::string& contenido) {
  std::string temporal = std::string(ruta) + ".tmp";
  File f = LittleFS.open(temporal.c_str(), "w");
  if (!f) return false;
  size_t escritos = f.write(reinterpret_cast<const uint8_t*>(contenido.data()), contenido.size());
  f.close();
  if (escritos != contenido.size()) {
    LittleFS.remove(temporal.c_str());
    return false;
  }
  LittleFS.remove(ruta);
  return LittleFS.rename(temporal.c_str(), ruta);
}

bool existe(const char* ruta) { return LittleFS.exists(ruta); }

bool borrar(const char* ruta) { return !LittleFS.exists(ruta) || LittleFS.remove(ruta); }

bool renombrar(const char* origen, const char* destino) {
  LittleFS.remove(destino);
  return LittleFS.rename(origen, destino);
}

size_t bytesLibres() { return LittleFS.totalBytes() - LittleFS.usedBytes(); }

}  // namespace almacenamiento
